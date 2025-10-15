import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import router from "./routes/adminRoutes.js";
import cookieParser from "cookie-parser";
import medicineRouter from "./routes/medicineRoutes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173", // your frontend URL
    credentials: true, // allow sending cookies
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// DB connection
connectDB();

// Routes
app.use("/api/admin", router);
app.use("/api/medicines", medicineRouter);

app.get("/", (req, res) => {
  res.send("✅ API is running fine...");
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
