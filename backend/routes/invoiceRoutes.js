// routes/invoiceRoutes.js
import express from "express";
import {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  deleteAllInvoices,
} from "../controllers/invoiceController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const invoiceRouter = express.Router();

// Protect all invoice routes (admin only)
invoiceRouter.use(authMiddleware);

invoiceRouter.post("/", createInvoice); // create invoice
invoiceRouter.get("/", getAllInvoices); // list
invoiceRouter.get("/:id", getInvoiceById); // get single
invoiceRouter.put("/:id", updateInvoice); // update
invoiceRouter.delete("/:id", deleteInvoice); // Delete one
invoiceRouter.delete("/", deleteAllInvoices);

export default invoiceRouter;
