import React, { useEffect, useState, useCallback } from "react";
import { getSoldMedicines } from "../api/medicineapi.js";
import "../styles/SoldMedicine.css";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function SoldMedicines() {
  const [soldRecords, setSoldRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [totalRevenue, setTotalRevenue] = useState(0);
  const navigate = useNavigate();

  // ✅ SAME LOGIC AS MEDICINE PAGE: Helper function to extract units from packSize
  const getUnitsPerPackage = (packSize) => {
    if (!packSize) return 1;

    const packSizeStr = packSize.toString().toLowerCase();
    const match = packSizeStr.match(/\b(\d+)\b/);

    return match ? parseInt(match[1]) : 1;
  };

  // ✅ SAME LOGIC AS MEDICINE PAGE: Calculate price per unit
  const getPricePerUnit = (salePrice, packSize) => {
    if (!salePrice) return 0;
    const unitsPerPackage = getUnitsPerPackage(packSize);

    if (unitsPerPackage <= 0) return salePrice;

    // Calculate exact unit price: package price ÷ units per package
    return salePrice / unitsPerPackage;
  };

  // ✅ CORRECTED: Calculate total amount based on sell type
  const calculateTotalAmount = useCallback((record) => {
    // Always use backend totalAmount if available and reasonable
    if (record.totalAmount && record.totalAmount > 0) {
      return Number(record.totalAmount);
    }

    const unitsPerPackage =
      record.unitsPerPackage || getUnitsPerPackage(record.packSize) || 1;
    const sellType = record.originalSellType || record.sellType;

    console.log("🔍 CALCULATION DEBUG:", {
      name: record.name,
      sellType,
      quantitySold: record.quantitySold,
      salePrice: record.salePrice,
      unitsPerPackage,
      unitPrice: getPricePerUnit(record.salePrice, record.packSize),
    });

    let calculatedTotal = 0;

    if (sellType === "packages") {
      // For packages: quantitySold represents total units, so convert to packages
      const packagesSold =
        record.originalQuantity || record.quantitySold / unitsPerPackage;
      calculatedTotal = packagesSold * record.salePrice;
    } else {
      // For units: use unit price × quantity
      const unitPrice = getPricePerUnit(record.salePrice, record.packSize);
      calculatedTotal = record.quantitySold * unitPrice;
    }

    return calculatedTotal;
  }, []);

  // ✅ CORRECTED: Get display unit price
  const getDisplayUnitPrice = useCallback((record) => {
    const sellType = record.originalSellType || record.sellType;

    if (sellType === "packages") {
      // For package sales, show package price
      return record.salePrice;
    } else {
      // For unit sales, show unit price
      return getPricePerUnit(record.salePrice, record.packSize);
    }
  }, []);

  // Enhanced helper with better fallbacks for old records
  const getSaleTypeInfo = useCallback((record) => {
    const originalSellType = record.originalSellType || record.sellType;
    const originalQuantity = record.originalQuantity || record.quantitySold;
    const unitsPerPackage =
      record.unitsPerPackage || getUnitsPerPackage(record.packSize) || 1;

    if (originalSellType === "units") {
      const packagesEquivalent = record.quantitySold / unitsPerPackage;
      return {
        type: "units",
        displayText: `${
          record.quantitySold
        } units / ${packagesEquivalent.toFixed(1)} packages`,
      };
    } else if (originalSellType === "packages") {
      const packagesSold = originalQuantity;
      const totalUnits = record.quantitySold;
      return {
        type: "packages",
        displayText: `${packagesSold} packages / ${totalUnits} units`,
      };
    } else {
      // Fallback for old records
      const totalUnits = record.quantitySold;
      if (totalUnits % unitsPerPackage === 0) {
        const packagesSold = totalUnits / unitsPerPackage;
        return {
          type: "packages",
          displayText: `${packagesSold} packages / ${totalUnits} units`,
        };
      } else {
        const packagesEquivalent = totalUnits / unitsPerPackage;
        return {
          type: "units",
          displayText: `${totalUnits} units / ${packagesEquivalent.toFixed(
            1
          )} packages`,
        };
      }
    }
  }, []);

  const fetchSoldRecords = async () => {
    try {
      setLoading(true);
      const res = await getSoldMedicines();
      const data = Array.isArray(res) ? res : res.data || [];

      // Normalize values
      const cleanedData = data.map((item) => ({
        ...item,
        quantitySold: Number(item.quantitySold) || 0,
        salePrice: Number(item.salePrice) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        totalAmount: Number(item.totalAmount) || 0,
      }));

      setSoldRecords(cleanedData);
      setFiltered(cleanedData);

      // Calculate total revenue using the CORRECT calculation
      const total = cleanedData.reduce((acc, item) => {
        return acc + calculateTotalAmount(item);
      }, 0);

      setTotalRevenue(total);
    } catch (err) {
      console.error("Error fetching sold records:", err);
      toast.error("Failed to load sold medicine records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSoldRecords();
  }, [calculateTotalAmount]);

  const handleSearch = (e) => {
    const val = e.target.value.toLowerCase();
    setSearch(val);

    const results = soldRecords.filter(
      (r) =>
        r.name?.toLowerCase().includes(val) ||
        r.category?.toLowerCase().includes(val) ||
        r.manufacturer?.toLowerCase().includes(val)
    );
    setFiltered(results);
  };

  // ✅ FIXED: Generate PDF Invoice without auto-print
  const generateInvoice = (saleRecord) => {
    try {
      const saleInfo = getSaleTypeInfo(saleRecord);
      const totalAmount = calculateTotalAmount(saleRecord);
      const displayUnitPrice = getDisplayUnitPrice(saleRecord);

      const invoiceWindow = window.open("", "_blank", "width=800,height=900");

      const invoiceContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${saleRecord.name}</title>
        <style>
          @media print {
            .no-print { display: none !important; }
            body { margin: 0; padding: 15px; font-size: 14px; }
            .invoice-container { border: none; box-shadow: none; }
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 30px; 
            color: #333;
            max-width: 700px;
          }
          .invoice-container {
            border: 2px solid #3498db;
            border-radius: 10px;
            padding: 25px;
            background: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .invoice-header { 
            text-align: center; 
            border-bottom: 2px solid #3498db; 
            padding-bottom: 20px; 
            margin-bottom: 25px;
          }
          .invoice-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
            font-size: 14px;
          }
          .invoice-table th { 
            background: #3498db; 
            color: white;
            padding: 12px;
            text-align: left;
            border: 1px solid #2980b9;
          }
          .invoice-table td { 
            padding: 12px;
            border: 1px solid #ddd;
          }
          .total-section { 
            text-align: right; 
            margin-top: 25px; 
            font-size: 1.2em;
            font-weight: bold;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #ddd;
          }
          .print-section {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #ddd;
          }
          .print-btn {
            background: #3498db;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            transition: background 0.3s;
          }
          .print-btn:hover {
            background: #2980b9;
          }
          .shortcut-hint {
            color: #666;
            font-size: 12px;
            margin-top: 8px;
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="invoice-header">
            <h1 style="margin: 0; color: #2c3e50;">💊 Noor Sardar HealthCare Center</h1>
            <h2 style="margin: 10px 0; color: #3498db;">MEDICINE SALES INVOICE</h2>
            <p style="margin: 0; color: #7f8c8d;">Invoice #INV-${saleRecord._id
              .slice(-8)
              .toUpperCase()}</p>
          </div>

          <div style="margin: 15px 0; padding: 15px; background: #e8f4fd; border-radius: 6px;">
            <strong>Sale Date:</strong> ${new Date(
              saleRecord.soldAt
            ).toLocaleString()}<br>
            <strong>Sold By:</strong> ${saleRecord.soldBy || "Operator"}
          </div>

          <table class="invoice-table">
            <thead>
              <tr>
                <th>Medicine Details</th>
                <th>Quantity</th>
                <th>Unit Price (PKR)</th>
                <th>Total Amount (PKR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${saleRecord.name}</strong><br/>
                  <small style="color: #666;">${
                    saleRecord.packSize || "No package info"
                  }</small>
                </td>
                <td>${saleInfo.displayText}</td>
                <td>${displayUnitPrice.toFixed(2)}</td>
                <td><strong>${totalAmount.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            <div style="font-size: 1.3em; color: #27ae60;">
              Grand Total: <strong>PKR ${totalAmount.toFixed(2)}</strong>
            </div>
          </div>

          <div class="print-section no-print">
            <button class="print-btn" onclick="window.print()">
              🖨️ PRINT INVOICE NOW
            </button>
            <div class="shortcut-hint">
              💡 Quick tip: Press <strong>Ctrl + P</strong> (Windows) or <strong>Cmd + P</strong> (Mac) to print
            </div>
          </div>

          <div style="margin-top: 40px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #ddd; padding-top: 20px;">
            <p>Thank you for your purchase! 🎉</p>
            <p><em>This is a computer-generated invoice</em></p>
          </div>
        </div>
      </body>
      </html>
    `;

      invoiceWindow.document.write(invoiceContent);
      invoiceWindow.document.close();

      // Focus the new window
      invoiceWindow.focus();

      toast.success("Invoice opened! Click PRINT button or press Ctrl+P 🖨️");
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error("Failed to generate invoice");
    }
  };

  return (
    <div className="sold-container">
      <div className="sold-header">
        <h1>📦 Sold Medicines</h1>
        <div className="header-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Search medicine..."
              value={search}
              onChange={handleSearch}
            />
          </div>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <h3>Total Sold Items</h3>
            <p>{soldRecords.length}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <h3>Total Revenue</h3>
            <p>PKR {totalRevenue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="loading">Loading records...</p>
      ) : filtered.length > 0 ? (
        <div className="sold-table-wrapper">
          <table className="sold-table">
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Package</th>
                <th>Quantity Sold</th>
                <th>Unit Price</th>
                <th>Total (PKR)</th>
                <th>Date</th>
                <th>Invoice</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const saleInfo = getSaleTypeInfo(r);
                const totalAmount = calculateTotalAmount(r);
                const displayUnitPrice = getDisplayUnitPrice(r);

                return (
                  <tr key={r._id}>
                    <td className="medicine-name">
                      <span className="medicine-icon">💊</span>
                      {r.name || "-"}
                    </td>
                    <td className="package-cell">
                      {r.packSize ? (
                        <div className="package-info-small">
                          <span className="package-icon">📦</span>
                          {r.packSize}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="quantity-cell">
                      <div className="sale-quantity">
                        <span className={`sale-type-badge ${saleInfo.type}`}>
                          {saleInfo.type === "units" ? "💊" : "📦"}
                        </span>
                        {saleInfo.displayText}
                      </div>
                    </td>
                    <td className="price-cell">
                      PKR {displayUnitPrice.toFixed(2)}
                      <small
                        style={{
                          display: "block",
                          fontSize: "0.7rem",
                          color: "#666",
                        }}
                      >
                        {saleInfo.type === "units" ? "per unit" : "per package"}
                      </small>
                    </td>
                    <td className="total-cell">
                      PKR {totalAmount.toFixed(2)}
                      <small
                        style={{
                          display: "block",
                          fontSize: "0.7rem",
                          color: "#666",
                        }}
                      >
                        {r.quantitySold} × {displayUnitPrice.toFixed(2)}
                      </small>
                    </td>
                    <td className="date-cell">
                      {new Date(r.soldAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                    <td className="invoice-action">
                      <button
                        className="invoice-btn"
                        onClick={() => generateInvoice(r)}
                      >
                        🧾 Generate
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-records">
          <div className="no-records-icon">😔</div>
          <h3>No sold records found</h3>
          <p>Try adjusting your search terms or check back later</p>
        </div>
      )}
    </div>
  );
}
