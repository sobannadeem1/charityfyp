// routes/invoiceRoutes.js
import express from "express";
import { createInvoice, deleteInvoice, getAllInvoices, getInvoiceById } from "../controllers/invoiceController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const invoiceRouter = express.Router();

// Protect all invoice routes (admin only)
invoiceRouter.use(authMiddleware);

invoiceRouter.post("/", createInvoice); 
invoiceRouter.get("/",getAllInvoices); 
invoiceRouter.get("/:id", getInvoiceById); 
invoiceRouter.delete("/:id", deleteInvoice); 


export default invoiceRouter;
