// src/components/Medicines.jsx
import React, { useEffect, useState } from "react";
import "../styles/medicine.css";
import { toast } from "sonner";
import {
  getAllMedicines,
  addMedicine,
  updateMedicine,
  deleteMedicine,
  sellMedicine,
} from "../api/medicineapi";

export default function Medicines() {
  const [medicines, setMedicines] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMeds, setSelectedMeds] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    expiry: "",
    quantity: "",
    price: "",
    photo: null,
  });

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const res = await getAllMedicines();
      const finalList = res?.data?.data ?? res?.data ?? res;
      setMedicines(Array.isArray(finalList) ? finalList : []);
    } catch (err) {
      console.error("Error fetching medicines:", err);
      toast.error?.("Failed to load medicines");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      expiry: "",
      quantity: "",
      price: "",
      photo: null,
    });
    setIsEditMode(false);
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("category", formData.category);
      fd.append("expiry", formData.expiry);
      fd.append("quantity", formData.quantity);
      fd.append("price", formData.price);
      if (formData.photo) fd.append("image", formData.photo);

      if (isEditMode && editId) {
        setProcessingId(editId);
        const res = await updateMedicine(editId, fd);
        const updated = res?.data?.data ?? res?.data ?? res;
        // update the list and remove if quantity 0
        setMedicines((prev) => {
          const updatedList = prev.map((m) => (m._id === editId ? updated : m));
          // If updated item is out of stock, remove it
          return updatedList.filter((m) => Number(m.quantity) > 0);
        });
        // if edited item was selected for printing and removed, remove from selection
        if (selectedMeds.includes(editId) && Number(updated.quantity) === 0) {
          setSelectedMeds((s) => s.filter((id) => id !== editId));
        }
      } else {
        const res = await addMedicine(fd);
        const added = res?.data?.data ?? res?.data ?? res;
        // backend may return wrapper { success, data: medicine }
        const newMed = added?.data ?? added;
        // push created medicine into list (defensive)
        setMedicines((prev) => [...prev, newMed]);
      }

      setShowForm(false);
      resetForm();
      toast.success?.("Saved successfully");
    } catch (err) {
      console.error("Error submitting medicine:", err);
      toast.error?.("Failed to save medicine");
    } finally {
      setSubmitting(false);
      setProcessingId(null);
    }
  };

  const handleEdit = (med) => {
    setFormData({
      name: med.name ?? "",
      category: med.category ?? "",
      expiry: med.expiry ? med.expiry.slice(0, 10) : "",
      quantity: med.quantity ?? "",
      price: med.price ?? "",
      photo: null,
    });
    setIsEditMode(true);
    setEditId(med._id);
    setShowForm(true);
  };

  const handleSell = (med) => {
    toast.custom((t) => (
      <div
        style={{
          background: "var(--toast-bg, #fff)",
          color: "var(--toast-text, #222)",
          padding: "1rem",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          width: "18rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
        }}
      >
        <h4 style={{ margin: 0 }}>Sell {med.name}</h4>

        <input
          id={`qty-${t.id}`}
          type="number"
          placeholder={`Max: ${med.quantity}`}
          min="1"
          max={med.quantity}
          defaultValue={1}
          style={{
            padding: "0.5rem",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        />

        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}
        >
          <button
            onClick={() => toast.dismiss(t.id)}
            style={{
              background: "#ccc",
              color: "#000",
              padding: "0.45rem 0.9rem",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            onClick={async () => {
              const input = document.getElementById(`qty-${t.id}`);
              const quantityToSell = Number(input?.value ?? 0);

              if (!quantityToSell || quantityToSell <= 0) {
                toast.error?.("Invalid quantity entered.");
                return;
              }
              if (quantityToSell > Number(med.quantity)) {
                toast.error?.("You can’t sell more than available stock!");
                return;
              }

              try {
                setProcessingId(med._id);
                const res = await sellMedicine(med._id, quantityToSell);
                const updatedMed = res?.data?.data ?? res?.data ?? res;

                setMedicines((prev) => {
                  // map update, then filter out zero-quantity items
                  const mapped = prev.map((m) =>
                    m._id === med._id ? updatedMed : m
                  );
                  return mapped.filter((m) => Number(m.quantity) > 0);
                });

                // if removed (qty 0), ensure it's removed from selectedMeds
                if (Number(updatedMed.quantity) === 0) {
                  setSelectedMeds((s) => s.filter((id) => id !== med._id));
                  toast.success?.(
                    `${med.name} is now out of stock and removed 🧾`
                  );
                } else {
                  toast.success?.(
                    `${quantityToSell} ${med.name} sold successfully 💊`
                  );
                }
              } catch (err) {
                console.error("Error selling medicine:", err);
                toast.error?.("Failed to update stock 😢");
              } finally {
                setProcessingId(null);
                // allow small delay so user sees result toast before dismissing input toast
                setTimeout(() => toast.dismiss(t.id), 600);
              }
            }}
            style={{
              background: "#0d6efd",
              color: "#fff",
              padding: "0.45rem 0.9rem",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    ));
  };

  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedMeds([]);
  };

  const toggleSelect = (id) => {
    setSelectedMeds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handlePrintSelected = () => {
    if (selectedMeds.length === 0) {
      toast.error?.("Select at least one medicine to print!");
      return;
    }

    const medsToPrint = medicines.filter((m) => selectedMeds.includes(m._id));

    const printWindow = window.open("", "", "width=900,height=700");
    printWindow.document.write(`
    <html>
      <head>
        <title>Medicine Report</title>
        <style>
          body { font-family: "Poppins", sans-serif; background: #f7f9fc; color: #222; padding: 2rem; margin: 0; }
          .header { text-align: center; border-bottom: 3px solid #0d6efd; padding-bottom: 1rem; margin-bottom: 2rem; line-height:1.2 }
          .header h1 { color: #0d6efd; font-size: 1.8rem; margin: 0; }
          .header p { color: #555; font-size: 0.95rem; margin-top: 0.4rem; }
          table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.95rem; }
          th, td { border: 1px solid #ddd; padding: 0.8rem 1rem; text-align: left; }
          th { background: #0d6efd; color: #fff; font-weight: 600; text-transform: uppercase; }
          tr:nth-child(even) { background: #f1f5ff; }
          .footer { text-align: center; margin-top: 2rem; font-size: 0.9rem; color: #555; }
          @media print {
            body { background: #fff; padding: 1rem; }
            th, td { font-size: 0.9rem; border: 1px solid #aaa; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/charity.png" alt="Store Logo" style="width: 80px; margin-bottom: 0.5rem;" />
          <h1>🌿 HealthCare Pharmacy</h1>
          <p>Main Bazar, Gujrat | 📞 0312-XXXXXXX</p>
          <p>GST No: 12-3456789 | Managed by: Admin</p>
          <p style="margin-top: 0.6rem; color: #777;">${new Date().toLocaleString()}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Medicine Name</th>
              <th>Category</th>
              <th>Expiry Date</th>
              <th>Available Qty</th>
              <th>Price (PKR)</th>
              <th>Total Value (PKR)</th>
            </tr>
          </thead>
          <tbody>
            ${medsToPrint
              .map(
                (m, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${m.name}</td>
                  <td>${m.category}</td>
                  <td>${m.expiry ? m.expiry.slice(0, 10) : "-"}</td>
                  <td>${m.quantity}</td>
                  <td>${m.price}</td>
                  <td>${(m.price * m.quantity).toLocaleString()}</td>
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>

        <div class="footer">
          <p><strong>Total Medicines Printed:</strong> ${medsToPrint.length}</p>
          <p><strong>Total Stock Value:</strong> ${medsToPrint
            .reduce((sum, m) => sum + m.price * m.quantity, 0)
            .toLocaleString()} PKR</p>
          <p><strong>Generated by:</strong> Medicine Inventory System 💊</p>
        </div>
      </body>
    </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.onafterprint = () => {
      printWindow.close();
      setSelectedMeds([]);
      setSelectMode(false);
    };
  };

  return (
    <div className="medicines-page">
      <div className="header-bar">
        <h2>💊 Medicines Inventory</h2>
        <div className="actions-bar">
          <button
            className="add-btn"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            + Add Medicine
          </button>
          <button
            className={`print-btn ${selectMode ? "cancel" : ""}`}
            onClick={toggleSelectMode}
          >
            {selectMode ? "Cancel Print Mode" : "🖨️ Print"}
          </button>
          {selectMode && (
            <button onClick={handlePrintSelected} className="confirm-print-btn">
              Confirm Print
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="loader">Loading medicines...</p>
      ) : (
        <div className="table-wrapper">
          <table className="medicines-table">
            <thead>
              <tr>
                {selectMode && <th>Select</th>}
                <th>Added On</th>
                <th>Photo</th>
                <th>Name</th>
                <th>Category</th>
                <th>Expiry</th>
                <th>Quantity</th>
                <th>Price (PKR)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((med) => (
                <tr key={med._id}>
                  {selectMode && (
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedMeds.includes(med._id)}
                        onChange={() => toggleSelect(med._id)}
                      />
                    </td>
                  )}

                  {/* Added On column (matches header order) */}
                  <td>
                    {med.createdAt
                      ? new Date(med.createdAt).toLocaleString()
                      : "-"}
                  </td>

                  <td>
                    <img
                      src={med.photo}
                      alt={med.name}
                      className="medicine-image"
                    />
                  </td>

                  <td>{med.name}</td>
                  <td>{med.category}</td>
                  <td>{med.expiry ? med.expiry.slice(0, 10) : ""}</td>
                  <td>{med.quantity}</td>
                  <td>{med.price}</td>
                  <td>
                    <button
                      className="action-btn edit"
                      onClick={() => handleEdit(med)}
                      disabled={processingId === med._id}
                    >
                      Edit
                    </button>
                    <button
                      className="action-btn sold"
                      onClick={() => handleSell(med)}
                      disabled={processingId === med._id}
                    >
                      Sell
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inline Form (non-modal style if you prefer) */}
      {showForm && (
        <div className="modal">
          <form onSubmit={handleSubmit} className="medicine-form">
            <h3>{isEditMode ? "Edit Medicine" : "Add Medicine"}</h3>

            <input
              type="text"
              name="name"
              placeholder="Medicine Name"
              value={formData.name}
              onChange={handleChange}
              required
            />

            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="">Select Category</option>
              <option value="Tablet">Tablet</option>
              <option value="Capsule">Capsule</option>
              <option value="Syrup">Syrup</option>
              <option value="Injection">Injection</option>
            </select>

            <input
              type="date"
              name="expiry"
              value={formData.expiry}
              onChange={handleChange}
              required
            />

            <input
              type="number"
              name="quantity"
              placeholder="Quantity"
              value={formData.quantity}
              onChange={handleChange}
              required
            />

            <input
              type="number"
              name="price"
              placeholder="Price (PKR)"
              value={formData.price}
              onChange={handleChange}
              required
            />

            <input
              type="file"
              name="photo"
              accept="image/*"
              onChange={handleChange}
            />

            <button type="submit" disabled={submitting}>
              {submitting
                ? isEditMode
                  ? "Updating..."
                  : "Saving..."
                : isEditMode
                ? "Update"
                : "Save"}
            </button>
            <button
              type="button"
              className="cancel"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              disabled={submitting}
            >
              Cancel
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
