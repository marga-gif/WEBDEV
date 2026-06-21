import dotenv from "dotenv";
dotenv.config();

import { db, isFirebaseReady } from "./config/firebase.js";

async function main() {
  console.log("isFirebaseReady:", isFirebaseReady);

  if (!isFirebaseReady || !db) {
    console.error(
      "Firestore is not initialized. Make sure you set FIREBASE_SERVICE_ACCOUNT_JSON in .env or set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON file."
    );
    process.exit(1);
  }

  try {
    const collection = "integration_test";
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    const humanTimestamp = `${year}-${month}-${day} ${hours}:${mins}:${secs}`;

    const payload = {
      message: "Test write from backend",
      createdAt: humanTimestamp,
    };

    // Write a document
    const ref = await db.collection(collection).add(payload);
    console.log("Wrote document id:", ref.id);

    // Read the document back
    const doc = await db.collection(collection).doc(ref.id).get();
    if (doc.exists) {
      console.log("Read back document:", { id: doc.id, ...doc.data() });
    } else {
      console.log("Document not found after write.");
    }

    console.log("Test complete — check Firestore in the Firebase Console for collection:", collection);
    process.exit(0);
  } catch (err) {
    console.error("Firestore test error:", err);
    process.exit(1);
  }
}

main();
