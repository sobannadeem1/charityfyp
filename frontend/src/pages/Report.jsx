import React from "react";
import "../styles/Report.css";

export default function Report() {
  return (
    <div className="reports-page">
      <h2>Reports</h2>

      {/* Filters Section */}
      <div className="report-filters">
        <label>
          From:
          <input type="date" />
        </label>
        <label>
          To:
          <input type="date" />
        </label>
        <button className="filter-btn">Filter</button>
      </div>

      {/* Summary Cards */}
      <div className="report-summary">
        <div className="summary-card">
          <h3>Total Sales</h3>
          <p>PKR 150,000</p>
        </div>
        <div className="summary-card">
          <h3>Total Donations</h3>
          <p>PKR 45,000</p>
        </div>
        <div className="summary-card">
          <h3>Expired Medicines</h3>
          <p>12 Items</p>
        </div>
      </div>

      {/* Table */}
      <div className="report-table-container">
        <table className="report-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Medicine</th>
              <th>Quantity</th>
              <th>Amount (PKR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2025-09-01</td>
              <td>Sale</td>
              <td>Paracetamol</td>
              <td>20</td>
              <td>2,000</td>
            </tr>
            <tr>
              <td>2025-09-02</td>
              <td>Donation</td>
              <td>Vitamin C</td>
              <td>15</td>
              <td>Free</td>
            </tr>
            <tr>
              <td>2025-09-05</td>
              <td>Sale</td>
              <td>Amoxicillin</td>
              <td>10</td>
              <td>3,500</td>
            </tr>
            <tr>
              <td>2025-09-07</td>
              <td>Donation</td>
              <td>Cough Syrup</td>
              <td>5</td>
              <td>Free</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
