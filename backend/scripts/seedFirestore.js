import dotenv from "dotenv";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { isFirebaseReady, db } from "../config/firebase.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedPath = path.join(__dirname, "..", "data", "database.json");

async function seed() {
  if (!isFirebaseReady || !db) {
    console.error("Firebase Admin is not configured. Set up .env first.");
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(seedPath, "utf8"));

  for (const [collectionName, records] of Object.entries(data)) {
    if (!Array.isArray(records)) continue;

    for (const record of records) {
      const { id, ...payload } = record;
      const docRef = id ? db.collection(collectionName).doc(id) : db.collection(collectionName).doc();
      await docRef.set({ ...payload, seededAt: new Date().toISOString() }, { merge: true });
      console.log(`Seeded ${collectionName}/${id || docRef.id}`);
    }
  }

  console.log("Firestore seed complete.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
