// controllers/invoiceController.js
import Invoice from "../models/Invoice.js";

export const createInvoice = async (req, res) => {
  try {
    const {
      patientName,
      patientGender = "",        // ← NEW
      patientAddress = "",       // ← NEW
      items,
      transactionId,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Items are required" });
    }

    // Process items — keep totalAmount if provided, else calculate
    const processedItems = items.map(item => {
      let totalAmount = Number(item.totalAmount || 0);

      // If no totalAmount (old data), calculate safely
      if (!totalAmount || totalAmount <= 0) {
        const unitsPerPack = item.packSize
          ? (item.packSize.toString().match(/\b(\d+)\b/)?.[1] || 1)
          : 1;
        const isUnits = (item.originalSellType || item.sellType || "packages") === "units";
        totalAmount = isUnits
          ? (item.salePrice / unitsPerPack) * item.quantitySold
          : item.salePrice * item.quantitySold;
      }

      return {
        medicine: item.medicine || null,
        name: item.name || "Unknown Medicine",
        category: item.category || "",
        manufacturer: item.manufacturer || "",
        strength: item.strength || "",
        packSize: item.packSize || "Standard",
        sellType: item.originalSellType || item.sellType || "packages",
        quantitySold: Number(item.quantitySold || 0),
        salePrice: Number(item.salePrice || 0),
        totalAmount: Number(totalAmount.toFixed(2)),
      };
    });

    const totalRevenue = processedItems.reduce((sum, i) => sum + i.totalAmount, 0);

    // Auto-generate invoice number (handled in model pre-save hook)
    const newInvoice = new Invoice({
      patientName: (patientName || "Walk-in Patient").trim(),
      patientGender: patientGender 
  ? patientGender.trim().charAt(0).toUpperCase() + patientGender.trim().slice(1).toLowerCase()
  : "",
      patientAddress: patientAddress.trim(),   // ← SAVE ADDRESS
      items: processedItems,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      transactionId: transactionId || null,
      soldBy: req.user?.username || "Staff",
      soldAt: new Date(),
    });

    await newInvoice.save();

    res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      data: newInvoice,
    });

  } catch (error) {
    console.error("CREATE INVOICE ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create invoice",
      error: error.message,
    });
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
      query.$or = [
        { patientName: { $regex: searchTerm, $options: "i" } },
        { invoiceNumber: { $regex: searchTerm, $options: "i" } },
        { "items.name": { $regex: searchTerm, $options: "i" } },
      ];
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
      .limit(limit)
      .lean(); // Faster, no hydration needed

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
      $or: [{ _id: id }, { invoiceNumber: id }],
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};