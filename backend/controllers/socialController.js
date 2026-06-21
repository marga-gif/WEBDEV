import {
  getCollection,
  addRecord,
  updateRecord,
  getRecordById,
} from "../services/firestoreService.js";
import { logAudit } from "../middleware/audit.js";

export async function getEvents(req, res) {
  const events = await getCollection("events");
  res.json(events.sort((a, b) => (a.date || "").localeCompare(b.date || "")));
}

export async function getAnnouncements(req, res) {
  const announcements = await getCollection("announcements");
  res.json(
    announcements.sort((a, b) =>
      (b.publishedAt || b.createdAt || "").localeCompare(a.publishedAt || a.createdAt || "")
    )
  );
}

export async function createAnnouncement(req, res) {
  const { title, message, pushAsSms } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: "Title and message are required." });
  }

  const announcement = await addRecord("announcements", {
    title,
    message,
    pushAsSms: Boolean(pushAsSms),
    publishedBy: req.user?.email || req.user?.fullName || "admin",
    publishedAt: new Date().toISOString(),
    category: "announcement",
  });

  await logAudit(req, "ANNOUNCEMENT_CREATED", { title });
  res.status(201).json(announcement);
}

export async function createEvent(req, res) {
  const { title, date, time, location, description, capacity } = req.body;

  if (!title || !date) {
    return res.status(400).json({ error: "Event title and date are required." });
  }

  const event = await addRecord("events", {
    title,
    date,
    time: time || "",
    location: location || "",
    description: description || "",
    capacity: Number(capacity) || 0,
    status: "Scheduled",
    category: "social",
  });

  await logAudit(req, "SOCIAL_EVENT_CREATED", { eventId: event.id });
  res.status(201).json(event);
}

export async function updateEvent(req, res) {
  const { id } = req.params;
  const updated = await updateRecord("events", id, req.body);

  if (!updated) {
    return res.status(404).json({ error: "Event not found." });
  }

  await logAudit(req, "SOCIAL_EVENT_UPDATED", { eventId: id });
  res.json(updated);
}

export async function registerForEvent(req, res) {
  const { eventId } = req.body;

  if (!eventId) {
    return res.status(400).json({ error: "Event ID is required." });
  }

  const event = await getRecordById("events", eventId);
  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }

  const existing = (await getCollection("eventRegistrations")).find(
    (r) => r.eventId === eventId && r.userId === req.user.uid
  );

  if (existing) {
    return res.status(409).json({ error: "You are already registered for this event." });
  }

  const registration = await addRecord("eventRegistrations", {
    eventId,
    eventTitle: event.title,
    userId: req.user.uid,
    participantName: req.user.fullName,
    participantEmail: req.user.email,
    status: "Registered",
    category: "social",
  });

  await logAudit(req, "SOCIAL_EVENT_REGISTERED", { eventId, registrationId: registration.id });
  res.status(201).json(registration);
}

export async function getEventRegistrations(req, res) {
  let registrations = await getCollection("eventRegistrations");

  if (req.user.role === "user") {
    registrations = registrations.filter((item) => item.userId === req.user.uid);
  }

  res.json(registrations);
}

export async function submitContact(req, res) {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Name, email, and message are required." });
  }

  const contact = await addRecord("contacts", {
    name,
    email,
    message,
    userId: req.user?.uid || null,
  });

  res.status(201).json(contact);
}

export async function getAbout(req, res) {
  const about = await getCollection("about");
  res.json(about[0] || {});
}

export async function globalSearch(req, res) {
  const query = (req.query.q || "").toLowerCase().trim();
  if (!query) {
    return res.json({ doctors: [], events: [], announcements: [] });
  }

  const doctors = await getCollection("doctors");
  const events = await getCollection("events");
  const announcements = await getCollection("announcements");

  const doctorResults = doctors.filter((item) =>
    [item.name, item.specialty, item.clinic].some((v) =>
      String(v || "").toLowerCase().includes(query)
    )
  );

  const eventResults = events.filter((item) =>
    [item.title, item.description, item.location].some((v) =>
      String(v || "").toLowerCase().includes(query)
    )
  );

  const announcementResults = announcements.filter((item) =>
    [item.title, item.message].some((v) => String(v || "").toLowerCase().includes(query))
  );

  res.json({
    doctors: doctorResults,
    events: eventResults,
    announcements: announcementResults,
  });
}

export async function getDashboardStats(req, res) {
  const [users, appointments, documentRequests, eventRegistrations, auditLogs] =
    await Promise.all([
      getCollection("users"),
      getCollection("appointments"),
      getCollection("documentRequests"),
      getCollection("eventRegistrations"),
      getCollection("auditLogs"),
    ]);

  const citizens = users.filter((u) => u.role === "user");
  const pendingDocs = documentRequests.filter((d) =>
    ["Pending Review", "Processing"].includes(d.status)
  );

  res.json({
    metrics: {
      totalRegistered: citizens.length,
      pendingDocs: pendingDocs.length,
      eventRsvps: eventRegistrations.length,
      activeAlerts: appointments.filter((a) => a.status === "Pending Review").length,
    },
    recentActivity: auditLogs.slice(-10).reverse(),
    upcomingAppointments: appointments
      .filter((a) => a.status !== "Cancelled")
      .slice(0, 5),
  });
}

export async function getAuditLogs(req, res) {
  const logs = await getCollection("auditLogs");
  res.json(logs.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 100));
}

export async function getCitizens(req, res) {
  const users = await getCollection("users");
  const citizens = users
    .filter((u) => u.role === "user")
    .map(({ password, ...safe }) => safe);
  res.json(citizens);
}

export async function updateCitizenStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!["active", "disabled"].includes(status)) {
    return res.status(400).json({ error: "Status must be active or disabled." });
  }

  const updated = await updateRecord("users", id, { status });
  if (!updated) {
    return res.status(404).json({ error: "Citizen not found." });
  }

  await logAudit(req, "CITIZEN_STATUS_UPDATED", { citizenId: id, status });
  res.json(updated);
}
