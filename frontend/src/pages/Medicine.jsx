import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  getAllMedicines,
  addMedicine,
  updateMedicine,
  sellMedicine,
} from "../api/medicineapi";
import "../styles/medicine.css";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Draggable from "react-draggable";

export default function Medicines({ isAdmin }) {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [showSellPopup, setShowSellPopup] = useState(false);
  const [currentMedicine, setCurrentMedicine] = useState(null);
  const [sellQuantity, setSellQuantity] = useState("");
  const [quantityType, setQuantityType] = useState("packages"); // "packages" or "units"
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const itemsPerPage = 10;
  const popupRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    packSize: "",
    dosageForm: "",
    strength: "",
    expiry: "",
    quantity: "",
    purchasePrice: "",
    salePrice: "",
    manufacturer: "",
    supplier: "",
    storageCondition: "Room Temperature",
  });
  //fetvh medicines
  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const res = await getAllMedicines();
      const data = Array.isArray(res) ? res : res.data || [];

      // ⚠️ FRONTEND FIX: Convert all quantities to integers
      const fixedData = data.map((m) => ({
        ...m,
        quantity: Math.floor(Number(m.quantity)), // Force integer
      }));

      setMedicines(fixedData.filter((m) => Number(m.quantity) > 0));
    } catch (error) {
      toast.error("Failed to load medicines");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  const getUnitsPerPackage = (medicine) => {
    if (!medicine?.packSize) return 1;

    console.log("PackSize:", medicine.packSize); // Debug log

    // Extract number from packSize (e.g., "10 tablets" → 10)
    const packSize = medicine.packSize.toString().toLowerCase();

    // Better regex to extract numbers
    const match = packSize.match(/\b(\d+)\b/);

    if (match && match[1]) {
      const units = parseInt(match[1]);
      console.log("Extracted units:", units); // Debug log
      return units;
    }

    console.log("No match found, returning 1"); // Debug log
    return 1;
  };

  const getPricePerUnit = (medicine) => {
    if (!medicine?.salePrice) return 0;
    const unitsPerPackage = getUnitsPerPackage(medicine);

    if (unitsPerPackage <= 0) return medicine.salePrice;

    // Calculate exact unit price: package price ÷ units per package
    return medicine.salePrice / unitsPerPackage;
  };
  const calculateTotal = (medicine, quantity, type) => {
    if (!medicine) return 0;

    if (type === "packages") {
      // Selling complete packages: package price × number of packages
      return medicine.salePrice * quantity;
    } else {
      // Selling individual units: (package price ÷ units per package) × number of units
      const pricePerUnit = getPricePerUnit(medicine);
      return pricePerUnit * quantity;
    }
  };

  const getSaleDescription = (medicine, quantity, type) => {
    if (type === "packages") {
      return `${quantity} packages × PKR ${medicine.salePrice}`;
    } else {
      const pricePerUnit = getPricePerUnit(medicine);
      return `${quantity} units × PKR ${pricePerUnit.toFixed(2)}`;
    }
  };
  // Add medicine
  const handleAddMedicine = async (e) => {
    e.preventDefault();
    try {
      const required = [
        "name",
        "category",
        "expiry",
        "quantity",
        "purchasePrice",
        "salePrice",
      ];
      for (let field of required) {
        if (!formData[field])
          return toast.error(`Please fill the ${field} field`);
      }

      const exists = medicines.find(
        (m) => m.name.toLowerCase() === formData.name.toLowerCase()
      );
      if (exists) return toast.error("Medicine already exists!");

      await addMedicine(formData);
      setShowAddPopup(false);
      setFormData({
        name: "",
        category: "",
        packSize: "",
        dosageForm: "",
        strength: "",
        expiry: "",
        quantity: "",
        purchasePrice: "",
        salePrice: "",
        manufacturer: "",
        supplier: "",
        storageCondition: "Room Temperature",
      });
      fetchMedicines();
      toast.success("Medicine added successfully ✅");
    } catch (error) {
      console.error("Error adding medicine:", error);
      toast.error("Error adding medicine");
    }
  };

  // Edit medicine
  const handleEdit = (medicine) => {
    if (!medicine || !medicine._id) return;

    setSelectedMedicine({ ...medicine, history: medicine.history || [] });
    setFormData({
      name: medicine.name || "",
      category: medicine.category || "",
      packSize: medicine.packSize || "",
      dosageForm: medicine.dosageForm || "",
      strength: medicine.strength || "",
      expiry: medicine.expiry
        ? new Date(medicine.expiry).toISOString().split("T")[0]
        : "",
      quantity: medicine.quantity || "",
      purchasePrice: medicine.purchasePrice || "",
      salePrice: medicine.salePrice || "",
      manufacturer: medicine.manufacturer || "",
      supplier: medicine.supplier || "",
      storageCondition: medicine.storageCondition || "Room Temperature",
    });
    setShowEditPopup(true);
  };

  const handleUpdateMedicine = async (e) => {
    e.preventDefault();
    if (!selectedMedicine?._id)
      return toast.error("No medicine selected for update");

    try {
      const payload = {};
      const allowedFields = [
        "name",
        "category",
        "packSize",
        "dosageForm",
        "strength",
        "expiry",
        "quantity",
        "purchasePrice",
        "salePrice",
        "manufacturer",
        "supplier",
        "storageCondition",
      ];

      allowedFields.forEach((key) => {
        if (formData[key] !== undefined) payload[key] = formData[key];
      });

      if (payload.expiry)
        payload.expiry = new Date(payload.expiry).toISOString();

      const updated = await updateMedicine(selectedMedicine._id, payload);
      setSelectedMedicine(updated);
      setMedicines((prev) =>
        prev.map((m) => (m._id === updated._id ? updated : m))
      );

      setSelectedMedicine(updated);
      toast.success("Medicine updated successfully ✅");
      setShowEditPopup(false);
    } catch (error) {
      console.error("Error updating medicine:", error);
      toast.error(
        error.response?.data?.message || error.message || "Update failed"
      );
    }
  };

  // Sell medicine
  const handleSell = (medicine) => {
    setCurrentMedicine(medicine);
    setSellQuantity("");
    setQuantityType("packages");
    setShowSellPopup(true);
  };

  const confirmSell = async () => {
    const quantity = parseInt(sellQuantity, 10);
    if (!quantity || quantity <= 0) return toast.error("Invalid quantity!");

    try {
      const unitsPerPackage = getUnitsPerPackage(currentMedicine);

      console.log("🔍 STOCK DEBUG - BEFORE SELL:", {
        medicine: currentMedicine.name,
        currentStock: currentMedicine.quantity,
        unitsPerPackage: unitsPerPackage,
        totalUnits: currentMedicine.quantity * unitsPerPackage,
        selling: quantity,
        type: quantityType,
        expectedPackagesToDeduct:
          quantityType === "units" ? quantity / unitsPerPackage : quantity,
        expectedRemaining:
          quantityType === "units"
            ? currentMedicine.quantity - quantity / unitsPerPackage
            : currentMedicine.quantity - quantity,
      });

      if (quantityType === "packages") {
        if (quantity > currentMedicine.quantity) {
          return toast.error(
            `Not enough packages! Only ${Math.floor(
              currentMedicine.quantity
            )} available.`
          );
        }
        await sellMedicine(currentMedicine._id, quantity, "packages");
        toast.success(`Sold ${quantity} packages successfully 💸`);
      } else {
        const totalUnitsAvailable =
          Math.floor(currentMedicine.quantity) * unitsPerPackage;
        if (quantity > totalUnitsAvailable) {
          return toast.error(
            `Not enough units! Only ${totalUnitsAvailable} available.`
          );
        }
        await sellMedicine(currentMedicine._id, quantity, "units");
        toast.success(`Sold ${quantity} units successfully 💊`);
      }

      setSellQuantity("");
      setQuantityType("packages");
      setShowSellPopup(false);
      fetchMedicines();
    } catch (error) {
      console.error("🔴 SELL ERROR:", error);
      toast.error(error.response?.data?.message || "Error selling medicine");
    }
  };

  // Emoji mapping based on medicine category
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

    return emojiMap[category] || "💊"; // Default to pill emoji
  };
  // Search + Pagination
  const filteredMedicines = useMemo(() => {
    return medicines.filter((m) => {
      if (!m) return false;
      const search = searchTerm.toLowerCase();
      return (
        m.name?.toLowerCase().includes(search) ||
        m.category?.toLowerCase().includes(search)
      );
    });
  }, [medicines, searchTerm]);

  const totalPages = Math.ceil(filteredMedicines.length / itemsPerPage);
  const paginatedMedicines = filteredMedicines.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => setCurrentPage(1), [searchTerm]);

  return (
    <div className="medicine-container">
      <div className="header">
        <h1>💊 Medicine Inventory</h1>
        <div className="header-buttons">
          <input
            type="search"
            className="search-box"
            placeholder="Search by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {isAdmin && (
            <div className="button-group">
              <button
                className="add-btn"
                onClick={() => {
                  setFormData({
                    name: "",
                    category: "",
                    packSize: "",
                    dosageForm: "",
                    strength: "",
                    expiry: "",
                    quantity: "",
                    purchasePrice: "",
                    salePrice: "",
                    manufacturer: "",
                    supplier: "",
                    storageCondition: "Room Temperature",
                  });
                  setShowAddPopup(true);
                }}
              >
                + Add Medicine
              </button>
              <button className="sold-btn" onClick={() => navigate("/sold")}>
                View Sold
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <p className="loading">Loading...</p>
      ) : (
        <div className="table-wrapper">
          <table className="medicine-table">
            <thead>
              <tr>
                <th title="Medicine brand/generic name">💊 Medicine Name</th>
                <th title="Therapeutic category">📂 Category</th>
                <th title="Dosage form">💊 Dosage Form</th>
                <th title="Strength/concentration">⚡ Strength</th>
                <th title="Package contents">📦 Pack Size</th>
                <th title="Expiration date">📅 Expiry Date</th>
                <th title="Available packages in stock">🔢 Stock Quantity</th>
                {isAdmin && (
                  <th title="Your cost per package">🛒 Purchase Price</th>
                )}
                <th title="Your price per package">💵 Sale Price</th>
                <th title="Manufacturing company">🏭 Manufacturer</th>
                <th title="Supply vendor">🚚 Supplier</th>
                <th title="Storage requirements">🌡️ Storage Condition</th>
                <th title="Date added">📥 Date Added</th>
                {isAdmin && <th title="Available actions">⚡ Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedMedicines.length > 0 ? (
                paginatedMedicines.filter(Boolean).map((m) => {
                  const isExpired = m.expiry && new Date(m.expiry) < new Date();
                  return (
                    <tr
                      key={m._id}
                      className={isExpired ? "expired-row" : ""}
                      title={isExpired ? "Expired medicine" : ""}
                    >
                      <td>
                        <div className="medicine-name-badge">
                          <span className="medicine-icon">
                            {getCategoryEmoji(m.category)}
                          </span>
                          <span className="medicine-name">{m.name}</span>
                        </div>
                      </td>
                      <td>{m.category}</td>
                      <td>{m.dosageForm}</td>
                      <td>{m.strength}</td>
                      <td>{m.packSize}</td>
                      <td>
                        {m.expiry
                          ? new Date(m.expiry).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="quantity-cell">
                        {Math.floor(m.quantity)}
                      </td>
                      {isAdmin && (
                        <td
                          title="Your purchase cost"
                          style={{
                            textAlign: "center",

                            padding: "0.5rem",
                            borderRadius: "6px",
                          }}
                        >
                          {m.purchasePrice}
                        </td>
                      )}
                      <td>{m.salePrice}</td>
                      <td>{m.manufacturer}</td>
                      <td>{m.supplier}</td>
                      <td>{m.storageCondition}</td>
                      <td>
                        <div className="date-cell">
                          {m.createdAt ? (
                            <>
                              <div className="date-main">
                                {new Date(m.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}
                              </div>
                              <div className="date-time">
                                {new Date(m.createdAt).toLocaleTimeString(
                                  "en-US",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  }
                                )}
                              </div>
                            </>
                          ) : (
                            "N/A"
                          )}
                        </div>
                      </td>
                      <td className="action-btns">
                        {isAdmin && (
                          <>
                            <button
                              className="edit-btn"
                              onClick={() => handleEdit(m)}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              className="sell-btn"
                              onClick={() => handleSell(m)}
                            >
                              💰 Sell
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="14" className="no-data">
                    No medicines found 😶
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn prev"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                ⬅ Prev
              </button>
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="pagination-btn next"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next ➡
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Popup */}
      {(showAddPopup || showEditPopup) && (
        <div className="popup-overlay">
          <Draggable handle=".popup-header" nodeRef={popupRef}>
            <div ref={popupRef} className="popup">
              <div className="popup-header">
                {showEditPopup ? "✏️ Edit Medicine" : "➕ Add New Medicine"}
              </div>
              <div className="popup-content">
                <form
                  onSubmit={
                    showEditPopup ? handleUpdateMedicine : handleAddMedicine
                  }
                  className="form-grid"
                >
                  <input
                    name="name"
                    placeholder="💊 Medicine Name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                  <small className="form-hint">
                    Enter brand or generic name
                  </small>

                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    className="form-select"
                  >
                    <option value="">📂 Select Category</option>
                    <option>Tablet</option>
                    <option>Capsule</option>
                    <option>Syrup</option>
                    <option>Injection</option>
                    <option>Cream</option>
                    <option>Ointment</option>
                    <option>Drops</option>
                    <option>Inhaler</option>
                    <option>Powder</option>
                    <option>Suppository</option>
                    <option>Spray</option>
                    <option>Gel</option>
                    <option>Solution</option>
                    <option>Other</option>
                  </select>
                  <small className="form-hint">Choose medicine category</small>

                  <input
                    name="dosageForm"
                    placeholder="💊 Dosage Form"
                    value={formData.dosageForm}
                    onChange={handleChange}
                    className="form-input"
                  />
                  <small className="form-hint">Physical form of medicine</small>

                  <input
                    name="strength"
                    placeholder="⚡ Strength"
                    value={formData.strength}
                    onChange={handleChange}
                    className="form-input"
                  />
                  <small className="form-hint">
                    Potency or concentration (e.g., 500mg)
                  </small>

                  <input
                    name="packSize"
                    placeholder="📦 Pack Size"
                    value={formData.packSize}
                    onChange={handleChange}
                    className="form-input"
                  />
                  <small className="form-hint">
                    Contents per package (e.g., 10 tablets, 100ml)
                  </small>

                  <input
                    type="date"
                    name="expiry"
                    value={formData.expiry}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                  <small className="form-hint">Select expiration date</small>

                  <input
                    type="number"
                    name="quantity"
                    placeholder="🔢 Stock Quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    onWheel={(e) => e.target.blur()}
                    required
                    className="form-input"
                  />
                  <small className="form-hint">
                    Number of packages available
                  </small>

                  <input
                    type="number"
                    name="purchasePrice"
                    placeholder="🛒 Purchase Price"
                    value={formData.purchasePrice}
                    onChange={handleChange}
                    required
                    onWheel={(e) => e.target.blur()}
                    className="form-input"
                  />
                  <small className="form-hint">Your cost per package</small>

                  <input
                    type="number"
                    name="salePrice"
                    placeholder="💵 Sale Price"
                    value={formData.salePrice}
                    onChange={handleChange}
                    required
                    onWheel={(e) => e.target.blur()}
                    className="form-input"
                  />
                  <small className="form-hint">Your price per package</small>

                  <input
                    name="manufacturer"
                    placeholder="🏭 Manufacturer"
                    value={formData.manufacturer}
                    onChange={handleChange}
                    className="form-input"
                  />
                  <small className="form-hint">
                    Pharmaceutical company name
                  </small>

                  <input
                    name="supplier"
                    placeholder="🚚 Supplier"
                    value={formData.supplier}
                    onChange={handleChange}
                    className="form-input"
                  />
                  <small className="form-hint">Vendor or supplier name</small>

                  <select
                    name="storageCondition"
                    value={formData.storageCondition}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option>Room Temperature</option>
                    <option>Refrigerated</option>
                    <option>Cool & Dry Place</option>
                    <option>Other</option>
                  </select>
                  <small className="form-hint">
                    Required storage conditions
                  </small>

                  <div className="popup-buttons">
                    <button type="submit" className="save-btn">
                      {showEditPopup ? "💾 Update Medicine" : "➕ Add Medicine"}
                    </button>
                    <button
                      type="button"
                      className="cancel-btn"
                      onClick={() => {
                        setShowAddPopup(false);
                        setShowEditPopup(false);
                      }}
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </form>
                {/* EDIT HISTORY SECTION - ADD THIS BACK */}
                {showEditPopup && selectedMedicine?.history?.length > 0 && (
                  <div className="edit-history">
                    <h4>📝 Edit History</h4>
                    <div className="history-table-container">
                      <table className="history-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>🕐 Updated At</th>
                            <th>📝 Field</th>
                            <th>📤 Old Value</th>
                            <th>📥 New Value</th>
                            <th>🔄 Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedMedicine.history
                            .slice()
                            .reverse()
                            .map((historyItem, historyIndex) => (
                              <React.Fragment
                                key={historyItem._id || historyIndex}
                              >
                                {Object.entries(historyItem.changes || {}).map(
                                  ([field, change], changeIndex) => {
                                    // Helper functions for formatting
                                    const formatFieldName = (field) => {
                                      const fieldNames = {
                                        name: "Medicine Name",
                                        category: "Category",
                                        packSize: "Pack Size",
                                        dosageForm: "Dosage Form",
                                        strength: "Strength",
                                        expiry: "Expiry Date",
                                        quantity: "Quantity",
                                        purchasePrice: "Purchase Price",
                                        salePrice: "Sale Price",
                                        manufacturer: "Manufacturer",
                                        supplier: "Supplier",
                                        storageCondition: "Storage Condition",
                                      };
                                      return fieldNames[field] || field;
                                    };

                                    const formatHistoryValue = (
                                      value,
                                      fieldName = ""
                                    ) => {
                                      if (
                                        value === null ||
                                        value === undefined ||
                                        value === ""
                                      )
                                        return "—";

                                      // Handle dates
                                      if (
                                        fieldName === "expiry" ||
                                        (typeof value === "string" &&
                                          value.includes("T"))
                                      ) {
                                        try {
                                          return new Date(
                                            value
                                          ).toLocaleDateString();
                                        } catch {
                                          return String(value);
                                        }
                                      }

                                      // Handle prices
                                      if (
                                        ["purchasePrice", "salePrice"].includes(
                                          fieldName
                                        )
                                      ) {
                                        return `PKR ${Number(
                                          value
                                        ).toLocaleString()}`;
                                      }

                                      // Handle numbers
                                      if (typeof value === "number") {
                                        return value.toLocaleString();
                                      }

                                      return String(value);
                                    };

                                    const getChangeType = (oldVal, newVal) => {
                                      if (
                                        oldVal === null ||
                                        oldVal === "" ||
                                        oldVal === undefined
                                      )
                                        return "added";
                                      if (
                                        newVal === null ||
                                        newVal === "" ||
                                        newVal === undefined
                                      )
                                        return "removed";

                                      if (
                                        typeof oldVal === "number" &&
                                        typeof newVal === "number"
                                      ) {
                                        if (newVal > oldVal) return "increased";
                                        if (newVal < oldVal) return "decreased";
                                      }

                                      return "modified";
                                    };

                                    const changeType = getChangeType(
                                      change.from,
                                      change.to
                                    );

                                    return (
                                      <tr
                                        key={`${historyIndex}-${changeIndex}`}
                                        className="change-row"
                                      >
                                        <td className="serial-number">
                                          {historyIndex + 1}.{changeIndex + 1}
                                        </td>
                                        <td className="timestamp">
                                          {changeIndex === 0 ? (
                                            <div>
                                              <div className="date">
                                                {new Date(
                                                  historyItem.updatedAt
                                                ).toLocaleDateString()}
                                              </div>
                                              <div className="time">
                                                {new Date(
                                                  historyItem.updatedAt
                                                ).toLocaleTimeString()}
                                              </div>
                                            </div>
                                          ) : (
                                            <span className="same-session">
                                              Same session
                                            </span>
                                          )}
                                        </td>
                                        <td className="field-cell">
                                          <span className="field-badge">
                                            {formatFieldName(field)}
                                          </span>
                                        </td>
                                        <td className="old-value-cell">
                                          <span className="old-value">
                                            {formatHistoryValue(
                                              change.from,
                                              field
                                            )}
                                          </span>
                                        </td>
                                        <td className="new-value-cell">
                                          <span className="new-value">
                                            {formatHistoryValue(
                                              change.to,
                                              field
                                            )}
                                          </span>
                                        </td>
                                        <td className="change-type-cell">
                                          <span
                                            className={`change-badge ${changeType}`}
                                          >
                                            {changeType.toUpperCase()}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  }
                                )}
                              </React.Fragment>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Draggable>
        </div>
      )}

      {showSellPopup && (
        <div className="popup-overlay">
          <div className="popup">
            <h2>💰 Sell {currentMedicine?.name}</h2>

            {/* Enhanced Package Information with Stock Change Awareness */}
            <div className="package-info">
              <p>
                <strong>📦 Package Contents:</strong>{" "}
                {currentMedicine?.packSize || "N/A"}
              </p>
              <p>
                <strong>💰 Price per Package:</strong> PKR{" "}
                {currentMedicine?.salePrice}
              </p>
              <p>
                <strong>💊 Price per Unit:</strong> PKR{" "}
                {getPricePerUnit(currentMedicine).toFixed(2)}
              </p>
              <p>
                <strong>🔢 Units per Package:</strong>{" "}
                {getUnitsPerPackage(currentMedicine)} units
              </p>

              {/* Enhanced Stock Display */}
              <div className="stock-summary">
                <p>
                  <strong>📊 Available Stock:</strong>
                </p>
                <div className="stock-details">
                  <div className="stock-item">
                    <span className="stock-label">Packages:</span>
                    <span className="stock-value">
                      {Math.floor(currentMedicine?.quantity)}
                    </span>
                  </div>
                  <div className="stock-item">
                    <span className="stock-label">Individual Units:</span>
                    <span className="stock-value">
                      {Math.floor(currentMedicine?.quantity) *
                        getUnitsPerPackage(currentMedicine)}
                    </span>
                  </div>
                  <div className="stock-item">
                    <span className="stock-label">Total Value:</span>
                    <span className="stock-value">
                      PKR{" "}
                      {(
                        currentMedicine?.quantity * currentMedicine?.salePrice
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <p>
                <small style={{ color: "#666", fontStyle: "italic" }}>
                  💡 When you edit stock quantity, both packages and individual
                  units update automatically
                </small>
              </p>
            </div>

            {/* Conditional Quantity Type Selector */}
            {currentMedicine?.category === "Tablet" ||
            currentMedicine?.category === "Capsule" ||
            currentMedicine?.category === "Injection" ? (
              <select
                value={quantityType}
                onChange={(e) => {
                  setQuantityType(e.target.value);
                  setSellQuantity("");
                }}
                className="quantity-type-selector"
              >
                <option value="packages">📦 Sell Complete Packages</option>
                <option value="units">💊 Sell Individual Units</option>
              </select>
            ) : (
              <div className="quantity-type-info">
                <p>
                  📦 Selling complete packages only for{" "}
                  {currentMedicine?.category}
                </p>
              </div>
            )}

            <input
              type="number"
              onWheel={(e) => e.target.blur()}
              placeholder={
                quantityType === "packages"
                  ? `Enter number of PACKAGES (max: ${Math.floor(
                      currentMedicine?.quantity
                    )})`
                  : `Enter number of UNITS (max: ${
                      Math.floor(currentMedicine?.quantity) *
                      getUnitsPerPackage(currentMedicine)
                    })`
              }
              value={sellQuantity}
              onChange={(e) => setSellQuantity(e.target.value)}
              className="input-field"
              min="1"
              max={
                quantityType === "packages"
                  ? Math.floor(currentMedicine?.quantity)
                  : Math.floor(currentMedicine?.quantity) *
                    getUnitsPerPackage(currentMedicine)
              }
            />

            {sellQuantity && parseInt(sellQuantity) > 0 && (
              <div className="total-calculation">
                <p>
                  <strong>
                    💵 Total Amount: PKR{" "}
                    {calculateTotal(
                      currentMedicine,
                      parseInt(sellQuantity),
                      quantityType
                    ).toFixed(2)}
                  </strong>
                </p>

                {quantityType === "packages" ? (
                  <p className="calculation-breakdown">
                    {sellQuantity} packages × PKR {currentMedicine?.salePrice} =
                    PKR{" "}
                    {calculateTotal(
                      currentMedicine,
                      parseInt(sellQuantity),
                      quantityType
                    ).toFixed(2)}
                  </p>
                ) : (
                  <div className="calculation-breakdown">
                    <p>
                      Unit Price: PKR {currentMedicine?.salePrice} ÷{" "}
                      {getUnitsPerPackage(currentMedicine)} units = PKR{" "}
                      {getPricePerUnit(currentMedicine).toFixed(2)} per unit
                    </p>
                    <p>
                      Final: {sellQuantity} units × PKR{" "}
                      {getPricePerUnit(currentMedicine).toFixed(2)} = PKR{" "}
                      {calculateTotal(
                        currentMedicine,
                        parseInt(sellQuantity),
                        quantityType
                      ).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="popup-buttons">
              <button
                className="save-btn"
                onClick={confirmSell}
                disabled={!sellQuantity || parseInt(sellQuantity) <= 0}
              >
                ✅ Confirm Sell
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowSellPopup(false);
                  setSellQuantity("");
                  setQuantityType("packages");
                }}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
