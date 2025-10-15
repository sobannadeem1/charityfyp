import React, { useState } from "react";
import "../styles/medicine.css";

export default function Medicines() {
  const [medicines, setMedicines] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    expiry: "",
    quantity: "",
    price: "",
    photo: null,
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData({
      ...formData,
      [name]: files ? files[0] : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setMedicines([...medicines, formData]);
    setShowForm(false);
    setFormData({
      name: "",
      category: "",
      expiry: "",
      quantity: 0,
      price: 0,
      photo: null,
    });
  };

  return (
    <div className="medicines-page">
      <h2>Medicines Inventory</h2>

      {/* Add Button */}
      <button className="add-btn" onClick={() => setShowForm(true)}>
        + Add Medicine
      </button>

      {/* Medicines Table */}
      <table className="medicines-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Expiry</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {medicines.map((med, i) => (
            <tr key={i}>
              <td>{med.name}</td>
              <td>{med.category}</td>
              <td>{med.expiry}</td>
              <td>{med.quantity}</td>
              <td>{med.price}</td>
              <td>
                <button className="action-btn edit">Edit</button>
                <button className="action-btn sold">Sold</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Form (Modal style) */}
      {showForm && (
        <div className="modal">
          <form onSubmit={handleSubmit} className="medicine-form">
            <h3>Add Medicine</h3>

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
            >
              <option value="">Select Category</option>
              <option value="Tablet">Tablet</option>
              <option value="Capsule">Capsule</option>
              <option value="Syrup">Syrup</option>
              <option value="Injection">Injection</option>
            </select>

            <div className="form-group">
              <label htmlFor="expiry">Expiry Date</label>
              <input
                type="date"
                id="expiry"
                name="expiry"
                placeholder="Select expiry date"
                className="form-input"
                value={formData.expiry}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="quantity">Quantity</label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                placeholder="Enter Quantity"
                className="form-input"
                value={formData.quantity}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="price">Price (PKR)</label>
              <input
                type="number"
                id="price"
                name="price"
                placeholder="Enter Price (PKR)"
                className="form-input"
                value={formData.price}
                onChange={handleChange}
                required
              />
            </div>

            <input
              type="file"
              name="photo"
              onChange={handleChange}
              accept="image/*"
            />

            <button type="submit">Save</button>
            <button
              type="button"
              className="cancel"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
