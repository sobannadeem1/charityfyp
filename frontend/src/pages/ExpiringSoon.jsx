import React, { useEffect, useState } from "react";
import { getAllMedicines } from "../api/medicineapi";
import "../styles/ExpiringSoon.css";
import { toast } from "sonner";

export default function ExpiringSoon() {
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Helper function to extract units from packSize
  const getUnitsPerPackage = (medicine) => {
    if (!medicine?.packSize) return 1;
    const match = medicine.packSize.match(
      /(\d+)\s*(tablets?|capsules?|ml|vials?|bottles?|sachets?|tubes?|g|grams?|units?)/i
    );
    return match ? parseInt(match[1]) : 1;
  };

  // Calculate total units for a medicine (WITH INTEGER FIX)
  const calculateTotalUnits = (medicine) => {
    const unitsPerPackage = getUnitsPerPackage(medicine);
    const packageQuantity = Math.floor(Number(medicine.quantity)); // Force integer
    return packageQuantity * unitsPerPackage;
  };

  useEffect(() => {
    fetchExpiring();
  }, []);

  const fetchExpiring = async () => {
    try {
      setLoading(true);
      const res = await getAllMedicines();
      const data = Array.isArray(res) ? res : res.data || [];

      const today = new Date();

      // ✅ FIX: Filter only medicines with POSITIVE stock
      const filtered = data.filter((m) => {
        if (!m.expiry) return false;

        // Check if medicine has ACTUAL stock (not sold out)
        const hasStock = Number(m.quantity) > 0;

        const expiry = new Date(m.expiry);
        const diffDays = (expiry - today) / (1000 * 60 * 60 * 24);

        return hasStock && diffDays <= 30 && diffDays >= 0;
      });

      // Enhanced data with unit calculations
      const enhancedData = filtered.map((medicine) => {
        const packageQuantity = Math.floor(Number(medicine.quantity));
        const unitsPerPackage = getUnitsPerPackage(medicine);

        return {
          ...medicine,
          quantity: packageQuantity,
          totalUnits: packageQuantity * unitsPerPackage,
          unitsPerPackage: unitsPerPackage,
        };
      });

      setExpiring(enhancedData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load expiring medicines");
    } finally {
      setLoading(false);
    }
  };

  const filteredList = expiring.filter((m) =>
    m.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Get category emoji
  const getCategoryEmoji = (category) => {
    const emojiMap = {
      Tablet: "💊",
      Capsule: "💊",
      Syrup: "🧴",
      Injection: "💉",
      Cream: "🧴",
      Ointment: "🩹",
      Drops: "💧",
      Inhaler: "🌬️",
      Powder: "🥄",
      Suppository: "🔘",
      Spray: "💨",
      Gel: "🧴",
      Solution: "💧",
      Other: "💊",
    };
    return emojiMap[category] || "💊";
  };

  return (
    <div className="expiring-container">
      <div className="expiring-header">
        <h1>⚠️ Expiring Soon Medicines</h1>
        <div className="header-subtitle">
          <p>Medicines expiring within the next 30 days</p>
        </div>
        <input
          type="text"
          placeholder="🔍 Search by medicine name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="expiring-search"
        />
      </div>

      {/* Summary Cards */}
      <div className="expiring-summary">
        <div className="summary-card critical">
          <div className="summary-icon">🔥</div>
          <div className="summary-content">
            <h3>
              Critical (
              {
                filteredList.filter((m) => {
                  const daysLeft = Math.ceil(
                    (new Date(m.expiry) - new Date()) / (1000 * 60 * 60 * 24)
                  );
                  return daysLeft <= 7;
                }).length
              }
              )
            </h3>
            <p>Expiring in 7 days or less</p>
          </div>
        </div>
        <div className="summary-card warning">
          <div className="summary-icon">⚠️</div>
          <div className="summary-content">
            <h3>
              Warning (
              {
                filteredList.filter((m) => {
                  const daysLeft = Math.ceil(
                    (new Date(m.expiry) - new Date()) / (1000 * 60 * 60 * 24)
                  );
                  return daysLeft > 7 && daysLeft <= 15;
                }).length
              }
              )
            </h3>
            <p>Expiring in 8-15 days</p>
          </div>
        </div>
        <div className="summary-card info">
          <div className="summary-icon">ℹ️</div>
          <div className="summary-content">
            <h3>
              Notice (
              {
                filteredList.filter((m) => {
                  const daysLeft = Math.ceil(
                    (new Date(m.expiry) - new Date()) / (1000 * 60 * 60 * 24)
                  );
                  return daysLeft > 15 && daysLeft <= 30;
                }).length
              }
              )
            </h3>
            <p>Expiring in 16-30 days</p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="loading">Loading medicines...</p>
      ) : filteredList.length > 0 ? (
        <div className="expiring-table-wrapper">
          <table className="expiring-table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Category</th>
                <th>Package Info</th>
                <th>Expiry Date</th>
                <th>Days Left</th>
                <th>Stock</th>
                <th>Manufacturer</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((m) => {
                const expiryDate = new Date(m.expiry);
                const daysLeft = Math.ceil(
                  (expiryDate - new Date()) / (1000 * 60 * 60 * 24)
                );

                let urgencyClass = "";
                if (daysLeft <= 7) urgencyClass = "critical";
                else if (daysLeft <= 15) urgencyClass = "warning";
                else urgencyClass = "info";

                return (
                  <tr key={m._id} className={urgencyClass}>
                    <td className="medicine-cell">
                      <div className="medicine-info">
                        <span className="medicine-emoji">
                          {getCategoryEmoji(m.category)}
                        </span>
                        <div>
                          <div className="medicine-name">{m.name}</div>
                          {m.strength && (
                            <div className="medicine-strength">
                              {m.strength}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="category-badge">{m.category}</span>
                    </td>
                    <td className="package-cell">
                      {m.packSize ? (
                        <div className="package-info">
                          <div className="pack-size">{m.packSize}</div>
                          <div className="unit-info">
                            {m.unitsPerPackage} units/pkg
                          </div>
                        </div>
                      ) : (
                        <span className="no-pack-size">—</span>
                      )}
                    </td>
                    <td className="date-cell">
                      {expiryDate.toLocaleDateString()}
                    </td>
                    <td className="days-cell">
                      <span className={`days-badge ${urgencyClass}`}>
                        {daysLeft > 0 ? `${daysLeft} days` : "Expired"}
                        {daysLeft <= 7 && " 🔥"}
                        {daysLeft > 7 && daysLeft <= 15 && " ⚠️"}
                      </span>
                    </td>
                    <td className="stock-cell">
                      <div className="stock-info">
                        <div className="packages">
                          <span className="stock-label">Packages:</span>
                          <span className="stock-value">{m.quantity}</span>
                        </div>
                        <div className="units">
                          <span className="stock-label">Total Units:</span>
                          <span className="stock-value">{m.totalUnits}</span>
                        </div>
                      </div>
                    </td>
                    <td className="manufacturer-cell">
                      {m.manufacturer || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-records">
          <div className="no-records-icon">🎉</div>
          <h3>No medicines expiring soon!</h3>
          <p>All your medicines are safe for now.</p>
        </div>
      )}
    </div>
  );
}
