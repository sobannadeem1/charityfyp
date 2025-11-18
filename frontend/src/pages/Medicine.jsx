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

  // Helper function to extract units per package
  const getUnitsPerPackage = (medicine) => {
    if (!medicine?.packSize) return 1;

    // Extract number from packSize (e.g., "10 tablets" → 10)
    const match = medicine.packSize.match(
      /(\d+)\s*(tablets?|capsules?|ml|vials?|bottles?|sachets?|tubes?)/i
    );
    return match ? parseInt(match[1]) : 1;
  };

  // Fix the price per unit calculation
  const getPricePerUnit = (medicine) => {
    if (!medicine?.salePrice) return 0;
    const unitsPerPackage = getUnitsPerPackage(medicine);

    // Make sure we don't divide by zero
    if (unitsPerPackage <= 0) return medicine.salePrice;

    return medicine.salePrice / unitsPerPackage;
  };
  // Fix the total calculation
  const calculateTotal = (medicine, quantity, type) => {
    if (!medicine) return 0;

    if (type === "packages") {
      return medicine.salePrice * quantity;
    } else {
      const pricePerUnit = getPricePerUnit(medicine);
      return pricePerUnit * quantity;
    }
  };

  // Fix the sale description
  const getSaleDescription = (medicine, quantity, type) => {
    if (type === "packages") {
      return `${quantity} packages × ${medicine.salePrice}`;
    } else {
      const pricePerUnit = getPricePerUnit(medicine);
      return `${quantity} units × ${pricePerUnit.toFixed(2)}`; // Show 2 decimal places
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
      if (quantityType === "packages") {
        // Selling complete packages
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
        // Selling individual units - SIMPLE FIX
        const unitsPerPackage = getUnitsPerPackage(currentMedicine);
        const totalUnitsAvailable =
          Math.floor(currentMedicine.quantity) * unitsPerPackage;

        if (quantity > totalUnitsAvailable) {
          return toast.error(
            `Not enough units! Only ${totalUnitsAvailable} available.`
          );
        }

        // Sell as individual units (let backend handle package reduction)
        await sellMedicine(currentMedicine._id, quantity, "units");
        toast.success(`Sold ${quantity} units successfully 💊`);
      }

      setSellQuantity("");
      setQuantityType("packages");
      setShowSellPopup(false);
      fetchMedicines();
    } catch (error) {
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
                <th title="Medicine brand/generic name">💊 Name</th>
                <th title="Therapeutic category">📂 Category</th>
                <th title="Dosage form">💊 Type</th>
                <th title="Strength/concentration">⚡ Strength</th>
                <th title="Package quantity">📦 Pack Size</th>
                <th title="Expiration date">📅 Expiry</th>
                <th title="Available stock">🔢 Stock</th>
                {isAdmin && <th title="Cost per unit">🛒 Cost</th>}
                <th title="Price per unit">💵 Price</th>
                <th title="Manufacturing company">🏭 Maker</th>
                <th title="Supply vendor">🚚 Supplier</th>
                <th title="Storage requirements">🌡️ Storage</th>
                <th title="Date added">📥 Added</th>
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
                            color: "#0077b6",
                            fontWeight: "600",
                            textAlign: "center",

                            padding: "0.5rem",
                            borderRadius: "6px",
                          }}
                        >
                          PKR {m.purchasePrice}
                        </td>
                      )}
                      <td>{m.salePrice}</td>
                      <td>{m.manufacturer}</td>
                      <td>{m.supplier}</td>
                      <td>{m.storageCondition}</td>
                      <td>
                        <span className="date-badge">
                          {m.createdAt
                            ? new Date(m.createdAt).toLocaleString("en-US", {
                                hour: "numeric",
                                minute: "numeric",
                                second: "numeric",
                                hour12: true,
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "N/A"}
                        </span>
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
                    placeholder="💊 Medicine Name (e.g., Paracetamol)"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                  <small className="form-hint">
                    💡 Enter brand or generic name
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
                  <small className="form-hint">
                    💡 Choose medicine form type
                  </small>

                  <input
                    name="packSize"
                    placeholder="📦 Contents per Package (e.g., 10 tablets, 100ml)"
                    value={formData.packSize}
                    onChange={handleChange}
                    className="form-input"
                  />
                  <small className="form-hint">
                    💡 What's inside ONE package? (e.g., "10 tablets", "100ml",
                    "5 vials")
                  </small>

                  <input
                    name="dosageForm"
                    placeholder="💊 Dosage Form (e.g., Tablet)"
                    value={formData.dosageForm}
                    onChange={handleChange}
                    className="form-input"
                  />
                  <small className="form-hint">
                    💡 Physical form of medicine
                  </small>

                  <input
                    name="strength"
                    placeholder="⚡ Strength (e.g., 500mg)"
                    value={formData.strength}
                    onChange={handleChange}
                    className="form-input"
                  />
                  <small className="form-hint">
                    💡 Potency or concentration
                  </small>

                  <input
                    type="date"
                    name="expiry"
                    value={formData.expiry}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                  <small className="form-hint">📅 Select expiration date</small>

                  <input
                    type="number"
                    name="quantity"
                    placeholder="🔢 Number of Packages in Stock"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                  <small className="form-hint">
                    💡 How many packages available? (e.g., 50 strips, 25
                    bottles, 10 boxes)
                  </small>

                  <input
                    type="number"
                    name="purchasePrice"
                    placeholder="🛒 Your Cost per Package"
                    value={formData.purchasePrice}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                  <small className="form-hint">
                    💰 What YOU pay suppliers for ONE complete package
                  </small>

                  <input
                    type="number"
                    name="salePrice"
                    placeholder="💰 Your Price per Package"
                    value={formData.salePrice}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                  <small className="form-hint">
                    💵 What CUSTOMERS pay for ONE complete package
                  </small>

                  <input
                    name="manufacturer"
                    placeholder="🏭 Manufacturer Company"
                    value={formData.manufacturer}
                    onChange={handleChange}
                    className="form-input"
                  />
                  <small className="form-hint">
                    💊 Pharmaceutical company name
                  </small>

                  <input
                    name="supplier"
                    placeholder="🚚 Supplier/Vendor Name"
                    value={formData.supplier}
                    onChange={handleChange}
                    className="form-input"
                  />
                  <small className="form-hint">
                    📦 Who supplied this medicine
                  </small>

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
                    🌡️ Required storage conditions
                  </small>

                  <div className="popup-buttons">
                    <button type="submit" className="save-btn">
                      {showEditPopup ? "💾 Update" : "➕ Add"}
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

            {/* Simple Package Information */}
            <div className="package-info">
              <p>
                <strong>📦 Package:</strong>{" "}
                {currentMedicine?.packSize || "N/A"}
              </p>
              <p>
                <strong>💰 Package Price:</strong> PKR{" "}
                {currentMedicine?.salePrice}
              </p>
              <p>
                <strong>💊 Unit Price:</strong> PKR{" "}
                {getPricePerUnit(currentMedicine).toFixed(2)}
              </p>
              <p>
                <strong>🔢 Available:</strong>{" "}
                {Math.floor(currentMedicine?.quantity)} packages (
                {Math.floor(currentMedicine?.quantity) *
                  getUnitsPerPackage(currentMedicine)}{" "}
                units total)
              </p>
            </div>

            {/* Quantity Type Selector */}
            <select
              value={quantityType}
              onChange={(e) => setQuantityType(e.target.value)}
              className="quantity-type-selector"
            >
              <option value="packages">📦 Sell Complete Packages</option>
              <option value="units">💊 Sell Individual Units</option>
            </select>

            <input
              type="number"
              placeholder={
                quantityType === "packages"
                  ? "🔢 Enter number of PACKAGES..."
                  : "💊 Enter number of UNITS..."
              }
              value={sellQuantity}
              onChange={(e) => setSellQuantity(e.target.value)}
              className="input-field"
              min="1"
            />

            <small className="sell-hint">
              {quantityType === "packages"
                ? "💡 Selling complete packages"
                : "💡 Selling individual tablets/capsules"}
            </small>

            {/* Show calculated total */}
            {sellQuantity && (
              <div className="total-calculation">
                <p>
                  💵 Total: PKR{" "}
                  {calculateTotal(
                    currentMedicine,
                    sellQuantity,
                    quantityType
                  ).toFixed(2)}
                  <span className="calculation-details">
                    (
                    {getSaleDescription(
                      currentMedicine,
                      sellQuantity,
                      quantityType
                    )}
                    )
                  </span>
                </p>
              </div>
            )}

            <div className="popup-buttons">
              <button className="save-btn" onClick={confirmSell}>
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
