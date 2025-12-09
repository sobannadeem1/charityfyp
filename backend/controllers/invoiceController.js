import Invoice from "../models/Invoice.js"; // Jo model main ne diya
import { v4 as uuidv4 } from "uuid"; // Yeh install kar le agar nahi hai: npm i uuid

const generateInvoiceNumber = () => {
  const year = new Date().getFullYear();
  const shortId = uuidv4().slice(0, 4).toUpperCase(); // Short unique part
  return `INV-${year}-${shortId}`;
};



// controllers/invoiceController.js
export const createInvoice = async (req, res) => {
  try {
    const { patientName, items, transactionId } = req.body;

    if (!patientName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid data" });
    }

    // THIS IS THE ONLY CORRECT WAY — USE FRONTEND'S totalAmount IF AVAILABLE, ELSE CALCULATE
    const processedItems = items.map(item => {
      // If frontend already calculated correct total (new sales) → use it
      if (item.totalAmount && item.totalAmount > 0) {
        return {
          medicine: item.medicine || null,
          name: item.name,
          category: item.category || "",
          manufacturer: item.manufacturer || "",
          strength: item.strength || "",
          packSize: item.packSize || "Standard",
          sellType: item.originalSellType || item.sellType || "packages",
          quantitySold: Number(item.quantitySold),
          salePrice: Number(item.salePrice),
          totalAmount: Number(item.totalAmount),
        };
      }

      // Fallback for old sales — calculate safely
      const unitsPerPack = item.packSize 
        ? (item.packSize.toString().match(/\b(\d+)\b/)?.[1] || 1)
        : 1;
      const isUnits = (item.originalSellType || item.sellType) === "units";
      const itemTotal = isUnits
        ? (item.salePrice / unitsPerPack) * item.quantitySold
        : item.salePrice * item.quantitySold;

      return {
        medicine: item.medicine || null,
        name: item.name,
        category: item.category || "",
        manufacturer: item.manufacturer || "",
        strength: item.strength || "",
        packSize: item.packSize || "Standard",
        sellType: item.originalSellType || item.sellType || "packages",
        quantitySold: Number(item.quantitySold),
        salePrice: Number(item.salePrice),
        totalAmount: Number(itemTotal.toFixed(2)), // safe rounding
      };
    });

    const totalRevenue = processedItems.reduce((sum, i) => sum + i.totalAmount, 0);

    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const newInvoice = new Invoice({
      invoiceNumber,
      patientName: patientName.trim() || "Walk-in Patient",
      items: processedItems,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      soldBy: req.user ? (req.user.username || "Admin") : "Admin",
      transactionId: transactionId || null,
      soldAt: new Date(),
    });

    await newInvoice.save();

    res.status(201).json({ success: true, data: newInvoice });

  } catch (error) {
    console.error("CREATE INVOICE ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to save invoice" });
  }
};

export const getAllInvoices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const searchTerm = req.query.q?.trim() || "";
    const monthFilter = req.query.month || "";
    const sortBy = req.query.sort || "date-newest";

    let query = {};

    if (searchTerm) {
      query.patientName = { $regex: searchTerm, $options: "i" };
    }

    if (monthFilter && monthFilter !== "all") {
      const [year, month] = monthFilter.split("-");
      const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      query.soldAt = { $gte: startDate, $lt: endDate };
    }

    let sortOption = { soldAt: -1 };
    switch (sortBy) {
      case "date-oldest": sortOption = { soldAt: 1 }; break;
      case "revenue-high": sortOption = { totalRevenue: -1 }; break;
      case "revenue-low": sortOption = { totalRevenue: 1 }; break;
      default: sortOption = { soldAt: -1 };
    }

    const invoices = await Invoice.find(query)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit);
      // ← YE DO LINES HATA DI — AB KOI ERROR NAHI AAYEGA
      // .populate("items.medicine", "name category manufacturer strength packSize")
      // .populate("soldBy", "username");

    const totalInvoices = await Invoice.countDocuments(query);

    const revenueAgg = await Invoice.aggregate([
      { $match: query },
      { $group: { _id: null, totalRevenue: { $sum: "$totalRevenue" } } },
    ]);
    const summaryRevenue = revenueAgg[0]?.totalRevenue || 0;

    res.status(200).json({
      success: true,
      data: invoices,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalInvoices / limit),
        totalInvoices,
      },
      summary: { totalRevenue: summaryRevenue },
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ success: false, message: "Failed to fetch invoices" });
  }
};


export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findOne({
      $or: [
        { _id: id },
        { invoiceNumber: id }
      ]
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }

    res.status(200).json({
      success: true,
      data: invoice
    });

  } catch (error) {
    console.error("Error fetching invoice by ID:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};