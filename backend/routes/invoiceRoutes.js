// routes/invoiceRoutes.js
import express from "express";
import { createInvoice, getAllInvoices, getInvoiceById } from "../controllers/invoiceController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const invoiceRouter = express.Router();

// Protect all invoice routes (admin only)
invoiceRouter.use(authMiddleware);

invoiceRouter.post("/", createInvoice); // create invoice
invoiceRouter.get("/",getAllInvoices); // list
invoiceRouter.get("/:id", getInvoiceById); // get single


export default invoiceRouter;
