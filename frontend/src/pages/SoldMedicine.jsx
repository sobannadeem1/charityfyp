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

  // Helper to determine sale type and format display
  const getSaleTypeInfo = (record) => {
    if (!record.packSize)
      return { type: "units", description: `${record.quantitySold} units` };

    const unitsPerPackage = getUnitsPerPackage(record.packSize);

    if (record.sellType === "units" || record.quantitySold < unitsPerPackage) {
      // Individual unit sale
      const unitPrice = record.unitPrice || record.salePrice / unitsPerPackage;
      return {
        type: "units",
        description: `${record.quantitySold} units`,
        unitPrice: unitPrice,
        packageInfo: `From: ${record.packSize}`,
      };
    } else if (record.quantitySold % unitsPerPackage === 0) {
      // Complete package sale
      const packagesSold = record.quantitySold / unitsPerPackage;
      return {
        type: "packages",
        description: `${packagesSold} packages`,
        unitPrice: record.salePrice,
        packageInfo: `${record.packSize}`,
      };
    } else {
      // Mixed sale (packages + individual units)
      const packagesSold = Math.floor(record.quantitySold / unitsPerPackage);
      const remainingUnits = record.quantitySold % unitsPerPackage;
      return {
        type: "mixed",
        description: `${packagesSold} packages + ${remainingUnits} units`,
        unitPrice: record.salePrice / unitsPerPackage,
        packageInfo: `${record.packSize}`,
      };
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
      }));

      setSoldRecords(cleanedData);
      setFiltered(cleanedData);

      const total = cleanedData.reduce(
        (acc, item) =>
          acc +
          (item.totalAmount ||
            item.quantitySold * (item.unitPrice || item.salePrice)),
        0
      );
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

  // Generate PDF Invoice
  const generateInvoice = (saleRecord) => {
    try {
      const saleInfo = getSaleTypeInfo(saleRecord);
      const totalAmount =
        saleRecord.totalAmount ||
        saleRecord.quantitySold *
          (saleRecord.unitPrice || saleRecord.salePrice);

      // Create a new window for invoice
      const invoiceWindow = window.open("", "_blank");

      const invoiceContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice - ${saleRecord.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 40px; 
              color: #333;
            }
            .invoice-header { 
              text-align: center; 
              border-bottom: 3px solid #3498db; 
              padding-bottom: 20px; 
              margin-bottom: 30px;
            }
            .invoice-details { 
              margin: 20px 0; 
              background: #f8f9fa; 
              padding: 15px; 
              border-radius: 8px;
            }
            .sale-type-info {
              background: #e8f4fd;
              padding: 10px;
              border-radius: 6px;
              margin: 10px 0;
              border-left: 4px solid #3498db;
            }
            .invoice-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0;
            }
            .invoice-table th, .invoice-table td { 
              border: 1px solid #ddd; 
              padding: 12px; 
              text-align: left;
            }
            .invoice-table th { 
              background: #3498db; 
              color: white;
            }
            .total-section { 
              text-align: right; 
              margin-top: 20px; 
              font-size: 1.2em; 
              font-weight: bold;
            }
            .footer { 
              margin-top: 40px; 
              text-align: center; 
              color: #666; 
              border-top: 1px solid #ddd; 
              padding-top: 20px;
            }
            .currency {
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <h1>💊 Noor Sardar HealthCare Center</h1>
            <h2>MEDICINE INVOICE</h2>
            <p>Invoice #${saleRecord._id.slice(-6).toUpperCase()}</p>
          </div>

          <div class="invoice-details">
            <p><strong>Date:</strong> ${new Date(
              saleRecord.soldAt
            ).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${new Date(
              saleRecord.soldAt
            ).toLocaleTimeString()}</p>
            <p><strong>Invoice ID:</strong> INV-${saleRecord._id
              .slice(-8)
              .toUpperCase()}</p>
            <p><strong>Sold By:</strong> ${saleRecord.soldBy || "Operator"}</p>
          </div>

          <div class="sale-type-info">
            <p><strong>Sale Type:</strong> ${saleInfo.type.toUpperCase()} SALE</p>
            <p><strong>Package:</strong> ${
              saleRecord.packSize || "Not specified"
            }</p>
          </div>

          <table class="invoice-table">
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Unit Price (PKR)</th>
                <th>Total (PKR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${saleRecord.name || "-"}</td>
                <td>${saleRecord.category || "-"}</td>
                <td>${saleInfo.description}</td>
                <td class="currency">${(
                  saleRecord.unitPrice || saleRecord.salePrice
                ).toFixed(2)}</td>
                <td class="currency">${totalAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            <p>Subtotal: <span class="currency">${totalAmount.toFixed(
              2
            )}</span></p>
            <p>Tax (0%): <span class="currency">0.00</span></p>
            <p style="color: #27ae60; font-size: 1.3em;">
              Grand Total: <span class="currency">PKR ${totalAmount.toFixed(
                2
              )}</span>
            </p>
          </div>

          <div class="footer">
            <p>Thank you for your purchase! 🎉</p>
            <p>Noor Sardar HealthCare Center - Quality Medicines, Caring Service</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `;

      invoiceWindow.document.write(invoiceContent);
      invoiceWindow.document.close();

      toast.success("Invoice generated successfully! 🧾");

      // Auto-print after a short delay
      setTimeout(() => {
        invoiceWindow.print();
      }, 500);
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

    const bulkWindow = window.open("", "_blank");

    let bulkContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bulk Invoices - Noor Sardar HealthCare Center</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .invoice { page-break-after: always; margin-bottom: 40px; padding: 20px; border: 1px solid #ddd; }
          .invoice-header { text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-bottom: 20px; }
          .sale-type { background: #e8f4fd; padding: 5px 10px; border-radius: 4px; display: inline-block; margin: 5px 0; }
          .invoice-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .invoice-table th, .invoice-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .invoice-table th { background: #3498db; color: white; }
          .total { text-align: right; font-weight: bold; margin-top: 10px; }
          .currency { font-family: monospace; }
        </style>
      </head>
      <body>
        <h1 style="text-align: center; color: #2c3e50;">📦 Bulk Invoices Report</h1>
        <p style="text-align: center;">Noor Sardar HealthCare Center - Generated on ${new Date().toLocaleDateString()}</p>
        <hr style="margin: 20px 0;">
    `;

    filtered.forEach((record, index) => {
      const saleInfo = getSaleTypeInfo(record);
      const totalAmount =
        record.totalAmount ||
        record.quantitySold * (record.unitPrice || record.salePrice);

      bulkContent += `
        <div class="invoice">
          <div class="invoice-header">
            <h2>Noor Sardar HealthCare Center</h2>
            <h3>INVOICE #${index + 1}</h3>
          </div>
          <p><strong>Medicine:</strong> ${record.name}</p>
          <p><strong>Date:</strong> ${new Date(
            record.soldAt
          ).toLocaleDateString()}</p>
          <div class="sale-type">${saleInfo.type.toUpperCase()} SALE - ${
        saleInfo.description
      }</div>
          ${
            record.packSize
              ? `<p><strong>Package:</strong> ${record.packSize}</p>`
              : ""
          }
          <table class="invoice-table">
            <tr><th>Quantity</th><th>Unit Price (PKR)</th><th>Total (PKR)</th></tr>
            <tr>
              <td>${saleInfo.description}</td>
              <td class="currency">${(
                record.unitPrice || record.salePrice
              ).toFixed(2)}</td>
              <td class="currency">${totalAmount.toFixed(2)}</td>
            </tr>
          </table>
          <div class="total">Total: <span class="currency">PKR ${totalAmount.toFixed(
            2
          )}</span></div>
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
                const totalAmount =
                  r.totalAmount ||
                  r.quantitySold * (r.unitPrice || r.salePrice);

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
                        {saleInfo.description}
                      </div>
                    </td>
                    <td className="price-cell">
                      PKR {(r.unitPrice || r.salePrice).toFixed(2)}
                    </td>
                    <td className="total-cell">PKR {totalAmount.toFixed(2)}</td>
                    <td className="date-cell">
                      {new Date(r.soldAt).toLocaleString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                        day: "2-digit",
                        month: "short",
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
