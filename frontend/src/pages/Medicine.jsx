import React, { useEffect, useState, useMemo } from "react";
import {
  getAllMedicines,
  addMedicine,
  updateMedicine,
  sellMedicine,
} from "../api/medicineapi";
import "../styles/Medicine.css";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Medicines({ isAdmin }) {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [showSellPopup, setShowSellPopup] = useState(false);
  const [currentMedicine, setCurrentMedicine] = useState(null);
  const [sellQuantity, setSellQuantity] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // ✅ Search state
  const [currentPage, setCurrentPage] = useState(1); // ✅ Pagination state
  const navigate = useNavigate();

  const itemsPerPage = 10; // ✅ 10 records per page

  // ✅ Form State
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

  // ✅ Fetch all medicines
  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const res = await getAllMedicines();
      const data = Array.isArray(res) ? res : res.data || [];
      setMedicines(data.filter((m) => Number(m.quantity) > 0));
    } catch (error) {
      toast.error("Failed to load medicines");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  // ✅ Handle Input Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Add Medicine
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
        if (!formData[field]) {
          return toast.error(`Please fill the ${field} field`);
        }
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
    } catch (error) {
      console.error("Error adding medicine:", error);
      toast.error("Error adding medicine");
    }
  };

  // ✅ Edit Medicine
  const handleEdit = (medicine) => {
    setSelectedMedicine(medicine);
    setFormData({
      ...medicine,
      expiry: medicine.expiry
        ? new Date(medicine.expiry).toISOString().split("T")[0]
        : "",
    });
    setShowEditPopup(true);
  };

  const handleUpdateMedicine = async (e) => {
    e.preventDefault();
    try {
      await updateMedicine(selectedMedicine._id, formData);
      toast.success("Medicine updated successfully ✅");
      setShowEditPopup(false);
      fetchMedicines();
    } catch (error) {
      console.error("Error updating medicine:", error);
      toast.error("Error updating medicine");
    }
  };

  // ✅ Sell Medicine
  const handleSell = (medicine) => {
    setCurrentMedicine(medicine);
    setShowSellPopup(true);
  };

  const confirmSell = async () => {
    const quantitySold = parseInt(sellQuantity, 10);
    if (!quantitySold || quantitySold <= 0)
      return toast.error("Invalid quantity!");
    if (quantitySold > currentMedicine.quantity)
      return toast.error("Not enough stock!");

    try {
      await sellMedicine(currentMedicine._id, quantitySold);
      toast.success(`Sold ${quantitySold} units successfully 💸`);
      setSellQuantity("");
      setShowSellPopup(false);
      fetchMedicines();
    } catch (error) {
      toast.error("Error selling medicine");
    }
  };

  // ✅ Filtered + Paginated Medicines
  const filteredMedicines = useMemo(() => {
    return medicines.filter((m) => {
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

  // ✅ Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="medicine-container">
      <div className="header">
        <h1>💊 Medicine Inventory</h1>

        <div className="header-buttons">
          {/* 🔍 Search */}
          <input
            type="text"
            className="search-box"
            placeholder="Search by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {/* Add & Sold Buttons (Admin Only) */}
          {isAdmin && (
            <>
              <button className="add-btn" onClick={() => setShowAddPopup(true)}>
                + Add Medicine
              </button>
              <button className="sold-btn" onClick={() => navigate("/sold")}>
                View Sold
              </button>
            </>
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
                <th>Name</th>
                <th>Category</th>
                <th>Type</th>
                <th>Strength</th>
                <th>Pack Size</th>
                <th>Expiry</th>
                <th>Qty</th>
                <th>Purchase</th>
                <th>Sale</th>
                <th>Manufacturer</th>
                <th>Supplier</th>
                <th>Storage</th>
                <th>Added On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMedicines.length > 0 ? (
                paginatedMedicines.map((m) => {
                  const isExpired = new Date(m.expiry) < new Date();
                  return (
                    <tr
                      key={m._id}
                      className={isExpired ? "expired-row" : ""}
                      title={isExpired ? "Expired medicine" : ""}
                    >
                      <td>{m.name}</td>
                      <td>{m.category}</td>
                      <td>{m.dosageForm}</td>
                      <td>{m.strength}</td>
                      <td>{m.packSize}</td>
                      <td>
                        {m.expiry
                          ? new Date(m.expiry).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td>{m.quantity}</td>
                      <td>{m.purchasePrice}</td>
                      <td>{m.salePrice}</td>
                      <td>{m.manufacturer}</td>
                      <td>{m.supplier}</td>
                      <td>{m.storageCondition}</td>
                      <td>{new Date(m.createdAt).toLocaleString()}</td>
                      <td className="action-btns">
                        {isAdmin && (
                          <>
                            <button onClick={() => handleEdit(m)}>
                              ✏️ Edit
                            </button>
                            <button onClick={() => handleSell(m)}>
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
                  <td colSpan="14" style={{ textAlign: "center" }}>
                    No medicines found 😶
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* ✅ Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                ⬅ Prev
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next ➡
              </button>
            </div>
          )}
        </div>
      )}

      {/* ✅ Add/Edit Popup */}
      {(showAddPopup || showEditPopup) && (
        <div className="popup-overlay">
          <div className="popup">
            <h2>{showEditPopup ? "Edit Medicine" : "Add New Medicine"}</h2>
            <form
              onSubmit={
                showEditPopup ? handleUpdateMedicine : handleAddMedicine
              }
              className="form-grid"
            >
              <input
                name="name"
                placeholder="Medicine Name"
                value={formData.name || ""}
                onChange={handleChange}
                required
              />

              <select
                name="category"
                value={formData.category || ""}
                onChange={handleChange}
                required
              >
                <option value="">Select Category</option>
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

              <input
                name="packSize"
                placeholder="Pack Size (e.g. 10 tablets)"
                value={formData.packSize || ""}
                onChange={handleChange}
              />

              <input
                name="dosageForm"
                placeholder="Dosage Form (e.g. Oral)"
                value={formData.dosageForm || ""}
                onChange={handleChange}
              />

              <input
                name="strength"
                placeholder="Strength (e.g. 500mg)"
                value={formData.strength || ""}
                onChange={handleChange}
              />

              <input
                type="date"
                name="expiry"
                value={formData.expiry || ""}
                onChange={handleChange}
                required
              />

              <input
                name="quantity"
                type="number"
                placeholder="Quantity"
                value={formData.quantity || ""}
                onChange={handleChange}
                required
              />

              <input
                name="purchasePrice"
                type="number"
                placeholder="Purchase Price"
                value={formData.purchasePrice || ""}
                onChange={handleChange}
                required
              />

              <input
                name="salePrice"
                type="number"
                placeholder="Sale Price"
                value={formData.salePrice || ""}
                onChange={handleChange}
                required
              />

              <input
                name="manufacturer"
                placeholder="Manufacturer"
                value={formData.manufacturer || ""}
                onChange={handleChange}
              />

              <input
                name="supplier"
                placeholder="Supplier"
                value={formData.supplier || ""}
                onChange={handleChange}
              />

              <select
                name="storageCondition"
                value={formData.storageCondition || "Room Temperature"}
                onChange={handleChange}
              >
                <option>Room Temperature</option>
                <option>Refrigerated</option>
                <option>Cool & Dry Place</option>
                <option>Other</option>
              </select>

              <div className="popup-buttons">
                <button type="submit" className="save-btn">
                  {showEditPopup ? "Update" : "Add"}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowAddPopup(false);
                    setShowEditPopup(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ Sell Popup */}
      {showSellPopup && (
        <div className="popup-overlay">
          <div className="popup">
            <h2>Sell {currentMedicine?.name}</h2>
            <input
              type="number"
              placeholder="Enter quantity..."
              value={sellQuantity}
              onChange={(e) => setSellQuantity(e.target.value)}
              className="input-field"
            />
            <div className="popup-buttons">
              <button className="save-btn" onClick={confirmSell}>
                Confirm Sell
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowSellPopup(false);
                  setSellQuantity("");
                }}
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
