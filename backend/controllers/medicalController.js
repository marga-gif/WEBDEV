import {
  getCollection,
  addRecord,
  updateRecord,
  getRecordById,
  queryCollection,
} from "../services/firestoreService.js";
import { logAudit } from "../middleware/audit.js";

export async function getDoctors(req, res) {
  const doctors = await getCollection("doctors");
  res.json(doctors);
}

export async function getAppointments(req, res) {
  let appointments = await getCollection("appointments");

  if (req.user.role === "user") {
    appointments = appointments.filter(
      (item) => item.userId === req.user.uid || item.email === req.user.email
    );
  }

  res.json(appointments.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
}

export async function createAppointment(req, res) {
  const {
    fullName,
    contactInfo,
    email,
    medicalAttention,
    doctorName,
    date,
    time,
    phone,
    service,
    appointmentDate,
    name,
  } = req.body;

  const patientName = fullName || name;
  const contact = contactInfo || phone || "";
  const apptDate = date || appointmentDate;
  const apptTime = time || "";
  const purpose = medicalAttention || service || "General Consultation";

  if (!patientName || !apptDate) {
    return res.status(400).json({ error: "Patient name and appointment date are required." });
  }

  const appointment = await addRecord("appointments", {
    fullName: patientName,
    contactInfo: contact,
    email: email || req.user?.email || "",
    userId: req.user?.uid || null,
    medicalAttention: purpose,
    doctorName: doctorName || "Barangay-Provided Doctor",
    date: apptDate,
    time: apptTime,
    status: "Pending Review",
    category: "medical",
  });

  await logAudit(req, "MEDICAL_APPOINTMENT_CREATED", { appointmentId: appointment.id });
  res.status(201).json(appointment);
}

export async function updateAppointmentStatus(req, res) {
  const { id } = req.params;
  const { status, notes } = req.body;

  const allowed = ["Pending Review", "Confirmed", "Completed", "Cancelled"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid appointment status." });
  }

  const existing = await getRecordById("appointments", id);
  if (!existing) {
    return res.status(404).json({ error: "Appointment not found." });
  }

  const updated = await updateRecord("appointments", id, { status, adminNotes: notes || "" });
  await logAudit(req, "MEDICAL_APPOINTMENT_UPDATED", { appointmentId: id, status });
  res.json(updated);
}

export async function reportEmergency(req, res) {
  const { location, description, contactNumber } = req.body;

  if (!location || !contactNumber) {
    return res.status(400).json({ error: "Location and contact number are required." });
  }

  const report = await addRecord("emergencyReports", {
    location,
    description: description || "",
    contactNumber,
    userId: req.user?.uid || null,
    status: "Open",
    category: "medical",
  });

  await logAudit(req, "MEDICAL_EMERGENCY_REPORTED", { reportId: report.id });
  res.status(201).json(report);
}

export async function upsertDoctor(req, res) {
  const { name, specialty, clinic, phone, available } = req.body;

  if (!name || !specialty) {
    return res.status(400).json({ error: "Doctor name and specialty are required." });
  }

  const doctor = await addRecord("doctors", {
    name,
    specialty,
    clinic: clinic || "",
    phone: phone || "",
    available: available || "",
    status: "Active",
  });

  await logAudit(req, "DOCTOR_ADDED", { doctorId: doctor.id });
  res.status(201).json(doctor);
}
