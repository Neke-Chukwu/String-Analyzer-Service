// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import stringRoutes from "./routes/stringRoutes.js";
import { setupDb } from "./db.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// health check
app.get("/", (req, res) => res.status(200).send("String Analyzer API is live ✅"));

// routes
app.use("/", stringRoutes);

const PORT = process.env.PORT || 3000;

async function start() {
  await setupDb();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
