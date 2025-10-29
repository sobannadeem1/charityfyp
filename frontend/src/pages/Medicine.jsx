import React, { useEffect, useState } from "react";
import {
  getAllMedicines,
  addMedicine,
  updateMedicine,
  sellMedicine,
} from "../api/medicineapi"; // keep your path
import "../styles/medicine.css";
import { toast } from "sonner";

export default function Medicines() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);

  // modal (popup) controls
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  // sell inline box
  const [activeSellId, setActiveSellId] = useState(null);
  const [sellQty, setSellQty] = useState("");

  // form state (matches your enhanced model)
  const emptyForm = {
    name: "",
    genericName: "",
    category: "",
    packSize: "",
    dosageForm: "",
    strength: "",
    batchNumber: "",
    expiry: "",
    quantity: "",
    purchasePrice: "",
    salePrice: "",
    discount: "",
    manufacturer: "",
    supplier: "",
    storageCondition: "",
    isExpired: false,
    isActive: true,
  };
  const [form, setForm] = useState(emptyForm);

  // helpful datalists (common suggestions)
  const genericSuggestions = [
    "Paracetamol",
    "Ibuprofen",
    "Amoxicillin",
    "Cetirizine",
    "Metformin",
    "Amlodipine",
  ];
  const dosageSuggestions = [
    "Oral",
    "Topical",
    "Injection",
    "Inhaler",
    "Nasal",
  ];
  const categoryOptions = [
    "Tablet",
    "Capsule",
    "Syrup",
    "Injection",
    "Cream",
    "Ointment",
    "Drops",
    "Inhaler",
    "Powder",
    "Suppository",
    "Spray",
    "Gel",
    "Solution",
    "Other",
  ];
  const storageOptions = [
    "Room Temperature",
    "Refrigerated",
    "Cool & Dry Place",
    "Other",
  ];

  // fetch medicines
  useEffect(() => {
    fetchMedicines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const res = await getAllMedicines();
      const list = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : res?.data ?? [];
      // FILTER OUT ZERO QTY MEDICINES
      setMedicines(list.filter((m) => Number(m.quantity) > 0));
    } catch (err) {
      console.error("fetchMedicines:", err);
      toast.error?.("Failed to load medicines");
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  // form helpers
  const openAddModal = () => {
    setForm(emptyForm);
    setIsEditMode(false);
    setEditId(null);
    setShowModal(true);
  };

  const openEditModal = (med) => {
    // normalize numbers -> strings for inputs
    const f = {
      name: med.name ?? "",
      genericName: med.genericName ?? "",
      category: med.category ?? "",
      packSize: med.packSize ?? "",
      dosageForm: med.dosageForm ?? "",
      strength: med.strength ?? "",
      batchNumber: med.batchNumber ?? "",
      expiry: med.expiry ? med.expiry.slice(0, 10) : "",
      quantity: med.quantity ?? "",
      purchasePrice: med.purchasePrice ?? "",
      salePrice: med.salePrice ?? med.salePrice ?? "",
      discount: med.discount ?? 0,
      manufacturer: med.manufacturer ?? "",
      supplier: med.supplier ?? "",
      storageCondition: med.storageCondition ?? "",
      isExpired: Boolean(med.isExpired),
      isActive: med.isActive ?? true,
    };
    setForm(f);
    setIsEditMode(true);
    setEditId(med._id);
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // basic validation
      if (!form.name || !form.category || !form.expiry || !form.quantity) {
        toast.error?.(
          "Please fill required fields (name, category, expiry, qty)"
        );
        return;
      }

      if (isEditMode && editId) {
        // update (re-use your updateMedicine API) — here we assume updateMedicine exists
        const res = await updateMedicine(editId, form); // updateMedicine imported? if not, add it
        const updated = res?.data ?? res;
        setMedicines((prev) =>
          prev.map((m) => (m._id === editId ? updated : m))
        );
        toast.success?.("Medicine updated");
      } else {
        const res = await addMedicine(form);
        // new item could be at res.data.data or res.data etc
        const added = res?.data?.data ?? res?.data ?? res;
        // final fallback: if added wrapped in success->data
        const newItem = added?.data ?? added;
        // push to list
        setMedicines((prev) => [newItem, ...prev]);
        toast.success?.("Medicine added");
      }

      setShowModal(false);
      setIsEditMode(false);
      setEditId(null);
      setForm(emptyForm);
    } catch (err) {
      console.error("handleSubmit:", err);
      toast.error?.("Save failed");
    }
  };

  const handleConfirmSell = async (med) => {
    const qty = Number(sellQty);
    if (!qty || qty <= 0) {
      toast.error?.("Enter a valid quantity");
      return;
    }
    if (qty > Number(med.quantity)) {
      toast.error?.("Cannot sell more than available stock");
      return;
    }

    try {
      // call backend: sellMedicine(id, qty)
      const res = await sellMedicine(med._id, qty);
      // normalize returned updated medicine
      const updated = res?.data?.data ?? res?.data ?? res;
      // if backend returns the whole updated medicine or wrapper, extract final
      const finalMed = updated?.data ?? updated;

      setMedicines(
        (prev) =>
          prev
            .map((m) => (m._id === med._id ? finalMed || updated || m : m))
            .filter((m) => Number(m.quantity) > 0) // if sold to zero — remove row
      );

      if (
        Number(
          finalMed?.quantity ?? updated?.quantity ?? med.quantity - qty
        ) === 0
      ) {
        toast.success?.(`${med.name} sold — now out of stock and removed`);
      } else {
        toast.success?.(`${qty} × ${med.name} sold`);
      }
    } catch (err) {
      console.error("sell error:", err);
      toast.error?.("Sell failed");
    } finally {
      setActiveSellId(null);
      setSellQty("");
    }
  };
  const openSellToast = (med) => {
    let tempQty = 1;

    toast.custom(
      (t) => (
        <div className="sell-toast">
          <strong>Sell {med.name}</strong>
          <input
            type="number"
            min="1"
            max={med.quantity}
            defaultValue={tempQty}
            onChange={(e) => {
              tempQty = Number(e.target.value);
            }}
            className="sell-toast-input"
          />
          <div className="sell-toast-actions">
            <button
              onClick={async () => {
                if (!tempQty || tempQty <= 0) {
                  toast.error("Enter valid quantity");
                  return;
                }
                if (tempQty > med.quantity) {
                  toast.error("Cannot sell more than stock");
                  return;
                }

                try {
                  const res = await sellMedicine(med._id, tempQty);
                  const updated = res?.data?.data ?? res?.data ?? res;
                  const finalMed = updated?.data ?? updated;

                  setMedicines((prev) =>
                    prev
                      .map((m) =>
                        m._id === med._id ? finalMed || updated || m : m
                      )
                      .filter((m) => Number(m.quantity) > 0)
                  );

                  toast.success(`${tempQty} × ${med.name} sold`);
                } catch (err) {
                  console.error(err);
                  toast.error("Sell failed");
                }
              }}
            >
              ✔ Sell
            </button>
            <button onClick={() => toast.dismiss(t.id)}>✖ Cancel</button>
          </div>
        </div>
      ),
      {
        id: `sell-${med._id}`,
        duration: 5000, // optional, you can keep it long or manual dismiss
        position: "top-center",
      }
    );
  };

  return (
    <div className="med-page">
      <header className="med-header">
        <h1 className="med-title">💊 Medicine Inventory</h1>

        <div className="med-controls">
          <button className="add-btn" onClick={openAddModal}>
            + Add Medicine
          </button>
        </div>
      </header>

      <main className="med-main">
        {loading ? (
          <div className="loader">Loading medicines...</div>
        ) : (
          <div className="table-wrap">
            <table className="med-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Generic</th>
                  <th>Category</th>
                  <th>Pack</th>
                  <th>Dosage</th>
                  <th>Strength</th>
                  <th>Batch</th>
                  <th>Expiry</th>
                  <th>Qty</th>
                  <th>Purchase</th>
                  <th>Sale</th>
                  <th>Disc%</th>
                  <th>Manufacturer</th>
                  <th>Supplier</th>
                  <th>Storage</th>
                  <th>Expired?</th>
                  <th>Active?</th>
                  <th className="col-actions">Sell</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(medicines) && medicines.length ? (
                  medicines.map((m) => (
                    <tr key={m._id}>
                      <td className="td-name">{m.name}</td>
                      <td>{m.genericName || "-"}</td>
                      <td>{m.category}</td>
                      <td>{m.packSize || "-"}</td>
                      <td>{m.dosageForm || "-"}</td>
                      <td>{m.strength || "-"}</td>
                      <td>{m.batchNumber || "-"}</td>
                      <td>
                        {m.expiry
                          ? new Date(m.expiry).toLocaleDateString()
                          : "-"}
                      </td>
                      <td>{m.quantity}</td>
                      <td>{m.purchasePrice ?? "-"}</td>
                      <td>{m.salePrice ?? "-"}</td>
                      <td>{m.discount ?? 0}</td>
                      <td>{m.manufacturer || "-"}</td>
                      <td>{m.supplier || "-"}</td>
                      <td>{m.storageCondition || "-"}</td>
                      <td>{m.isExpired ? "Yes" : "No"}</td>
                      <td>{m.isActive ? "Yes" : "No"}</td>

                      <td>
                        <div className="sell-actions">
                          <button
                            className="sell-btn"
                            onClick={() => openSellToast(m)}
                            title={`Sell ${m.name}`}
                          >
                            Sell
                          </button>
                          <button
                            className="edit-btn"
                            onClick={() => openEditModal(m)}
                            title="Edit"
                          >
                            ✎
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="18" className="no-data">
                      No medicines found — add your first medicine.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal Popup */}
      {showModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <header className="modal-header">
              <h2>{isEditMode ? "Edit Medicine" : "Add Medicine"}</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowModal(false);
                  setIsEditMode(false);
                  setEditId(null);
                }}
                aria-label="Close"
              >
                ×
              </button>
            </header>

            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="row">
                <label>
                  Name <span className="required">*</span>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder="e.g. Panadol 500"
                  />
                </label>

                <label>
                  Generic
                  <input
                    list="generic-list"
                    name="genericName"
                    value={form.genericName}
                    onChange={handleFormChange}
                    placeholder="e.g. Paracetamol"
                  />
                  <small className="hint">Try selecting from suggestions</small>
                  <datalist id="generic-list">
                    {genericSuggestions.map((g) => (
                      <option key={g} value={g} />
                    ))}
                  </datalist>
                </label>
              </div>

              <div className="row">
                <label>
                  Category <span className="required">*</span>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Select category</option>
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Pack size
                  <input
                    name="packSize"
                    value={form.packSize}
                    onChange={handleFormChange}
                    placeholder='e.g. "10 tablets/strip"'
                  />
                </label>
              </div>

              <div className="row">
                <label>
                  Dosage form
                  <input
                    list="dosage-list"
                    name="dosageForm"
                    value={form.dosageForm}
                    onChange={handleFormChange}
                    placeholder="Oral / Topical / Injection"
                  />
                  <datalist id="dosage-list">
                    {dosageSuggestions.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                  <small className="hint">helps for filters & reports</small>
                </label>

                <label>
                  Strength
                  <input
                    name="strength"
                    value={form.strength}
                    onChange={handleFormChange}
                    placeholder="e.g. 500mg"
                  />
                </label>
              </div>

              <div className="row">
                <label>
                  Batch #
                  <input
                    name="batchNumber"
                    value={form.batchNumber}
                    onChange={handleFormChange}
                    placeholder="optional"
                  />
                </label>

                <label>
                  Expiry <span className="required">*</span>
                  <input
                    type="date"
                    name="expiry"
                    value={form.expiry}
                    onChange={handleFormChange}
                    required
                  />
                </label>
              </div>

              <div className="row">
                <label>
                  Quantity <span className="required">*</span>
                  <input
                    type="number"
                    min="0"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label>
                  Purchase price
                  <input
                    type="number"
                    min="0"
                    name="purchasePrice"
                    value={form.purchasePrice}
                    onChange={handleFormChange}
                  />
                </label>
              </div>

              <div className="row">
                <label>
                  Sale price <span className="required">*</span>
                  <input
                    type="number"
                    min="0"
                    name="salePrice"
                    value={form.salePrice}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label>
                  Discount %
                  <input
                    type="number"
                    min="0"
                    name="discount"
                    value={form.discount}
                    onChange={handleFormChange}
                  />
                </label>
              </div>

              <div className="row">
                <label>
                  Manufacturer
                  <input
                    name="manufacturer"
                    value={form.manufacturer}
                    onChange={handleFormChange}
                  />
                </label>

                <label>
                  Supplier
                  <input
                    name="supplier"
                    value={form.supplier}
                    onChange={handleFormChange}
                  />
                </label>
              </div>

              <div className="row">
                <label>
                  Storage condition
                  <select
                    name="storageCondition"
                    value={form.storageCondition}
                    onChange={handleFormChange}
                  >
                    <option value="">Select storage</option>
                    {storageOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={form.isActive}
                    onChange={handleFormChange}
                  />
                  Active
                </label>
              </div>

              <footer className="modal-footer">
                <button type="submit" className="save-btn">
                  {isEditMode ? "Update" : "Save"}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
