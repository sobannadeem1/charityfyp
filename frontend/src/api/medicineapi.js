import axios from "axios";

// ✅ Detect environment (localhost vs production)
const isLocal = window.location.hostname === "localhost";

// ✅ Base URLs for both
const BASE_URL = isLocal
  ? "http://localhost:5000/api"
  : "https://charityfyp-jm4i.vercel.app/api";

const BASE_MEDICINES = `${BASE_URL}/medicines`;
const BASE_ADMIN = `${BASE_URL}/admin`;
const BASE_INVOICES = `${BASE_URL}/invoices`;

// ✅ Always send cookies (important for authentication)
axios.defaults.withCredentials = true;

/* ==============================
   💊 Medicines APIs
============================== */
export const addMedicine = async (data) => {
  const res = await axios.post(BASE_MEDICINES, data);
  return res.data;
};

export const getMedicinesWithPagination = async (
  page = 1,
  limit = 10,
  search = ""
) => {
  try {
    console.log(`🟢 API Call - Medicines with Pagination:`, {
      page,
      limit,
      search,
    });

    const res = await axios.get(`${BASE_MEDICINES}/`, {
      params: { page, limit, search },
    });

    console.log("🟢 Medicines data fetched successfully");
    return res.data; // This now includes data + pagination info
  } catch (error) {
    console.error("🔴 Error fetching medicines:", error);
    throw error;
  }
};
// In medicineapi.js
export const getAllMedicines = async () => {
  try {
    console.log("Fetching ALL medicines for dashboard & notifications");

    const response = await getMedicinesWithPagination(1, 10000, "");

    // THIS IS THE REAL FIX — EXTRACT THE ARRAY!
    let medicines = [];

    if (response && response.data && Array.isArray(response.data)) {
      medicines = response.data;
    } else if (Array.isArray(response)) {
      medicines = response;
    } else if (response && Array.isArray(response.medicines)) {
      medicines = response.medicines;
    }

    // FINAL CLEANUP: Force all numeric fields to be safe numbers
    const cleaned = medicines.map((med) => ({
      ...med,
      name: String(med.name || "Unknown Medicine").trim() || "Unknown",
      unitsAvailable: Number(med.unitsAvailable ?? med.quantity ?? 0) || 0,
      unitsPerPackage: Number(med.unitsPerPackage ?? 0) || 1,
      quantity: Number(med.quantity ?? 0) || 0,
      expiry: med.expiry || null,
      category: String(med.category || "General"),
    }));

    console.log(`Cleaned & safe: ${cleaned.length} medicines`);
    return cleaned;
  } catch (error) {
    console.error("getAllMedicines failed:", error);
    return [];
  }
};
export const getMedicineById = async (id) => {
  const res = await axios.get(`${BASE_MEDICINES}/${id}`);
  return res.data;
};

export const updateMedicine = async (id, data) => {
  const res = await axios.put(`${BASE_MEDICINES}/${id}`, data);
  return res.data.data;
};

export const deleteMedicine = async (id) => {
  const res = await axios.delete(`${BASE_MEDICINES}/${id}`);
  return res.data;
};

export const sellMedicine = async (id, quantitySold, sellType = "packages") => {
  try {
    console.log("🟢 API Call - Sell Medicine:", {
      id,
      quantitySold,
      sellType,
    });

    const res = await axios.patch(`${BASE_MEDICINES}/${id}/sell`, {
      quantitySold,
      sellType,
    });

    console.log("🟢 API Success:", res.data);
    return res.data;
  } catch (error) {
    console.error("🔴 API Error Complete Response:", {
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers,
      config: error.config,
    });

    // Throw the complete error
    throw error;
  }
};

export const getSoldMedicines = async () => {
  const res = await axios.get(`${BASE_MEDICINES}/sold/records`);
  return res.data;
};

export const getSalesByMedicine = async (id) => {
  const res = await axios.get(`${BASE_MEDICINES}/sales/${id}`);
  return res.data;
};

export const getSalesWithPagination = async (
  page = 1,
  limit = 10,
  searchTerm = ""
) => {
  try {
    console.log(`🟢 API Call - Sales with Pagination:`, {
      page,
      limit,
      searchTerm,
    });

    const res = await axios.get(`${BASE_MEDICINES}/sold/records`, {
      params: { page, limit, q: searchTerm },
    });

    console.log("🟢 Sales data fetched successfully");
    return res.data;
  } catch (error) {
    console.error("🔴 Error fetching sales:", error);
    throw error;
  }
};

/* ==============================
   👨‍💻 Admin APIs
============================== */
export const loginAdmin = async (formData) => {
  const res = await axios.post(`${BASE_ADMIN}/login`, formData, {
    withCredentials: true,
  });
  return res.data;
};

export const logoutAdmin = async () => {
  const res = await axios.post(`${BASE_ADMIN}/logout`, null, {
    withCredentials: true,
  });
  return res.data;
};

export const getCurrentAdmin = async () => {
  const res = await axios.get(`${BASE_ADMIN}/me`, { withCredentials: true });
  return res.data;
};

/* ==============================
   🧾 Invoices APIs
============================== */
export const getAllInvoices = async () => {
  const res = await axios.get(BASE_INVOICES);
  return res.data;
};
