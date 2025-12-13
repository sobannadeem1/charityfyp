// src/pages/InvoiceHistory.jsx
import React, { useState, useEffect } from "react";
import { getAllInvoices, getInvoiceById } from "../api/medicineapi.js";
import { format } from "date-fns";
import { toast } from "sonner";
import "../styles/invoices.css";



export default function InvoiceHistory() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("all");
  const [sortBy, setSortBy] = useState("date-newest");

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await getAllInvoices({
        page,
        q: search,
        month: month !== "all" ? month : undefined,
        sort: sortBy,
      });
      setInvoices(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalRevenue(res.summary?.totalRevenue || 0);
    } catch (err) {
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, search, month, sortBy]);

const handleReprint = async (invoiceId) => {
  try {
    const res = await getInvoiceById(invoiceId);
    const invoice = res.data;

    if (!invoice || !invoice.items?.length) {
      toast.error("Invoice data not available");
      return;
    }

    const itemsRows = invoice.items
      .map((item) => {
        const unitsPerPackage = item.packSize ? (item.packSize.toString().match(/\b(\d+)\b/)?.[1] || 1) : 1;
        const isUnits = item.sellType === "units";
        const displayQty = isUnits
          ? `${item.quantitySold} units`
          : `${item.quantitySold} package${item.quantitySold > 1 ? "s" : ""}`;
        const subText = isUnits
          ? `≈ ${(item.quantitySold / unitsPerPackage).toFixed(1)} packages`
          : item.quantitySold * unitsPerPackage > 1
          ? `= ${item.quantitySold * unitsPerPackage} units`
          : "";
        const unitPrice = isUnits
          ? (item.salePrice / unitsPerPackage).toFixed(2)
          : item.salePrice.toFixed(2);

        // USE SAVED TOTAL — NO RECALCULATION!
        const total = Number(item.totalAmount || 0).toFixed(2);

        return `
          <tr class="item-row">
            <td class="item-details">
              <div class="item-name">${item.name}</div>
              <div class="item-pack">${item.packSize || "Standard Pack"}${item.strength ? ` • ${item.strength}` : ""}</div>
            </td>
            <td class="item-qty">
              <div class="qty-main">${displayQty}</div>
              ${subText ? `<small class="qty-sub ${isUnits ? 'blue' : 'green'}">(${subText})</small>` : ""}
            </td>
            <td class="item-unit">
              PKR ${unitPrice}
              <div class="unit-sub">per ${isUnits ? "unit" : "package"}</div>
            </td>
            <td class="item-total">PKR ${total}</td>
          </tr>`;
      })
      .join("");

    // USE SAVED TOTAL FROM DB — FINAL TRUTH
    const grandTotal = Number(invoice.totalRevenue || 0).toFixed(2);

    const printHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice - Noor Sardar HealthCare</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root { --primary: #3498db; --primary-dark: #2980b9; --success: #27ae60; --success-light: #2ecc71; --text-dark: #2c3e50; --text-light: #7f8c8d; --bg-light: #f5f7fa; --white: #ffffff; }
    html { font-size: 14px; zoom: 0.9; }
    body { max-width: 900px; margin: 0 auto; transform: scale(0.95); transform-origin: top center; font-family: 'Inter', sans-serif; background: var(--bg-light); color: var(--text-dark); padding: 2rem; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    .container { max-width: 60rem; margin: 0 auto; background: var(--white); border-radius: 1.2rem; overflow: hidden; border: 0.3rem solid var(--primary); box-shadow: 0 1.5rem 3.5rem rgba(0,0,0,0.15); }
    .header { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: var(--white); text-align: center; padding: 3rem 2rem; }
    .header h1 { font-size: 2.2rem; font-weight: 700; }
    .header h2 { font-size: 1.3rem; opacity: 0.95; }
    .invoice-id { margin-top: 1rem; background: rgba(255,255,255,0.25); border-radius: 2rem; padding: 0.6rem 1.5rem; font-size: 1rem; display: inline-block; font-weight: 600; }
    .info { display: grid; grid-template-columns: repeat(3, 1fr);
 gap: 2rem; background: #f0f8ff; padding: 2rem 2.5rem; }
    .info-box { background: var(--white); border-left: 0.4rem solid var(--primary); border-radius: 1rem; padding: 1.4rem; box-shadow: 0 0.5rem 1.5rem rgba(0,0,0,0.1); }
    .info-box strong { display: block; font-size: 0.8rem; color: var(--text-light); text-transform: uppercase; margin-bottom: 0.4rem; }
    .info-box div { font-size: 1rem; font-weight: 600; }
    .patient-name { font-size: 1.4rem; font-weight: bold; color: #27ae60; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { padding: 1rem 1.2rem; border-bottom: 0.05rem solid #e0e0e0; vertical-align: top; }
    th { background: var(--primary); color: var(--white); font-size: 0.95rem; font-weight: 600; text-align: left; }
    th:nth-child(2), td:nth-child(2) { text-align: center; width: 25%; }
    th:nth-child(3), td:nth-child(3), th:nth-child(4), td:nth-child(4) { text-align: right; width: 20%; }
    td:first-child { width: 35%; }
    .total-row td { background: linear-gradient(135deg, var(--success), var(--success-light)); color: white; padding: 2rem 1.2rem !important; font-size: 1.5rem !important; font-weight: 700; text-align: right; }
    .print-area { text-align: center; padding: 2.5rem; background: #f8f9fa; }
    .print-btn { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: var(--white); border: none; padding: 1rem 3rem; font-size: 1.1rem; border-radius: 2rem; cursor: pointer; font-weight: 600; }
    .footer { text-align: center; background: var(--text-dark); color: var(--white); padding: 2rem; font-size: 0.9rem; }
    @media print { body { padding: 0; background: white; } .print-area { display: none; } .container { border: none; box-shadow: none; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Noor Sardar HealthCare Center</h1>
      <h2>MEDICINE SALES INVOICE</h2>
      <div class="invoice-id">Invoice #${invoice.invoiceNumber}</div>
    </div>
<div class="info">
  <div class="info-box">
    <strong>Patient Name</strong>
    <div class="patient-name">${invoice.patientName || "Walk-in Patient"}</div>
  </div>
  <div class="info-box">
    <strong>Gender</strong>
    <div>${invoice.patientGender || "Not Specified"}</div>
  </div>
  <div class="info-box">
    <strong>Address</strong>
    <div>${invoice.patientAddress || "Not Provided"}</div>
  </div>
  <div class="info-box">
    <strong>Sale Date & Time</strong>
    <div>
      ${new Date(invoice.soldAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}<br>
      ${new Date(invoice.soldAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })}
    </div>
  </div>
  <div class="info-box">
    <strong>Served By</strong>
    <div>${invoice.soldBy || "Admin"}</div>
  </div>
</div>


    <table>
      <thead>
        <tr>
          <th>Medicine Details</th>
          <th style="text-align:center;">Quantity Sold</th>
          <th style="text-align:right;">Unit Price</th>
          <th style="text-align:right;">Total Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
        <tr class="total-row">
          <td colspan="3">
            GRAND TOTAL
            ${invoice.items.length > 1 ? `<div class="items-note">(${invoice.items.length} items)</div>` : ""}
          </td>
          <td>PKR ${grandTotal}</td>
        </tr>
      </tbody>
    </table>

    <div class="print-area">
      <button class="print-btn" onclick="window.print()">PRINT INVOICE</button>
      <p style="margin-top:0.8rem; color:#666; font-size:0.9rem;">Press Ctrl + P to print</p>
    </div>

    <div class="footer">
      <p>Thank you for choosing <strong>Noor Sardar HealthCare Center</strong></p>
      <p style="margin-top:0.5rem; opacity:0.8;">Computer-generated invoice • No signature required</p>
    </div>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=1000,height=900");
    if (!win) return toast.error("Popup blocked!");
    win.document.write(printHTML);
    win.document.close();
    win.focus();

    toast.success("Invoice ready!");
  } catch (err) {
    console.error(err);
    toast.error("Failed to load invoice");
  }
};

  const goToPage = (p) => p >= 1 && p <= totalPages && setPage(p);

  return (
    <div className="sold-container">
      <div className="sold-header">
        <h1>Invoice History</h1>
        <div className="header-controls">
          <div className="search-box">
            <input type="search" placeholder="Search patient..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="sold-filter-bar">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
              <option value="date-newest">Newest First</option>
              <option value="date-oldest">Oldest First</option>
              <option value="revenue-high">Highest Amount</option>
              <option value="revenue-low">Lowest Amount</option>
            </select>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="filter-select">
              <option value="all">All Months</option>
              {Array.from({ length: 12 }, (_, i) => {
                const d = new Date(); d.setMonth(d.getMonth() - i);
                const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                const label = d.toLocaleDateString("default", { month: "long", year: "numeric" });
                return <option key={value} value={value}>{label}</option>;
              })}
            </select>
          </div>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card highlight">
          <div className="summary-icon" style={{ color: "#27ae60" }}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
          </div>
          <div className="summary-content">
            <h3>{search || month !== "all" ? "Filtered Revenue" : "Total Revenue"}</h3>
            <p className="big-value">PKR {totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            <small className="summary-subtitle">{search ? `Search: "${search}"` : month !== "all" ? "Current month" : "All time"}</small>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loader-container"><div className="spinner"></div><p>Loading...</p></div>
      ) : invoices.length === 0 ? (
        <div className="no-records"><h3>No invoices found</h3></div>
      ) : (
        <>
          <div className="sold-table-wrapper">
            <table className="sold-table">
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Patient</th>
                  <th>Date & Time</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv._id}>
                    <td><strong>{inv.invoiceNumber}</strong></td>
                    <td>{inv.patientName}</td>
                    <td>{format(new Date(inv.soldAt), "dd MMM yyyy • hh:mm a")}</td>
                    <td>{inv.items.length} item{inv.items.length > 1 ? "s" : ""}</td>
                    <td className="highlight-total">PKR {Number(inv.totalRevenue).toFixed(2)}</td>
                    <td>
                      <button onClick={() => handleReprint(inv._id)} className="invoice-btn">
                        Re-Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button onClick={() => goToPage(page - 1)} disabled={page === 1} className="pagination-btn prev-next">←</button>
              <div className="page-numbers">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                  if (p < 1 || p > totalPages) return null;
                  return (
                    <button key={p} onClick={() => goToPage(p)} className={`page-number ${p === page ? "active" : ""}`}>
                      {p}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => goToPage(page + 1)} disabled={page === totalPages} className="pagination-btn prev-next">→</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}