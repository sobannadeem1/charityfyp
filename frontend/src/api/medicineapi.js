import axios from "axios";

// Detect environment
const isLocal = window.location.hostname === "localhost";
export const BASE_URL = isLocal
  ? "http://localhost:5000"
  : "https://charityfyp-jm4i.vercel.app";

const BASE_MEDICINES = `${BASE_URL}/medicines`;
const BASE_ADMIN = `${BASE_URL}/admin`;
const BASE_INVOICES = `${BASE_URL}/invoices`;
const BASE_DONATIONS = `${BASE_URL}/donations`;

// Always send cookies for auth
axios.defaults.withCredentials = true;

/* ==============================
   Medicines APIs
============================== */

export const addMedicine = async (data) => {
  const res = await axios.post(BASE_MEDICINES, data);
  return res.data;
};

// MAIN FIX: Now supports ALL filters + abort controller
export const getMedicinesWithPagination = async ({
  page = 1,
  limit = 10,
  search = "",
  category = "",
  expiryMonth = "",
  stockStatus = "",
  sortBy = "date-newest",
  signal // for aborting previous requests
} = {}) => {
  try {
    console.log("Calling API with filters:", {
      page,
      limit,
      search,
      category,
      expiryMonth,
      stockStatus,
      sortBy,
    });

    const params = new URLSearchParams();
    params.append("page", page);
    params.append("limit", limit);

    if (search) params.append("search", search);
    if (category && category !== "all") params.append("category", category);
    if (expiryMonth && expiryMonth !== "all") params.append("expiryMonth", expiryMonth);
    if (stockStatus && stockStatus !== "all") params.append("stockStatus", stockStatus);
    params.append("sortBy", sortBy);

    const res = await axios.get(`${BASE_MEDICINES}/`, {
      params,
      signal, // This cancels previous request when typing fast
    });

    console.log("Medicines fetched successfully", res.data);
    return res.data; // { success: true, data: [...], pagination: { ... } }
  } catch (error) {
    if (error.name === "AbortError" || error.name === "CanceledError") {
      console.log("Request canceled (normal during fast typing)");
      return null;
    }
    console.error("Error fetching medicines:", error);
    throw error;
  }
};

// Keep this for dashboard/low-stock notifications (fetches all)
export const getAllMedicines = async () => {
  try {
    const response = await getMedicinesWithPagination({
      page: 1,
      limit: 10000,
      search: "",
    });

    if (!response || !response.data) return [];

    const medicines = Array.isArray(response.data) ? response.data : response.data;

    return medicines.map((med) => ({
      ...med,
      name: String(med.name || "Unknown").trim(),
      quantity: Number(med.quantity ?? 0),
      unitsAvailable: Number(med.unitsAvailable ?? med.quantity ?? 0),
      unitsPerPackage: Number(med.unitsPerPackage ?? 1),
      expiry: med.expiry || null,
      category: String(med.category || "General"),
    }));
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
  return res.data.data || res.data;
};

export const deleteMedicine = async (id) => {
  const res = await axios.delete(`${BASE_MEDICINES}/${id}`);
  return res.data;
};

export const sellMedicine = async (id, quantitySold, sellType = "packages") => {
  try {
    const res = await axios.patch(`${BASE_MEDICINES}/${id}/sell`, {
      quantitySold,
      sellType,
    });
    return res.data;
  } catch (error) {
    console.error("Sell error:", error.response?.data || error);
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
export const bulkSellMedicines = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("No items to sell");
  }

  try {
    const response = await axios.post(`${BASE_MEDICINES}/sales/bulk`, { items });

    // Optional: Show success toast here or let component do it
    // toast.success(`Bulk sale successful! ${response.data.data.transactionId}`);

    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Bulk sell failed";
    throw new Error(message);
  }
};

export const getSalesWithPagination = async (params = {}) => {
  try {
    const res = await axios.get(`${BASE_MEDICINES}/sold/records`, { params });
    return res.data;
  } catch (error) {
    console.error("Error fetching sales:", error);
    throw error;
  }
};


/* ==============================
   Admin APIs
============================== */
export const loginAdmin = async (formData) => {
  const res = await axios.post(`${BASE_ADMIN}/login`, formData);
  return res.data;
};

export const logoutAdmin = async () => {
  const res = await axios.post(`${BASE_ADMIN}/logout`);
  return res.data;
};

export const getCurrentAdmin = async () => {
  const res = await axios.get(`${BASE_ADMIN}/me`);
  return res.data;
};

/* ==============================
   Invoices APIs
============================== */
export const createInvoice = async (invoiceData) => {
  try {
    const res = await axios.post(`${BASE_INVOICES}/`, invoiceData);
    return res.data;
  } catch (error) {
    console.error("Error creating invoice:", error);
    throw error.response?.data || error;
  }
};
export const getAllInvoices = async ({
  page = 1,
  limit = 10,
  q = "",
  month = "",
  sort = "date-newest",
}) => {
  try {
    const res = await axios.get(`${BASE_INVOICES}/`, {
      params: {
        page,
        limit,
        q: q.trim() || undefined,
        month: month !== "all" ? month : undefined,
        sort,
      },
    });
    return res.data; // { success, data[], pagination{}, summary{} }
  } catch (error) {
    console.error("Error fetching invoices:", error);
    throw error.response?.data || error;
  }
};

export const getInvoiceById = async (id) => {
  try {
    const res = await axios.get(`${BASE_INVOICES}/${id}`);
    return res.data; // { success, data: invoice }
  } catch (error) {
    console.error("Error fetching invoice:", error);
    throw error.response?.data || error;
  }
};