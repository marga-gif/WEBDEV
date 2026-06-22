import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import apiRoutes from "./routes/index.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicRoot = path.join(__dirname, "..");

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: [
    "https://webdev-eosin-five.vercel.app", // Your live Vercel frontend link
    "http://localhost:3000",                // For local development testing
    "http://127.0.0.1:5500"                 // Live Server fallback helper
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Static asset folders commented out since frontend is hosted on Vercel
// app.use(express.static(path.join(publicRoot, "html")));
// app.use("/css", express.static(path.join(publicRoot, "css")));
// app.use("/images", express.static(path.join(publicRoot, "images")));
// app.use("/admin", express.static(path.join(publicRoot, "admin")));

app.get("/api", (req, res) => {
  res.json({ message: "Welcome to the SenEtizen API!" });
});

// Updated root route to send a JSON status instead of a broken static redirect
app.get("/", (req, res) => {
  res.json({ status: "online", message: "SenEtizen Backend API Gateway is active." });
});

app.use("/api", apiRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// FORCE SERVER TO LISTEN: Essential for persistent cloud hosting providers like Render
app.listen(PORT, () => {
  console.log(`SenEtizen backend running on port ${PORT}`);
  console.log(`Firebase: ${process.env.FIREBASE_PROJECT_ID ? "configured" : "not configured (local JSON fallback)"}`);
});

// Retain export instance for local environment parity / serverless testing frameworks
export default app;