const now = new Date();
console.log("JavaScript Date.now():", now);
console.log("ISO format:", now.toISOString());

const isoNow = now.toISOString();
const datePart = isoNow.split("T")[0];
const timePart = isoNow.split("T")[1].split(".")[0];
const humanTimestamp = `${datePart} ${timePart}`;

console.log("Date part:", datePart);
console.log("Time part:", timePart);
console.log("Human readable:", humanTimestamp);

// Also check if system time is different
const systemDate = new Date();
const year = systemDate.getFullYear();
const month = String(systemDate.getMonth() + 1).padStart(2, '0');
const day = String(systemDate.getDate()).padStart(2, '0');
const hours = String(systemDate.getHours()).padStart(2, '0');
const mins = String(systemDate.getMinutes()).padStart(2, '0');
const secs = String(systemDate.getSeconds()).padStart(2, '0');
const localTime = `${year}-${month}-${day} ${hours}:${mins}:${secs}`;

console.log("\nLocal time (not UTC):", localTime);
