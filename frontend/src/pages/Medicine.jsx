import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  getMedicinesWithPagination,
  addMedicine,
  updateMedicine,
  sellMedicine,
  deleteMedicine,
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
  const [quantityType, setQuantityType] = useState("packages");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const itemsPerPage = 10;
  const popupRef = useRef(null);
  const sellPopupRef = useRef(null);
  const [sortOption, setSortOption] = useState("date-newest");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterExpiryMonth, setFilterExpiryMonth] = useState("all");
  const [filterStockStatus, setFilterStockStatus] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkSellPopup, setShowBulkSellPopup] = useState(false);
  // Add this new state (put it with your other useState declarations)
const [bulkSellData, setBulkSellData] = useState({}); // { medicineId: { quantity: "", type: "packages" } }
  const searchTimeoutRef = useRef(null);
const abortControllerRef = useRef(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    packSize: "",
    strength: "",
    expiry: "",
    quantity: "",
    purchasePrice: "",
    salePrice: "",
    manufacturer: "",
    supplier: "",
    storageCondition: "Room Temperature",
  });
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    showConfirmation(
      "Delete Multiple Medicines",
      `Are you sure you want to delete ${selectedIds.size} selected medicines? This cannot be undone.`,
      async () => {
        try {
          setIsSubmitting(true);
          const promises = Array.from(selectedIds).map((id) =>
            deleteMedicine(id)
          );
          await Promise.all(promises);

          toast.success(`Deleted ${selectedIds.size} medicines successfully`);
          setSelectedIds(new Set());
          setSelectAll(false);
          fetchMedicines(currentPage, searchTerm);
        } catch (error) {
          console.error("Bulk delete error:", error);
          toast.error("Some items could not be deleted");
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };
 const handleBulkSell = async () => {
  const selectedMedicines = displayedMedicines.filter((m) =>
    selectedIds.has(m._id)
  );

  const invalid = selectedMedicines.filter(
    (m) => !bulkSellData[m._id]?.quantity || parseInt(bulkSellData[m._id].quantity) <= 0
  );

  if (invalid.length > 0) {
    return toast.error("Please enter valid quantity for all selected medicines");
  }

  try {
    setIsSubmitting(true);
    const promises = selectedMedicines.map((m) => {
      const { quantity, type = "packages" } = bulkSellData[m._id] || {};
      const qty = parseInt(quantity);

      if (type === "packages" && qty > m.quantity) {
        throw new Error(`Not enough packages for ${m.name}`);
      }
      if (type === "units") {
        const totalUnits = m.quantity * getUnitsPerPackage(m);
        if (qty > totalUnits) {
          throw new Error(`Not enough units for ${m.name}`);
        }
      }

      return sellMedicine(m._id, qty, type);
    });

    await Promise.all(promises);
   // SUCCESS!
    toast.success(`Successfully sold ${selectedMedicines.length} medicines!`);

    // CLEAR ALL BULK DATA
    setSelectedIds(new Set());
    setSelectAll(false);
    setShowBulkSellPopup(false);
    setBulkSellData({});

    // REFRESH INVENTORY
    fetchMedicines(currentPage);

    // THIS LINE: Navigate to /sold page
    navigate("/sold");
  } catch (error) {
    toast.error(error.message || "Bulk sell failed");
    console.error(error);
  } finally {
    setIsSubmitting(false);
  }
};
  // Click outside handlers (keep as is)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (e.target.classList.contains("popup-overlay") && !isSubmitting) {
        setShowAddPopup(false);
        setShowEditPopup(false);
        setShowSellPopup(false);
        setSellQuantity("");
        setQuantityType("packages");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAddPopup, showEditPopup, showSellPopup, isSubmitting]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target) &&
        (showAddPopup || showEditPopup || showSellPopup)
      ) {
        if (!isSubmitting) {
          setShowAddPopup(false);
          setShowEditPopup(false);
          setShowSellPopup(false);
          setSellQuantity("");
          setQuantityType("packages");
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAddPopup, showEditPopup, showSellPopup, isSubmitting]);

const fetchMedicines = async (page = 1) => {
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }
  const controller = new AbortController();
  abortControllerRef.current = controller;

  try {
    setLoading(true);

    const response = await getMedicinesWithPagination({
      page,
      limit: itemsPerPage,
      search: searchTerm,
      category: filterCategory === "all" ? "" : filterCategory,
      expiryMonth: filterExpiryMonth === "all" ? "" : filterExpiryMonth,
      stockStatus: filterStockStatus === "all" ? "" : filterStockStatus,
      sortBy: sortOption,
      signal: controller.signal,
    });

    if (!controller.signal.aborted) {
      const data = response.data || [];
      const fixedData = data.map(m => ({
        ...m,
        quantity: Math.floor(Number(m.quantity)),
      })).filter(m => Number(m.quantity) > 0);

      setMedicines(fixedData);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalRecords(response.pagination?.totalMedicines || 0);
      setCurrentPage(response.pagination?.currentPage || page);
      setIsSearching(!!searchTerm.trim());
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      toast.error("Failed to load medicines");
    }
  } finally {
    if (!controller.signal.aborted) setLoading(false);
  }
};

const resetFilters = () => {
  setSortOption("date-newest");
  setFilterCategory("all");
  setFilterExpiryMonth("all");
  setFilterStockStatus("all");
  setCurrentPage(1);
  fetchMedicines(1);
};
  // === Get unique values for dropdowns ===
  const categories = [
    ...new Set(medicines.map((m) => m.category).filter(Boolean)),
  ];

  const expiryMonths = [
    ...new Set(
      medicines
        .filter((m) => m.expiry)
        .map((m) => {
          const d = new Date(m.expiry);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
            2,
            "0"
          )}`;
        })
    ),
  ].sort((a, b) => b.localeCompare(a)); // newest first
 const displayedMedicines = useMemo(() => {
  let list = [...medicines];

  // Only keep client-side sorting (fast & safe)
  list.sort((a, b) => {
    switch (sortOption) {
      case "name-asc": return a.name.localeCompare(b.name);
      case "name-desc": return b.name.localeCompare(a.name);
      case "price-low": return a.salePrice - b.salePrice;
      case "price-high": return b.salePrice - b.salePrice;
      case "quantity-low": return a.quantity - b.quantity;
      case "quantity-high": return b.quantity - a.quantity;
      case "expiry-soon": return new Date(a.expiry || "9999") - new Date(b.expiry || "9999");
      case "date-newest": return new Date(b.createdAt) - new Date(a.createdAt);
      default: return 0;
    }
  });

  return list;
}, [medicines, sortOption]);
useEffect(() => {
  setCurrentPage(1);
  fetchMedicines(1);
}, [searchTerm, filterCategory, filterExpiryMonth, filterStockStatus, sortOption]);
 useEffect(() => {
  fetchMedicines(currentPage);
}, [currentPage]);
useEffect(() => {
  return () => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();
  };
}, []);

 const handleSearch = (e) => {
  const val = e.target.value;
  setSearchTerm(val);
  // Remove timeout completely — let useEffect above handle it
};

 const clearSearch = () => {
  setSearchTerm("");
  setCurrentPage(1);
  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  if (abortControllerRef.current) abortControllerRef.current.abort();
  fetchMedicines(1);
};

  // ✅ Pagination controls
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Keep all your existing helper functions (unchanged)
  const showConfirmation = (title, message, confirmCallback) => {
    // ... keep existing implementation
    const toastId = toast.custom(
      (t) => (
        <div
          style={{
            background: "white",
            padding: "16px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            border: "2px solid #e2e8f0",
            minWidth: "300px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <span style={{ fontSize: "20px", marginRight: "8px" }}>🗑️</span>
            <h3
              style={{
                margin: 0,
                color: "#1f2937",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              {title}
            </h3>
          </div>
          <p
            style={{
              margin: "0 0 16px 0",
              color: "#4b5563",
              fontSize: "14px",
              lineHeight: "1.4",
            }}
          >
            {message}
          </p>
          <div
            style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}
          >
            <button
              onClick={() => {
                toast.dismiss(t);
              }}
              style={{
                padding: "8px 16px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                background: "white",
                color: "#374151",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                confirmCallback();
                toast.dismiss(t);
              }}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: "6px",
                background: "#ef4444",
                color: "white",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ),
      { duration: Infinity }
    );
  };

  const handleDelete = async (medicine) => {
    if (!medicine?._id) return;

    if (isSubmitting) {
      toast.info("Please wait, another operation in progress...");
      return;
    }

    showConfirmation(
      "Delete Medicine",
      `Are you sure you want to delete "${medicine.name}"? This action cannot be undone.`,
      async () => {
        try {
          setIsSubmitting(true);
          await deleteMedicine(medicine._id);
          toast.success("Medicine deleted successfully 🗑️");
          fetchMedicines(currentPage, searchTerm); // ✅ UPDATED: Refresh current page
        } catch (error) {
          console.error("Error deleting medicine:", error);
          toast.error(
            error.response?.data?.message || "Error deleting medicine"
          );
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  const getUnitsPerPackage = (medicine) => {
    if (!medicine?.packSize) return 1;
    const packSize = medicine.packSize.toString().toLowerCase();
    const match = packSize.match(/\b(\d+)\b/);
    return match ? parseInt(match[1]) : 1;
  };

  const getPricePerUnit = (medicine) => {
    if (!medicine?.salePrice) return 0;
    const unitsPerPackage = getUnitsPerPackage(medicine);
    return unitsPerPackage <= 0
      ? medicine.salePrice
      : medicine.salePrice / unitsPerPackage;
  };

  const calculateTotal = (medicine, quantity, type) => {
    if (!medicine) return 0;
    if (type === "packages") {
      return medicine.salePrice * quantity;
    } else {
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

    if (isSubmitting) {
      toast.info("Please wait, submission in progress...");
      return;
    }

    try {
      setIsSubmitting(true);

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

      // Check if medicine exists (you might want to keep this client-side check)
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
        strength: "",
        expiry: "",
        quantity: "",
        purchasePrice: "",
        salePrice: "",
        manufacturer: "",
        supplier: "",
        storageCondition: "Room Temperature",
      });
      fetchMedicines(currentPage, searchTerm); // ✅ UPDATED: Refresh current view
      toast.success("Medicine added successfully ✅");
    } catch (error) {
      console.error("Error adding medicine:", error);
      toast.error("Error adding medicine");
    } finally {
      setIsSubmitting(false);
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

    if (isSubmitting) {
      toast.info("Please wait, another operation in progress...");
      return;
    }

    if (!selectedMedicine?._id)
      return toast.error("No medicine selected for update");

    try {
      setIsSubmitting(true);

      const payload = {};
      const allowedFields = [
        "name",
        "category",
        "packSize",
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

      // ✅ UPDATED: Refresh the current view instead of local state update
      fetchMedicines(currentPage, searchTerm);

      toast.success("Medicine updated successfully ✅");
      setShowEditPopup(false);
    } catch (error) {
      console.error("Error updating medicine:", error);
      toast.error(
        error.response?.data?.message || error.message || "Update failed"
      );
    } finally {
      setIsSubmitting(false);
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

  if (isSubmitting) {
    toast.info("Please wait, processing...");
    return;
  }

  try {
    setIsSubmitting(true);

    const unitsPerPackage = getUnitsPerPackage(currentMedicine);

    let soldAmount, soldType, soldUnitLabel;

    if (quantityType === "packages") {
      if (quantity > currentMedicine.quantity) {
        toast.error(`Only ${Math.floor(currentMedicine.quantity)} package(s) in stock!`);
        return;
      }
      await sellMedicine(currentMedicine._id, quantity, "packages");
      soldAmount = quantity;
      soldType = "packages";
      soldUnitLabel = quantity === 1 ? "package" : "packages";
    } else {
      const totalUnits = Math.floor(currentMedicine.quantity) * unitsPerPackage;
      if (quantity > totalUnits) {
        toast.error(`Only ${totalUnits} unit(s) available!`);
        return;
      }
      await sellMedicine(currentMedicine._id, quantity, "units");
      soldAmount = quantity;
      soldType = "units";
      soldUnitLabel = quantity === 1 ? "unit" : "units";
    }

    // Success + redirect
    toast.success(`Sold ${soldAmount} ${soldUnitLabel} successfully!`);

    // Cleanup
    setSellQuantity("");
    setQuantityType("packages");
    setShowSellPopup(false);

    // INSTANT REDIRECT
    navigate("/sold");

  } catch (error) {
    console.error("SELL ERROR:", error);
    toast.error(error.response?.data?.message || "Failed to sell medicine");
  } finally {
    setIsSubmitting(false);
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

    return emojiMap[category] || "💊";
  };

  return (
    <div className="medicine-container">
      <div className="header">
        <h1>💊 Medicine Inventory</h1>
        <div className="header-controls">
          <div className="search-box">
            <input
              type="search"
              placeholder="🔍 Search medicine..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>

          {isAdmin && (
            <div className="button-group">
              <button
                className="add-btn"
                onClick={() => {
                  setFormData({
                    name: "",
                    category: "",
                    packSize: "",
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

      <div className="filter-sort-bar">
        <div className="filter-group">
          {/* Sort */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="filter-select"
          >
            <option value="name-asc">Name (A → Z)</option>
            <option value="name-desc">Name (Z → A)</option>
            <option value="price-low">Price: Low → High</option>
            <option value="price-high">Price: High → Low</option>
            <option value="quantity-low">Stock: Low → High</option>
            <option value="quantity-high">Stock: High → Low</option>
            <option value="expiry-soon">Expiry: Soonest First</option>
            <option value="date-newest">Newest First</option>
          </select>

          {/* Category */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {getCategoryEmoji(cat)} {cat}
              </option>
            ))}
          </select>

          {/* Expiry Month */}
          <select
            value={filterExpiryMonth}
            onChange={(e) => setFilterExpiryMonth(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Expiry Dates</option>
            {expiryMonths.map((date) => {
              const [y, m] = date.split("-");
              const monthName = new Date(y, m - 1).toLocaleString("default", {
                month: "long",
              });
              return (
                <option key={date} value={date}>
                  {monthName} {y}
                </option>
              );
            })}
          </select>

          {/* Stock Status */}
          <select
            value={filterStockStatus}
            onChange={(e) => setFilterStockStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Stock</option>
            <option value="low">Low Stock (less than or equal to 5)</option>
            <option value="expired">Expired Only</option>
          </select>
        </div>

        <button onClick={resetFilters} className="reset-filters-btn">
          Reset Filters
        </button>
      </div>

      {loading ? (
        <div className="loader-container">
          <div className="spinner"></div>
        </div>
      ) : displayedMedicines.length > 0 ? (
        <>
          <div className="table-wrapper">
            {/* BULK ACTION BAR - Shows when items selected */}
            {selectedIds.size > 0 && (
              <div className="bulk-action-bar">
                <div className="bulk-info">
                  <strong>{selectedIds.size}</strong> medicine
                  {selectedIds.size > 1 ? "s" : ""} selected
                </div>
                <div className="bulk-buttons">
                  <button
                    className="bulk-sell-btn"
                    onClick={() => setShowBulkSellPopup(true)}
                  >
                    Sell Selected
                  </button>
                  <button
                    className="bulk-delete-btn"
                    onClick={handleBulkDelete}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Deleting..." : "Delete Selected"}
                  </button>
                  <button
                    className="bulk-cancel-btn"
                    onClick={() => {
                      setSelectedIds(new Set());
                      setSelectAll(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <table className="medicine-table">
              <thead>
                <tr>
                  {isAdmin && (
                    <th style={{ width: "50px" }}>
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectAll(checked);
                          if (checked) {
                            setSelectedIds(
                              new Set(displayedMedicines.map((m) => m._id))
                            );
                          } else {
                            setSelectedIds(new Set());
                          }
                        }}
                        title="Select all on this page"
                      />
                    </th>
                  )}
                  <th>Medicine Name</th>
                  <th>Category</th>
                  <th>Strength</th>
                  <th>Pack Size</th>
                  <th>Expiry Date</th>
                  <th>Stock Quantity</th>
                  {isAdmin && <th>Purchase Price</th>}
                  <th>Sale Price</th>
                  <th>Manufacturer</th>
                  <th>Supplier</th>
                  <th>Storage Condition</th>
                  <th>Date Added</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {displayedMedicines.map((m) => {
                  const isExpired = m.expiry && new Date(m.expiry) < new Date();
                  const isLowStock = m.quantity <= 5;
                  const isSelected = selectedIds.has(m._id);

                  return (
                    <tr
                      key={m._id}
                      className={`${isExpired ? "expired-row" : ""} ${
                        isLowStock && !isExpired ? "low-stock-row" : ""
                      }`}
                      title={
                        isExpired
                          ? "Expired medicine"
                          : isLowStock
                          ? "Low stock"
                          : ""
                      }
                    >
                      {isAdmin && (
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(m._id)}
                            onChange={() => {
                              const newSelected = new Set(selectedIds);
                              if (selectedIds.has(m._id)) {
                                newSelected.delete(m._id);
                              } else {
                                newSelected.add(m._id);
                              }
                              setSelectedIds(newSelected);
                              setSelectAll(
                                newSelected.size === displayedMedicines.length
                              );
                            }}
                          />
                        </td>
                      )}
                      <td>
                        <div className="medicine-name-badge">
                          <span className="medicine-icon">
                            {getCategoryEmoji(m.category)}
                          </span>
                          <span className="medicine-name">{m.name}</span>
                        </div>
                      </td>
                      <td>{m.category || "-"}</td>
                      <td>{m.strength || "-"}</td>
                      <td>{m.packSize || "-"}</td>
                      <td>
                        {m.expiry
                          ? new Date(m.expiry).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "N/A"}
                      </td>
                      <td
                        className={`quantity-cell ${
                          isLowStock ? "low-stock" : ""
                        }`}
                      >
                        <span
                          style={{
                            fontWeight: "bold",
                            fontSize: "1.15em",
                            color: "#111827",
                          }}
                        >
                          {Math.floor(m.quantity)}
                        </span>
                        {isLowStock && !isExpired && (
                          <span
                            style={{
                              color: "#d97706",
                              fontWeight: "600",
                              fontSize: "0.9em",
                              marginLeft: "8px",
                              background: "#fffbeb",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              border: "1px solid #fcd34d",
                            }}
                          >
                            Low Stock
                          </span>
                        )}
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
                          {m.purchasePrice !== undefined
                            ? m.purchasePrice
                            : "-"}
                        </td>
                      )}
                      <td>{m.salePrice || "-"}</td>
                      <td>{m.manufacturer || "-"}</td>
                      <td>{m.supplier || "-"}</td>
                      <td>{m.storageCondition || "-"}</td>
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
                      {isAdmin && (
                        <td className="action-btns">
                          <button
                            className="edit-btn"
                            onClick={() => handleEdit(m)}
                            disabled={isSubmitting}
                            title="Edit medicine"
                          >
                            {isSubmitting ? "Processing..." : "Edit"}
                          </button>
                          <button
                            className="sell-btn"
                            onClick={() => handleSell(m)}
                            disabled={isSubmitting}
                            title="Sell medicine"
                          >
                            {isSubmitting ? "Processing..." : "Sell"}
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(m)}
                            disabled={isSubmitting}
                            title="  Delete medicine"
                          >
                            {isSubmitting ? "Processing..." : "Delete"}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination - Same beautiful style */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-btn prev-next"
              >
                ←
              </button>

              <div className="page-numbers">
                {currentPage > 3 && (
                  <button onClick={() => goToPage(1)} className="page-number">
                    1
                  </button>
                )}
                {currentPage > 4 && <span className="page-ellipsis">...</span>}

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => Math.abs(page - currentPage) <= 2)
                  .map((page) => (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`page-number ${
                        page === currentPage ? "active" : ""
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                {currentPage < totalPages - 3 && (
                  <span className="page-ellipsis">...</span>
                )}
                {currentPage < totalPages - 2 && (
                  <button
                    onClick={() => goToPage(totalPages)}
                    className="page-number"
                  >
                    {totalPages}
                  </button>
                )}
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="pagination-btn prev-next"
              >
                →
              </button>
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 1.5rem",
            background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
            borderRadius: "1rem",
            margin: "3rem auto",
            maxWidth: "540px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            border: "1px solid #e2e8f420",
          }}
        >
          {/* Modern empty state icon */}
          <div
            style={{
              fontSize: "4.5rem",
              marginBottom: "1.5rem",
              opacity: 0.6,
            }}
          >
            No results
          </div>

          <h3
            style={{
              fontSize: "1.75rem",
              fontWeight: "600",
              color: "#1e293b",
              margin: "0 0 1rem 0",
              lineHeight: "1.3",
            }}
          >
            No {isSearching ? "matching" : ""} medicines found
            {(filterCategory !== "all" ||
              filterExpiryMonth !== "all" ||
              filterStockStatus !== "all") && (
              <span style={{ color: "#64748b", fontWeight: "normal" }}>
                {" "}
                for current filters
              </span>
            )}
          </h3>

          <p
            style={{
              fontSize: "1.1rem",
              color: "#64748b",
              margin: "0 0 2rem 0",
              lineHeight: "1.6",
            }}
          >
            {isSearching
              ? `No results for "${searchTerm}".`
              : "Try adjusting your search or filters."}
          </p>

          {(isSearching ||
            filterCategory !== "all" ||
            filterExpiryMonth !== "all" ||
            filterStockStatus !== "all") && (
            <button
              onClick={() => {
                clearSearch();
                resetFilters();
              }}
              style={{
                padding: "0.85rem 2rem",
                fontSize: "1rem",
                fontWeight: "600",
                color: "white",
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                border: "none",
                borderRadius: "0.75rem",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(59,130,246,0.35)",
                transition: "all 0.25s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow =
                  "0 10px 24px rgba(59,130,246,0.45)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 14px rgba(59,130,246,0.35)";
              }}
            >
              Clear All Filters & Search
            </button>
          )}
        </div>
      )}

      {/* Keep all your existing popup code exactly as is */}
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
                    <button
                      type="submit"
                      className="save-btn"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? "⏳ Processing..."
                        : showEditPopup
                        ? "💾 Update Medicine"
                        : "➕ Add Medicine"}
                    </button>
                    <button
                      type="button"
                      className="cancel-btn"
                      onClick={() => {
                        setShowAddPopup(false);
                        setShowEditPopup(false);
                      }}
                      disabled={isSubmitting}
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
                                                ).toLocaleTimeString("en-US", {
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                  hour12: true,
                                                })}
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
          <div className="popup" ref={sellPopupRef}>
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

            {/* For the sell popup */}
            <div className="popup-buttons">
              <button
                className="save-btn"
                onClick={confirmSell}
                disabled={
                  !sellQuantity || parseInt(sellQuantity) <= 0 || isSubmitting
                }
              >
                {isSubmitting ? "⏳ Processing..." : "✅ Confirm Sell"}
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowSellPopup(false);
                  setSellQuantity("");
                  setQuantityType("packages");
                }}
                disabled={isSubmitting}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    {showBulkSellPopup && (
  <div className="popup-overlay">
    <div className="popup bulk-sell-popup modern-bulk-sell">
      <h2>
        Bulk Sell ({selectedIds.size}) Medicine{selectedIds.size > 1 ? "s" : ""}
      </h2>

      <div className="bulk-medicines-scroll">
        {displayedMedicines
          .filter((m) => selectedIds.has(m._id))
          .map((medicine) => {
            const unitsPerPack = getUnitsPerPackage(medicine);
            const canSellUnits = ["Tablet", "Capsule", "Injection"].includes(medicine.category);
            const data = bulkSellData[medicine._id] || { quantity: "", type: "packages" };
            const maxPackages = Math.floor(medicine.quantity);
            const maxUnits = maxPackages * unitsPerPack;

            return (
              <div key={medicine._id} className="bulk-med-item">
                <div className="bulk-med-header">
                  <span className="med-emoji">{getCategoryEmoji(medicine.category)}</span>
                  <strong>{medicine.name}</strong>
                  {medicine.packSize && <small className="pack-size">({medicine.packSize})</small>}
                </div>

                <div className="stock-info">
                  <span>
                    <strong>Stock:</strong> {maxPackages} package{maxPackages !== 1 ? "s" : ""}
                    {canSellUnits && <> → {maxUnits} units</>}
                  </span>
                  <span>
                    <strong>Price/Package:</strong> PKR {medicine.salePrice}
                  </span>
                  {canSellUnits && (
                    <span className="unit-price">
                      <strong>Price/Unit:</strong> PKR {getPricePerUnit(medicine).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Radio Buttons - NOW WORKING */}
                {canSellUnits && (
                  <div className="quantity-type-radio">
                    <label className={data.type === "packages" ? "active" : ""}>
                      <input
                        type="radio"
                        name={`type-${medicine._id}`}
                        value="packages"
                        checked={data.type === "packages"}
                        onChange={() => {
                          setBulkSellData(prev => ({
                            ...prev,
                            [medicine._id]: { ...prev[medicine._id], type: "packages" } || { quantity: "", type: "packages" }
                          }));
                        }}
                      />
                      <span>Packages</span>
                    </label>
                    <label className={data.type === "units" ? "active" : ""}>
                      <input
                        type="radio"
                        name={`type-${medicine._id}`}
                        value="units"
                        checked={data.type === "units"}
                        onChange={() => {
                          setBulkSellData(prev => ({
                            ...prev,
                            [medicine._id]: { ...prev[medicine._id], type: "units" } || { quantity: "", type: "units" }
                          }));
                        }}
                      />
                      <span>Units</span>
                    </label>
                  </div>
                )}

                {/* Quantity Input */}
                <div className="quantity-input-wrapper">
                  <input
                    type="number"
                    placeholder={
                      data.type === "units"
                        ? `Max: ${maxUnits} units`
                        : `Max: ${maxPackages} packages`
                    }
                    value={data.quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d+$/.test(val)) {
                        setBulkSellData(prev => ({
                          ...prev,
                          [medicine._id]: { ...prev[medicine._id], quantity: val } || { quantity: val, type: "packages" }
                        }));
                      }
                    }}
                    min="1"
                    max={data.type === "units" ? maxUnits : maxPackages}
                    className="bulk-qty-input"
                  />
                  {data.quantity && parseInt(data.quantity) > 0 && (
                    <div className="item-total">
                      PKR {calculateTotal(medicine, parseInt(data.quantity), data.type).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Grand Total */}
      {Object.values(bulkSellData).some(item => item.quantity && parseInt(item.quantity) > 0) && (
        <div className="grand-total-bar">
          <strong>
            Grand Total: PKR{" "}
            {Object.entries(bulkSellData)
              .filter(([id, data]) => selectedIds.has(id) && data.quantity && parseInt(data.quantity) > 0)
              .reduce((sum, [id, data]) => {
                const med = displayedMedicines.find(m => m._id === id);
                return sum + (med ? calculateTotal(med, parseInt(data.quantity), data.type) : 0);
              }, 0)
              .toFixed(2)}
          </strong>
        </div>
      )}

      <div className="popup-buttons bulk">
        <button
          className="confirm-bulk-btn"
          onClick={handleBulkSell}
          disabled={
            isSubmitting ||
            Object.keys(bulkSellData).length === 0 ||
            displayedMedicines
              .filter(m => selectedIds.has(m._id))
              .some(m => !bulkSellData[m._id]?.quantity || parseInt(bulkSellData[m._id].quantity) <= 0)
          }
        >
          {isSubmitting ? "Processing..." : `Confirm Bulk Sell (${selectedIds.size})`}
        </button>
        <button
          className="cancel-bulk-btn"
          onClick={() => {
            setShowBulkSellPopup(false);
            setBulkSellData({}); // Clear all
          }}
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
