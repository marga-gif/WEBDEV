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
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(publicRoot, "html")));
app.use("/css", express.static(path.join(publicRoot, "css")));
app.use("/images", express.static(path.join(publicRoot, "images")));
app.use("/admin", express.static(path.join(publicRoot, "admin")));

app.get("/api", (req, res) => {
  res.json({ message: "Welcome to the SenEtizen API!" });
});

app.get("/", (req, res) => {
  res.redirect("/login.html");
});

app.use("/api", apiRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

app.listen(PORT, () => {
  console.log(`SenEtizen backend running on http://localhost:${PORT}`);
  console.log(`Firebase: ${process.env.FIREBASE_PROJECT_ID ? "configured" : "not configured (local JSON fallback)"}`);
});