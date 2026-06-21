import dotenv from "dotenv";
dotenv.config();

import { addRecord, getRecordById } from "../services/firestoreService.js";

async function main() {
  const payload = { message: "Test write via addRecord" };
  const saved = await addRecord("integration_test_add", payload);
  console.log("Wrote:", saved);

  const read = await getRecordById("integration_test_add", saved.id);
  console.log("Read back:", read);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
