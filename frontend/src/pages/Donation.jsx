import React, { useState } from "react";
import "../styles/Donation.css";

export default function Donations() {
  const [donations, setDonations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    donor: "",
    type: "",
    amount: "",
    notes: "",
    date: new Date().toISOString().split("T")[0], // auto today's date
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setDonations([...donations, formData]);
    setShowForm(false);
    setFormData({
      donor: "",
      type: "",
      amount: "",
      notes: "",
      date: new Date().toISOString().split("T")[0],
    });
  };

  return (
    <div className="donations-page">
      <h2>Donations</h2>

      {/* Add Donation Button */}
      <button className="add-btn" onClick={() => setShowForm(true)}>
        + Add Donation
      </button>

      {/* Summary Section */}
      <div className="donation-summary">
        <p>Total Donors: {donations.length}</p>
        <p>
          Total Amount:{" "}
          {donations
            .filter((d) => d.type === "Money")
            .reduce((sum, d) => sum + Number(d.amount || 0), 0)}{" "}
          PKR
        </p>
      </div>

      {/* Donations Table */}
      <table className="donations-table">
        <thead>
          <tr>
            <th>Donor</th>
            <th>Type</th>
            <th>Amount / Quantity</th>
            <th>Date</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {donations.map((don, i) => (
            <tr key={i}>
              <td>{don.donor || "Anonymous"}</td>
              <td>{don.type}</td>
              <td>{don.amount}</td>
              <td>{don.date}</td>
              <td>{don.notes}</td>
              <td>
                <button className="action-btn edit">Edit</button>
                <button className="action-btn used">Mark as Used</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Form (Modal style) */}
      {showForm && (
        <div className="modal">
          <form onSubmit={handleSubmit} className="donation-form">
            <h3>Add Donation</h3>

            <input
              type="text"
              name="donor"
              placeholder="Donor Name (optional)"
              value={formData.donor}
              onChange={handleChange}
            />

            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option value="">Select Type</option>
              <option value="Money">Money</option>
              <option value="Medicine">Medicine</option>
              <option value="Item">Item</option>
              <option value="Other">Other</option>
            </select>

            <input
              type="number"
              name="amount"
              placeholder="Amount / Quantity"
              value={formData.amount}
              onChange={handleChange}
              required
            />

            <textarea
              name="notes"
              placeholder="Notes (optional)"
              value={formData.notes}
              onChange={handleChange}
            />

            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />

            <button type="submit" className="save-btn">
              Save
            </button>
            <button
              type="button"
              className="cancel-btn"
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
