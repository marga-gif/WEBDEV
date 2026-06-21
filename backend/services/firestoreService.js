import { db, isFirebaseReady } from "../config/firebase.js";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "..", "data", "database.json");

async function readLocalDatabase() {
  try {
    const content = await fs.readFile(dbPath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      const initial = {};
      await fs.writeFile(dbPath, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    }
    throw error;
  }
}

async function writeLocalDatabase(data) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), "utf8");
}

function stripUndefined(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  );
}

export async function getCollection(name) {
  if (isFirebaseReady && db) {
    const snapshot = await db.collection(name).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  const local = await readLocalDatabase();
  return Array.isArray(local[name]) ? local[name] : [];
}

export async function getRecordById(collectionName, id) {
  if (isFirebaseReady && db) {
    const doc = await db.collection(collectionName).doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  const items = await getCollection(collectionName);
  return items.find((item) => item.id === id) || null;
}

export async function addRecord(collectionName, record) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');
  const humanTimestamp = `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
  const datePart = `${year}-${month}-${day}`;
  const timePart = `${hours}:${mins}:${secs}`;

  const payload = stripUndefined({
    ...record,
    createdAt: record.createdAt || humanTimestamp,
    createdDate: record.createdDate || datePart,
    createdTime: record.createdTime || timePart,
    updatedAt: humanTimestamp,
    updatedDate: datePart,
    updatedTime: timePart,
  });

  if (isFirebaseReady && db) {
    if (payload.id) {
      const { id, ...data } = payload;
      await db.collection(collectionName).doc(id).set(data);
      return { id, ...data };
    }
    const ref = await db.collection(collectionName).add(payload);
    return { id: ref.id, ...payload };
  }

  const local = await readLocalDatabase();
  if (!Array.isArray(local[collectionName])) {
    local[collectionName] = [];
  }
  const id = payload.id || `${collectionName}-${Date.now()}`;
  const saved = { ...payload, id };
  local[collectionName].push(saved);
  await writeLocalDatabase(local);
  return saved;
}

export async function updateRecord(collectionName, id, changes) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');
  const humanTimestamp = `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
  const datePart = `${year}-${month}-${day}`;
  const timePart = `${hours}:${mins}:${secs}`;

  const payload = stripUndefined({
    ...changes,
    updatedAt: humanTimestamp,
    updatedDate: datePart,
    updatedTime: timePart,
  });

  if (isFirebaseReady && db) {
    await db.collection(collectionName).doc(id).update(payload);
    return getRecordById(collectionName, id);
  }

  const local = await readLocalDatabase();
  const list = Array.isArray(local[collectionName]) ? local[collectionName] : [];
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) return null;
  list[index] = { ...list[index], ...payload };
  local[collectionName] = list;
  await writeLocalDatabase(local);
  return list[index];
}

export async function deleteRecord(collectionName, id) {
  if (isFirebaseReady && db) {
    await db.collection(collectionName).doc(id).delete();
    return true;
  }

  const local = await readLocalDatabase();
  const list = Array.isArray(local[collectionName]) ? local[collectionName] : [];
  local[collectionName] = list.filter((item) => item.id !== id);
  await writeLocalDatabase(local);
  return true;
}

export async function queryCollection(collectionName, filters = []) {
  const all = await getCollection(collectionName);
  return all.filter((item) =>
    filters.every(({ field, op, value }) => {
      if (op === "==") return item[field] === value;
      if (op === "includes") return String(item[field] || "").includes(value);
      return true;
    })
  );
}
