import React, { useEffect, useState } from "react";
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

  // Helper function to extract units from packSize
  const getUnitsPerPackage = (packSize) => {
    if (!packSize) return 1;
    const match = packSize.match(
      /(\d+)\s*(tablets?|capsules?|ml|vials?|bottles?|sachets?|tubes?|pieces?|units?)/i
    );
    return match ? parseInt(match[1]) : 1;
  };

  // Enhanced helper with better fallbacks for old records
  const getSaleTypeInfo = (record) => {
    const originalSellType = record.originalSellType || record.sellType;
    const originalQuantity = record.originalQuantity || record.quantitySold;
    const unitsPerPackage =
      record.unitsPerPackage || getUnitsPerPackage(record.packSize) || 1;

    // If we have the original sell type, use it for accurate display
    if (originalSellType === "units") {
      const packagesEquivalent = record.quantitySold / unitsPerPackage;
      return {
        type: "units",
        displayText: `${
          record.quantitySold
        } units / ${packagesEquivalent.toFixed(1)} packages`,
        shortDisplay: `${record.quantitySold}u / ${packagesEquivalent.toFixed(
          1
        )}p`,
      };
    } else if (originalSellType === "packages") {
      const packagesSold = originalQuantity;
      const totalUnits = record.quantitySold;
      return {
        type: "packages",
        displayText: `${packagesSold} packages / ${totalUnits} units`,
        shortDisplay: `${packagesSold}p / ${totalUnits}u`,
      };
    } else {
      // Fallback for old records without new fields - smart detection
      return smartDetectSaleType(record, unitsPerPackage);
    }
  };

  // Smart detection for old records
  const smartDetectSaleType = (record, unitsPerPackage) => {
    const totalUnits = record.quantitySold;

    if (totalUnits % unitsPerPackage === 0) {
      const packagesSold = totalUnits / unitsPerPackage;
      return {
        type: "packages",
        displayText: `${packagesSold} packages / ${totalUnits} units`,
        shortDisplay: `${packagesSold}p / ${totalUnits}u`,
      };
    } else if (totalUnits < unitsPerPackage) {
      const packagesEquivalent = totalUnits / unitsPerPackage;
      return {
        type: "units",
        displayText: `${totalUnits} units / ${packagesEquivalent.toFixed(
          2
        )} packages`,
        shortDisplay: `${totalUnits}u / ${packagesEquivalent.toFixed(2)}p`,
      };
    } else {
      const packagesEquivalent = totalUnits / unitsPerPackage;
      return {
        type: "units",
        displayText: `${totalUnits} units / ${packagesEquivalent.toFixed(
          1
        )} packages`,
        shortDisplay: `${totalUnits}u / ${packagesEquivalent.toFixed(1)}p`,
      };
    }
  };

  // ✅ FIXED: Correct total amount calculation
  const calculateTotalAmount = (record) => {
    // Always use totalAmount from backend if available (most reliable)
    if (record.totalAmount) {
      return Number(record.totalAmount);
    }

    // Fallback calculation
    const unitsPerPackage =
      record.unitsPerPackage || getUnitsPerPackage(record.packSize) || 1;
    const sellType = record.originalSellType || record.sellType;

    if (sellType === "packages") {
      // For packages: quantitySold is actually total units, so we need originalQuantity
      const packagesSold =
        record.originalQuantity || record.quantitySold / unitsPerPackage;
      return packagesSold * (record.unitPrice || record.salePrice);
    } else {
      // For units: use unit price
      return (
        record.quantitySold *
        (record.unitPrice || record.salePrice / unitsPerPackage)
      );
    }
  };

  const fetchSoldRecords = async () => {
    try {
      setLoading(true);
      const res = await getSoldMedicines();
      const data = Array.isArray(res) ? res : res.data || [];

      // Normalize values to ensure numbers
      const cleanedData = data.map((item) => ({
        ...item,
        quantitySold: Number(item.quantitySold) || 0,
        salePrice: Number(item.salePrice) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        totalAmount: Number(item.totalAmount) || 0,
      }));

      setSoldRecords(cleanedData);
      setFiltered(cleanedData);

      // ✅ FIXED: Use the correct calculation for total revenue
      const total = cleanedData.reduce((acc, item) => {
        return acc + calculateTotalAmount(item);
      }, 0);

      setTotalRevenue(total);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load sold medicine records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSoldRecords();
  }, []);

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

  // ✅ IMPROVED: Generate PDF Invoice
  const generateInvoice = (saleRecord) => {
    try {
      const saleInfo = getSaleTypeInfo(saleRecord);
      const totalAmount = calculateTotalAmount(saleRecord);
      const unitPrice = saleRecord.unitPrice || saleRecord.salePrice;

      // Create a new window for invoice
      const invoiceWindow = window.open("", "_blank", "width=800,height=1000");

      const invoiceContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice - ${saleRecord.name}</title>
          <style>
            @media print {
              body { margin: 0; padding: 15px; }
              .no-print { display: none; }
            }
            body { 
              font-family: 'Arial', sans-serif; 
              margin: 30px; 
              color: #333;
              line-height: 1.4;
            }
            .invoice-container {
              max-width: 700px;
              margin: 0 auto;
              border: 2px solid #3498db;
              border-radius: 10px;
              padding: 25px;
              background: white;
            }
            .invoice-header { 
              text-align: center; 
              border-bottom: 3px solid #3498db; 
              padding-bottom: 20px; 
              margin-bottom: 25px;
            }
            .clinic-info {
              margin-bottom: 10px;
            }
            .clinic-name {
              font-size: 24px;
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 5px;
            }
            .clinic-sub {
              font-size: 16px;
              color: #7f8c8d;
            }
            .invoice-title {
              font-size: 20px;
              color: #3498db;
              margin: 10px 0;
            }
            .invoice-details { 
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin: 20px 0; 
              background: #f8f9fa; 
              padding: 15px; 
              border-radius: 8px;
            }
            .detail-group {
              margin-bottom: 8px;
            }
            .detail-label {
              font-weight: bold;
              color: #555;
              font-size: 14px;
            }
            .detail-value {
              color: #2c3e50;
            }
            .sale-type-info {
              background: #e8f4fd;
              padding: 12px;
              border-radius: 6px;
              margin: 15px 0;
              border-left: 4px solid #3498db;
            }
            .invoice-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .invoice-table th { 
              background: #3498db; 
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: bold;
            }
            .invoice-table td { 
              padding: 12px;
              border-bottom: 1px solid #ddd;
            }
            .invoice-table tr:nth-child(even) {
              background: #f8f9fa;
            }
            .total-section { 
              text-align: right; 
              margin-top: 25px; 
              font-size: 1.1em;
              padding: 15px;
              background: #ecf0f1;
              border-radius: 6px;
            }
            .grand-total {
              font-size: 1.3em;
              color: #27ae60;
              font-weight: bold;
              margin-top: 10px;
              padding-top: 10px;
              border-top: 2px solid #bdc3c7;
            }
            .footer { 
              margin-top: 40px; 
              text-align: center; 
              color: #7f8c8d; 
              border-top: 1px solid #ddd; 
              padding-top: 20px;
              font-size: 14px;
            }
            .currency {
              font-family: 'Courier New', monospace;
              font-weight: bold;
            }
            .print-btn {
              background: #3498db;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
              margin: 20px 0;
              font-size: 16px;
            }
            .print-btn:hover {
              background: #2980b9;
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="invoice-header">
              <div class="clinic-info">
                <div class="clinic-name">💊 Noor Sardar HealthCare Center</div>
                <div class="clinic-sub">Quality Medicines, Caring Service</div>
              </div>
              <div class="invoice-title">MEDICINE SALES INVOICE</div>
              <div style="font-size: 14px; color: #7f8c8d;">
                Invoice #INV-${saleRecord._id.slice(-8).toUpperCase()}
              </div>
            </div>

            <div class="invoice-details">
              <div>
                <div class="detail-group">
                  <div class="detail-label">Invoice Date</div>
                  <div class="detail-value">${new Date(
                    saleRecord.soldAt
                  ).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}</div>
                </div>
                <div class="detail-group">
                  <div class="detail-label">Invoice Time</div>
                  <div class="detail-value">${new Date(
                    saleRecord.soldAt
                  ).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}</div>
                </div>
              </div>
              <div>
                <div class="detail-group">
                  <div class="detail-label">Sold By</div>
                  <div class="detail-value">${
                    saleRecord.soldBy || "Operator"
                  }</div>
                </div>
                <div class="detail-group">
                  <div class="detail-label">Generated On</div>
                  <div class="detail-value">${new Date().toLocaleString(
                    "en-US"
                  )}</div>
                </div>
              </div>
            </div>

            <div class="sale-type-info">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <strong>Sale Type:</strong> ${saleInfo.type.toUpperCase()} SALE
                </div>
                <div>
                  <strong>Package Size:</strong> ${
                    saleRecord.packSize || "Not specified"
                  }
                </div>
              </div>
            </div>

            <table class="invoice-table">
              <thead>
                <tr>
                  <th>Medicine Details</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>${saleRecord.name || "-"}</strong><br/>
                    <small style="color: #7f8c8d;">${
                      saleRecord.manufacturer || "No manufacturer"
                    }</small>
                  </td>
                  <td>${saleRecord.category || "-"}</td>
                  <td>${saleInfo.displayText}</td>
                  <td class="currency">PKR ${unitPrice.toFixed(2)}</td>
                  <td class="currency">PKR ${totalAmount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div class="total-section">
              <div>Subtotal: <span class="currency">PKR ${totalAmount.toFixed(
                2
              )}</span></div>
              <div>Tax (0%): <span class="currency">PKR 0.00</span></div>
              <div class="grand-total">
                Grand Total: <span class="currency">PKR ${totalAmount.toFixed(
                  2
                )}</span>
              </div>
            </div>

            <div class="footer">
              <p>Thank you for your purchase! 🎉</p>
              <p>For any queries, please contact the pharmacy</p>
              <p><em>This is a computer-generated invoice</em></p>
            </div>

            <div class="no-print" style="text-align: center; margin-top: 20px;">
              <button class="print-btn" onclick="window.print()">🖨️ Print Invoice</button>
            </div>
          </div>
        </body>
        </html>
      `;

      invoiceWindow.document.write(invoiceContent);
      invoiceWindow.document.close();

      toast.success("Invoice generated successfully! 🧾");
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error("Failed to generate invoice");
    }
  };

  // Generate bulk invoices (All filtered records)
  const generateBulkInvoices = () => {
    if (filtered.length === 0) {
      toast.error("No records to generate invoices");
      return;
    }

    const bulkWindow = window.open("", "_blank", "width=900,height=700");

    let bulkContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bulk Invoices - Noor Sardar HealthCare Center</title>
        <style>
          @media print {
            .invoice { page-break-after: always; }
            .no-print { display: none; }
          }
          body { font-family: Arial, sans-serif; margin: 20px; }
          .bulk-header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #3498db; }
          .invoice { margin-bottom: 40px; padding: 25px; border: 1px solid #ddd; border-radius: 8px; background: white; }
          .invoice-header { text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 15px; margin-bottom: 20px; }
          .sale-type { background: #e8f4fd; padding: 8px 12px; border-radius: 4px; display: inline-block; margin: 5px 0; font-size: 14px; }
          .invoice-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .invoice-table th, .invoice-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          .invoice-table th { background: #3498db; color: white; }
          .total { text-align: right; font-weight: bold; margin-top: 15px; padding: 10px; background: #ecf0f1; border-radius: 4px; }
          .currency { font-family: 'Courier New', monospace; font-weight: bold; }
          .print-all-btn { 
            background: #3498db; 
            color: white; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 5px; 
            cursor: pointer; 
            font-size: 16px; 
            margin: 20px 0; 
          }
          .print-all-btn:hover { background: #2980b9; }
        </style>
      </head>
      <body>
        <div class="bulk-header">
          <h1 style="color: #2c3e50;">📦 Bulk Invoices Report</h1>
          <h3>Noor Sardar HealthCare Center</h3>
          <p>Generated on ${new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
          })}</p>
          <p>Total Invoices: ${filtered.length} | Total Revenue: PKR ${filtered
      .reduce((acc, record) => acc + calculateTotalAmount(record), 0)
      .toFixed(2)}</p>
        </div>
        
        <div class="no-print" style="text-align: center;">
          <button class="print-all-btn" onclick="window.print()">🖨️ Print All Invoices</button>
        </div>
    `;

    filtered.forEach((record, index) => {
      const saleInfo = getSaleTypeInfo(record);
      const totalAmount = calculateTotalAmount(record);

      bulkContent += `
        <div class="invoice">
          <div class="invoice-header">
            <h2>Noor Sardar HealthCare Center</h2>
            <h3>INVOICE #${index + 1} of ${filtered.length}</h3>
            <p style="color: #7f8c8d; font-size: 14px;">INV-${record._id
              .slice(-8)
              .toUpperCase()}</p>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div>
              <strong>Medicine:</strong> ${record.name}<br/>
              <strong>Date:</strong> ${new Date(
                record.soldAt
              ).toLocaleDateString()}
            </div>
            <div>
              <strong>Category:</strong> ${record.category || "-"}<br/>
              <strong>Time:</strong> ${new Date(
                record.soldAt
              ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          
          <div class="sale-type">${saleInfo.type.toUpperCase()} SALE - ${
        saleInfo.displayText
      }</div>
          
          ${
            record.packSize
              ? `<p><strong>Package:</strong> ${record.packSize}</p>`
              : ""
          }
          
          <table class="invoice-table">
            <tr>
              <th>Quantity</th>
              <th>Unit Price (PKR)</th>
              <th>Total Amount (PKR)</th>
            </tr>
            <tr>
              <td>${saleInfo.displayText}</td>
              <td class="currency">${(
                record.unitPrice || record.salePrice
              ).toFixed(2)}</td>
              <td class="currency">${totalAmount.toFixed(2)}</td>
            </tr>
          </table>
          
          <div class="total">
            Total: <span class="currency">PKR ${totalAmount.toFixed(2)}</span>
          </div>
        </div>
      `;
    });

    bulkContent += `</body></html>`;

    bulkWindow.document.write(bulkContent);
    bulkWindow.document.close();

    toast.success(`Generated ${filtered.length} invoices! 📦`);
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
          <div className="action-bar">
            <button
              className="bulk-invoice-btn"
              onClick={generateBulkInvoices}
              disabled={filtered.length === 0}
            >
              📦 Generate All Invoices
            </button>
            <button
              className="view-invoices-btn"
              onClick={() => navigate("/invoices")}
            >
              🗂️ Invoice Archive
            </button>
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
        <div className="summary-card">
          <div className="summary-icon">🧾</div>
          <div className="summary-content">
            <h3>Invoices Ready</h3>
            <p>{soldRecords.length}</p>
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
                <th>Category</th>
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

                return (
                  <tr key={r._id}>
                    <td className="medicine-name">
                      <span className="medicine-icon">💊</span>
                      {r.name || "-"}
                    </td>
                    <td>
                      <span className="category-badge">
                        {r.category || "-"}
                      </span>
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
                          {saleInfo.type === "units"
                            ? "💊"
                            : saleInfo.type === "packages"
                            ? "📦"
                            : "📋"}
                        </span>
                        {saleInfo.displayText}
                      </div>
                    </td>
                    <td className="price-cell">
                      PKR {(r.unitPrice || r.salePrice).toFixed(2)}
                    </td>
                    <td className="total-cell">PKR {totalAmount.toFixed(2)}</td>
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
                        title="Generate Invoice"
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
