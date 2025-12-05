import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import router from "./routes/adminRoutes.js";
import cookieParser from "cookie-parser";
import medicineRouter from "./routes/medicineRoutes.js";
import invoiceRouter from "./routes/invoiceRoutes.js";
import Donation from "./routes/donationRoutes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.options("*", cors());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// DB connection
connectDB();

// Routes
app.use("/admin", router);
app.use("/medicines", medicineRouter);
app.use("/invoices", invoiceRouter);
app.use("/donations", Donation); 

app.get("/", (req, res) => {
  res.send("✅ API is running fine...");
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
