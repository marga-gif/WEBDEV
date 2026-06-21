import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "data", "database.json");

async function readDatabase() {
  try {
    const content = await fs.readFile(dbPath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      const initialData = {
        appointments: [],
        contacts: [],
        doctors: [],
        events: [],
        announcements: [],
        about: []
      };
      await writeDatabase(initialData);
      return initialData;
    }
    throw error;
  }
}

async function writeDatabase(data) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), "utf8");
}

export async function getCollection(name) {
  const db = await readDatabase();
  return Array.isArray(db[name]) ? db[name] : [];
}

export async function addRecord(name, record) {
  const db = await readDatabase();
  if (!Array.isArray(db[name])) {
    db[name] = [];
  }
  db[name].push(record);
  await writeDatabase(db);
  return record;
}

export async function getRecordById(collectionName, id) {
  const items = await getCollection(collectionName);
  return items.find((item) => item.id === id) || null;
}

export async function updateRecord(collectionName, id, changes) {
  const db = await readDatabase();
  const collection = Array.isArray(db[collectionName]) ? db[collectionName] : [];
  const index = collection.findIndex((item) => item.id === id);
  if (index === -1) {
    return null;
  }
  db[collectionName][index] = { ...db[collectionName][index], ...changes };
  await writeDatabase(db);
  return db[collectionName][index];
}
