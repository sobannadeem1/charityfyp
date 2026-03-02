import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import router from "./routes/adminRoutes.js";
import cookieParser from "cookie-parser";
import medicineRouter from "./routes/medicineRoutes.js";
import invoiceRouter from "./routes/invoiceRoutes.js";
import donationRoutes from "./routes/donationRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ["https://charityfyp.vercel.app","http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// DB connection
connectDB();

// Routes
app.use("/admin", router);
app.use("/medicines", medicineRouter);
app.use("/invoices", invoiceRouter);
app.use("/donations", donationRoutes); 
app.use("/reports",reportRoutes ); 

app.get("/", (req, res) => {
  res.send("✅ API is running fine...");
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
