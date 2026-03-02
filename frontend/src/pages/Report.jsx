// src/pages/Report.jsx

import React, { useState, useEffect, useRef } from "react";
import {
  getAllStockReport,
  getExpiryReport,
  getLowStockReport,
  getSpecificMedicineReport,
} from "../api/reportapi";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "../styles/Report.css";

export default function Report() {
  // ────────────────────────────────────────────────
  // State
  // ────────────────────────────────────────────────
  const [reportType, setReportType] = useState("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [datePreset, setDatePreset] = useState("custom");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);

  const abortControllerRef = useRef(null);
  const tableSectionRef = useRef(null);

  // ────────────────────────────────────────────────
  // Date preset auto-fill
  // ────────────────────────────────────────────────
  useEffect(() => {
    const today = new Date();
    let start = "";

    if (datePreset === "today") {
      start = today.toISOString().split("T")[0];
      setFromDate(start);
      setToDate(start);
    } else if (datePreset === "yesterday") {
      today.setDate(today.getDate() - 1);
      start = today.toISOString().split("T")[0];
      setFromDate(start);
      setToDate(start);
    } else if (datePreset === "this-week") {
      const first = new Date(today);
      first.setDate(today.getDate() - today.getDay());
      start = first.toISOString().split("T")[0];
      setFromDate(start);
      setToDate(new Date().toISOString().split("T")[0]);
    } else if (datePreset === "this-month") {
      start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
      setFromDate(start);
      setToDate(new Date().toISOString().split("T")[0]);
    } else if (datePreset === "last-month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      setFromDate(firstDay.toISOString().split("T")[0]);
      setToDate(lastDay.toISOString().split("T")[0]);
    }
  }, [datePreset]);

  // ────────────────────────────────────────────────
  // Fetch logic
  // ────────────────────────────────────────────────
  const fetchReport = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      let response;

      if (reportType === "all") {
        response = await getAllStockReport({
          search: search.trim() || undefined,
          category: category || undefined,
          status: statusFilter || undefined,
         fromDate: fromDate || undefined, 
  toDate: toDate || undefined,   
          signal: abortControllerRef.current.signal,
        });
      } else if (reportType === "specific" && search.trim()) {
        response = await getSpecificMedicineReport(search.trim());
      } else if (reportType === "expiry") {
        response = await getExpiryReport(90);
      } else if (reportType === "low-stock") {
        response = await getLowStockReport(50);
      }

      setReportData(response);
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message || "Failed to load report");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, search, category, statusFilter, fromDate, toDate]);

  // ────────────────────────────────────────────────
  // PDF Export
  // ────────────────────────────────────────────────
  const exportPDF = async () => {
    if (!tableSectionRef.current) return;

    try {
      const canvas = await html2canvas(tableSectionRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

      pdf.addImage(imgData, "PNG", 10, 10, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`Medicine_Report_${reportType}_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Failed to generate PDF");
    }
  };

  // ────────────────────────────────────────────────
  // Excel Export
  // ────────────────────────────────────────────────
  const exportExcel = () => {
    if (!reportData) return;

    let data = [];
    let sheetName = "Report";

    if (reportType === "all" && reportData?.medicines) {
      data = reportData.medicines.map((m) => ({
        Name: m.name,
        Category: m.category || "-",
        "Units Available": m.unitsAvailable || 0,
        Expiry: m.expiry ? new Date(m.expiry).toLocaleDateString() : "-",
        Status: m.status || "-",
        "Total Value (PKR)": m.totalValue || 0,
      }));
    } else if (reportType === "specific" && reportData?.medicine) {
      const m = reportData.medicine;
      data = [{
        Name: m.name,
        Category: m.category || "-",
        "Units Available": m.unitsAvailable || 0,
        Expiry: m.expiry ? new Date(m.expiry).toLocaleDateString() : "-",
        Status: m.status || "-",
        "Total Value (PKR)": m.totalValue || 0,
      }];
    } else if (reportType === "expiry" && reportData?.nearExpiry) {
      sheetName = "Expiry";
      data = [
        ...reportData.nearExpiry.map((item) => ({
          Name: item.name,
          Expiry: new Date(item.expiry).toLocaleDateString(),
          Units: item.unitsAvailable || 0,
          "Potential Loss (PKR)": item.potentialLoss || 0,
          Status: "Near Expiry",
        })),
        ...reportData.expired.map((item) => ({
          Name: item.name,
          Expiry: new Date(item.expiry).toLocaleDateString(),
          Units: item.unitsAvailable || 0,
          "Loss (PKR)": item.loss || 0,
          Status: "Expired",
        })),
      ];
    } else if (reportType === "low-stock" && reportData?.lowStockItems) {
      data = reportData.lowStockItems.map((item) => ({
        Name: item.name,
        Category: item.category || "-",
        "Units Available": item.unitsAvailable || 0,
        "Total Value (PKR)": item.totalValue || 0,
        Status: "Low Stock",
      }));
    }

    if (data.length === 0) {
      alert("No data available to export");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([excelBuffer], { type: "application/octet-stream" }),
      `Medicine_${reportType}_Report_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  // ────────────────────────────────────────────────
  // Render summary cards
  // ────────────────────────────────────────────────
  const renderSummary = () => {
    if (!reportData?.summary) return null;

    const s = reportData.summary;

    return (
      <div className="rn-summary-grid">
        {s.totalStockValue !== undefined && (
          <div className="rn-summary-card rn-card-total">
            <h4>Total Stock Value</h4>
            <p>PKR {s.totalStockValue.toLocaleString()}</p>
          </div>
        )}
        {s.lowStockCount !== undefined && (
          <div className="rn-summary-card rn-card-low">
            <h4>Low Stock</h4>
            <p>{s.lowStockCount} items</p>
          </div>
        )}
        {s.nearExpiryCount !== undefined && (
          <div className="rn-summary-card rn-card-near">
            <h4>Near Expiry</h4>
            <p>{s.nearExpiryCount} items</p>
          </div>
        )}
        {s.expiredCount !== undefined && (
          <div className="rn-summary-card rn-card-expired">
            <h4>Expired</h4>
            <p>{s.expiredCount} items</p>
          </div>
        )}
      </div>
    );
  };

  // ────────────────────────────────────────────────
  // Render table (adapt columns/data per type)
  // ────────────────────────────────────────────────
  const renderTableContent = () => {
    if (!reportData) return null;

    let rows = [];
    let headers = [];

    if (reportType === "all" && reportData.medicines?.length > 0) {
      headers = ["Name", "Category", "Units", "Expiry", "Status", "Value (PKR)"];
      rows = reportData.medicines.map((item, i) => (
        <tr key={i}>
          <td>{item.name}</td>
          <td>{item.category || "-"}</td>
          <td className={item.unitsAvailable < 50 ? "rn-low-value" : ""}>
            {item.unitsAvailable || 0}
          </td>
          <td>{item.expiry ? new Date(item.expiry).toLocaleDateString() : "-"}</td>
          <td className={`rn-status rn-status-${(item.status || "").toLowerCase().replace(" ", "-")}`}>
            {item.status || "-"}
          </td>
          <td>PKR {(item.totalValue || 0).toLocaleString()}</td>
        </tr>
      ));
    } else if (reportType === "specific" && reportData.medicine) {
      const m = reportData.medicine;
      headers = ["Name", "Category", "Units", "Expiry", "Status", "Value (PKR)"];
      rows = [(
        <tr key="single">
          <td>{m.name}</td>
          <td>{m.category || "-"}</td>
          <td>{m.unitsAvailable || 0}</td>
          <td>{m.expiry ? new Date(m.expiry).toLocaleDateString() : "-"}</td>
          <td className={`rn-status rn-status-${(m.status || "").toLowerCase().replace(" ", "-")}`}>
            {m.status || "-"}
          </td>
          <td>PKR {(m.totalValue || 0).toLocaleString()}</td>
        </tr>
      )];
    } else if (reportType === "expiry" && (reportData.nearExpiry?.length || reportData.expired?.length)) {
      headers = ["Name", "Expiry", "Units", "Loss/Potential (PKR)", "Status"];
      rows = [
        ... (reportData.nearExpiry || []).map((item, i) => (
          <tr key={`near-${i}`}>
            <td>{item.name}</td>
            <td>{new Date(item.expiry).toLocaleDateString()}</td>
            <td>{item.unitsAvailable || 0}</td>
            <td>PKR {(item.potentialLoss || 0).toLocaleString()}</td>
            <td className="rn-status-near">Near Expiry</td>
          </tr>
        )),
        ... (reportData.expired || []).map((item, i) => (
          <tr key={`exp-${i}`}>
            <td>{item.name}</td>
            <td>{new Date(item.expiry).toLocaleDateString()}</td>
            <td>{item.unitsAvailable || 0}</td>
            <td>PKR {(item.loss || 0).toLocaleString()}</td>
            <td className="rn-status-expired">Expired</td>
          </tr>
        )),
      ];
    } else if (reportType === "low-stock" && reportData.lowStockItems?.length > 0) {
      headers = ["Name", "Category", "Units Available", "Total Value (PKR)", "Status"];
      rows = reportData.lowStockItems.map((item, i) => (
        <tr key={i}>
          <td>{item.name}</td>
          <td>{item.category || "-"}</td>
          <td className="rn-low-value">{item.unitsAvailable || 0}</td>
          <td>PKR {(item.totalValue || 0).toLocaleString()}</td>
          <td className="rn-status-low">Low Stock</td>
        </tr>
      ));
    }

    if (rows.length === 0) {
      return <div className="rn-no-data">No matching records found</div>;
    }

    return (
      <div className="rn-table-wrapper">
        <table className="rn-data-table">
          <thead>
            <tr>
              {headers.map((h, i) => <th key={i}>{h}</th>)}
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    );
  };

  // ────────────────────────────────────────────────
  // JSX Return
  // ────────────────────────────────────────────────
  return (
    <div className="rn-reports-container">
      <header className="rn-header">
        <h1>Inventory Reports</h1>
      </header>

      {/* FILTERS */}
      <div className="rn-filter-panel">
        <div className="rn-filter-row">
          <div className="rn-filter-field">
            <label>Report Type</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="all">All Stock</option>
              <option value="specific">Specific Medicine</option>
              <option value="expiry">Expiry Alert</option>
              <option value="low-stock">Low Stock</option>
            </select>
          </div>

          <div className="rn-filter-field">
            <label>Search</label>
            <input
              type="text"
              placeholder="Medicine name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {reportType === "all" && (
            <>
              <div className="rn-filter-field">
                <label>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">All</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Injection">Injection</option>
                  <option value="Cream">Cream</option>
                </select>
              </div>

              <div className="rn-filter-field">
                <label>Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All</option>
                  <option value="Good">Good</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Near Expiry">Near Expiry</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
            </>
          )}

          <div className="rn-filter-field">
            <label>Date Range</label>
            <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)}>
              <option value="custom">Custom</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
            </select>
          </div>

          <div className="rn-filter-field">
            <label>From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>

          <div className="rn-filter-field">
            <label>To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>

        <div className="rn-button-group">
          <button className="rn-btn rn-btn-primary" onClick={fetchReport} disabled={loading}>
            {loading ? "Loading..." : "Generate Report"}
          </button>
          <button className="rn-btn rn-btn-pdf" onClick={exportPDF} disabled={loading || !reportData}>
            Download PDF
          </button>
          <button className="rn-btn rn-btn-excel" onClick={exportExcel} disabled={loading || !reportData}>
            Export Excel
          </button>
        </div>
      </div>

      {/* LOADING / ERROR */}
      {loading && <div className="rn-loading-spinner">Loading report...</div>}
      {error && <div className="rn-error-box">{error}</div>}

      {/* SUMMARY CARDS */}
      {renderSummary()}

      {/* TABLE SECTION (for PDF capture) */}
      <div className="rn-report-content" ref={tableSectionRef}>
        {reportData && renderTableContent()}
        {!loading && !reportData && !error && (
          <div className="rn-empty-state">
            Select filters and click "Generate Report"
          </div>
        )}
      </div>
    </div>
  );
}