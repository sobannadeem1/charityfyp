import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  createDonation,
  getAllDonations,
  updateDonationStatus,
} from "../api/donationapi.js";
import "../styles/Donation.css";

export default function Donations({ isAdmin }) {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ search: "", status: "", type: "" });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [formData, setFormData] = useState({
    donorName: "",
    donorEmail: "",
    donorPhone: "",
    donationType: "medicine",
    donatedItem: "",
    quantity: "",
    unit: "packages",
    expiryDate: "",
    estimatedValue: "",
    notes: "",
  });

  const fetchDonations = async () => {
    setLoading(true);
    try {
      const res = await getAllDonations({
        page,
        search: filters.search,
        status: filters.status,
        type: filters.type,
      });
      setDonations(res.data || []);
      setTotalPages(res.pages || 1);
    } catch (err) {
      toast.error("Failed to load donations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, [page, filters]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // For cash → use estimatedValue as amount
    const dataToSend = {
      ...formData,
      quantity: formData.donationType === "cash" ? 1 : formData.quantity,
      unit: formData.donationType === "cash" ? "dollars" : formData.unit,
      estimatedValue:
        formData.donationType === "cash"
          ? formData.estimatedValue
          : formData.estimatedValue || 0,
    };

    toast.promise(createDonation(dataToSend), {
      loading: "Recording donation...",
      success: () => {
        setShowForm(false);
        fetchDonations();
        setFormData({
          donorName: "",
          donorEmail: "",
          donorPhone: "",
          donationType: "medicine",
          donatedItem: "",
          quantity: "",
          unit: "packages",
          expiryDate: "",
          estimatedValue: "",
          notes: "",
        });
        return "Donation recorded successfully!";
      },
      error: (err) => err?.message || "Failed to add donation",
    });
  };

  const handleStatusChange = async (donationId, newStatus) => {
    toast.promise(
      updateDonationStatus(donationId, {
        status: newStatus,
        // Only send rejectedReason when rejecting
        ...(newStatus === "rejected" && {
          rejectedReason: "Not needed / Expired",
        }),
      }),
      {
        loading: "Updating status...",
        success: () => {
          fetchDonations();
          return newStatus === "received"
            ? "Donation marked as Received"
            : "Donation rejected";
        },
        error: (err) => {
          console.error("Update failed:", err);
          return err?.response?.data?.message || "Failed to update status";
        },
      }
    );
  };

  return (
    <div className="donations-page">
      <div className="header">
        <h1>Donations Management</h1>
        {isAdmin && (
          <button className="add-btn" onClick={() => setShowForm(true)}>
            + Record New Donation
          </button>
        )}
      </div>

      {/* Info Box */}
      <div className="info-box">
        <strong>Note:</strong> After marking a medicine donation as "Received",
        please go to <strong>Medicines → Add Stock</strong> to add it to
        inventory manually.
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Search donor or item..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="received">Received</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">All Types</option>
          <option value="medicine">Medicine</option>
          <option value="cash">Cash</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="stats">
        <div className="stat-card">
          <h3>Total Donations</h3>
          <p>{donations.length}</p>
        </div>
        <div className="stat-card">
          <h3>Pending</h3>
          <p>{donations.filter((d) => d.status === "pending").length}</p>
        </div>
        <div className="stat-card">
          <h3>Received</h3>
          <p>{donations.filter((d) => d.status === "received").length}</p>
        </div>
      </div>

      {loading ? (
        <p>Loading donations...</p>
      ) : (
        <table className="donations-table">
          <thead>
            <tr>
              <th>Donor</th>
              <th>Type</th>
              <th>Item / Amount</th>
              <th>Qty</th>
              <th>Expiry</th>
              <th>Status</th>
              {/* Actions column header only for admin */}
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {donations.map((d) => (
              <tr key={d._id}>
                <td>{d.donorName || "Anonymous"}</td>
                <td>
                  <span className={`type ${d.donationType}`}>
                    {d.donationType.toUpperCase()}
                  </span>
                </td>
                <td>
                  {d.donationType === "cash"
                    ? `PKR ${d.estimatedValue || d.quantity}`
                    : d.donatedItem || "N/A"}
                </td>
                <td>
                  {d.quantity} {d.unit}
                </td>
                <td>
                  {d.expiryDate
                    ? new Date(d.expiryDate).toLocaleDateString()
                    : "-"}
                </td>
                <td>
                  <span className={`status ${d.status}`}>
                    {d.status.toUpperCase()}
                  </span>
                </td>

                {/* ACTIONS COLUMN — ONLY FOR ADMIN */}
                {isAdmin && (
                  <td>
                    {d.status === "pending" ? (
                      <div className="action-buttons">
                        <button
                          className="receive-btn"
                          onClick={() => handleStatusChange(d._id, "received")}
                        >
                          Mark Received
                        </button>
                        <button
                          className="reject-btn"
                          onClick={() => handleStatusChange(d._id, "rejected")}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span
                        className={
                          d.status === "received" ? "received" : "rejected"
                        }
                      >
                        {d.status === "received"
                          ? "Received (Add to stock manually)"
                          : "Rejected"}
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Record New Donation</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Donor Name *"
                required
                value={formData.donorName}
                onChange={(e) =>
                  setFormData({ ...formData, donorName: e.target.value })
                }
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={formData.donorEmail}
                onChange={(e) =>
                  setFormData({ ...formData, donorEmail: e.target.value })
                }
              />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={formData.donorPhone}
                onChange={(e) =>
                  setFormData({ ...formData, donorPhone: e.target.value })
                }
              />

              <select
                value={formData.donationType}
                onChange={(e) => {
                  const type = e.target.value;
                  setFormData({
                    ...formData,
                    donationType: type,
                    unit: type === "cash" ? "dollars" : "packages",
                    estimatedValue:
                      type === "cash" ? formData.estimatedValue : "",
                  });
                }}
              >
                <option value="medicine">Medicine</option>
                <option value="cash">Cash</option>
                <option value="other">Other Items</option>
              </select>

              {formData.donationType === "cash" ? (
                <input
                  type="number"
                  placeholder="Amount (PKR) *"
                  required
                  min="1"
                  value={formData.estimatedValue}
                  onChange={(e) =>
                    setFormData({ ...formData, estimatedValue: e.target.value })
                  }
                />
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Item Name *"
                    required
                    value={formData.donatedItem}
                    onChange={(e) =>
                      setFormData({ ...formData, donatedItem: e.target.value })
                    }
                  />
                  <div className="row">
                    <input
                      type="number"
                      placeholder="Quantity *"
                      required
                      min="1"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: e.target.value })
                      }
                    />
                    <select
                      value={formData.unit}
                      onChange={(e) =>
                        setFormData({ ...formData, unit: e.target.value })
                      }
                    >
                      <option value="packages">Packages</option>
                      <option value="units">Units</option>
                      <option value="tablets">Tablets</option>
                      <option value="bottles">Bottles</option>
                    </select>
                  </div>
                  {formData.donationType === "medicine" && (
                    <input
                      type="date"
                      required
                      value={formData.expiryDate}
                      onChange={(e) =>
                        setFormData({ ...formData, expiryDate: e.target.value })
                      }
                    />
                  )}
                </>
              )}

              {formData.donationType !== "cash" && (
                <input
                  type="number"
                  placeholder="Estimated Value (PKR) - optional"
                  value={formData.estimatedValue}
                  onChange={(e) =>
                    setFormData({ ...formData, estimatedValue: e.target.value })
                  }
                />
              )}

              <textarea
                placeholder="Notes (optional)"
                rows="3"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />

              <div className="form-actions">
                <button type="submit">Save Donation</button>
                <button type="button" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
