import React, { useEffect, useState } from "react";
import { getSoldMedicines } from "../api/medicineapi.js";
import "../styles/SoldMedicine.css";
import { toast } from "sonner";

export default function SoldMedicines() {
  const [soldRecords, setSoldRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [totalRevenue, setTotalRevenue] = useState(0);

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
      }));

      setSoldRecords(cleanedData);
      setFiltered(cleanedData);

      const total = cleanedData.reduce(
        (acc, item) => acc + item.quantitySold * item.salePrice,
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

  return (
    <div className="sold-container">
      <div className="sold-header">
        <h1>📦 Sold Medicines</h1>
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search medicine..."
            value={search}
            onChange={handleSearch}
          />
        </div>
      </div>

      <div className="summary-card">
        <p>
          <strong>Total Sold Items:</strong> {soldRecords.length}
        </p>
      </div>

      {loading ? (
        <p className="loading">Loading records...</p>
      ) : filtered.length > 0 ? (
        <div className="sold-table-wrapper">
          <table className="sold-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Qty Sold</th>
                <th>Sale Price</th>
                <th>Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const qty = Number(r.quantitySold) || 0;
                const price = Number(r.salePrice) || 0;
                const total = qty * price;

                return (
                  <tr key={r._id}>
                    <td>{r.name || "-"}</td>
                    <td>{r.category || "-"}</td>
                    <td>{qty}</td>
                    <td>{price.toFixed(2)}</td>
                    <td>{total.toFixed(2)}</td>
                    <td>
                      {r.soldAt ? new Date(r.soldAt).toLocaleString() : "N/A"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-records">No sold records found 😔</p>
      )}
    </div>
  );
}
