// src/api/reportsapi.js

import axios from "axios";
import { BASE_URL } from "./medicineapi";  // same BASE_URL reuse kar rahe hain

// No need to set withCredentials again — already global set hai in medicineapi.js

const BASE_REPORTS = `${BASE_URL}/reports`;

/* ==============================
   Reports APIs
============================== */

// 1. All Medicines Stock Report (with filters & pagination)
export const getAllStockReport = async ({
  page = 1,
  limit = 50,
  search = "",
  category = "",
  signal, // for aborting if needed (optional)
} = {}) => {
  try {
    console.log("Fetching stock report with:", { page, limit, search, category });

    const params = new URLSearchParams();
    params.append("page", page);
    params.append("limit", limit);
    if (search) params.append("search", search.trim());
    if (category && category !== "all") params.append("category", category);

    const res = await axios.get(`${BASE_REPORTS}/stock`, {
      params,
      signal, // cancel previous if fast filter change
    });

    console.log("Stock report fetched:", res.data);
    return res.data; // { success, summary, medicines, pagination }
  } catch (error) {
    if (error.name === "AbortError" || error.name === "CanceledError") {
      console.log("Stock report request canceled (normal)");
      return null;
    }
    console.error("Error fetching stock report:", error.response?.data || error);
    throw error.response?.data || { message: "Failed to load stock report" };
  }
};

// 2. Specific Medicine Report
export const getSpecificMedicineReport = async (medicineId) => {
  if (!medicineId) {
    throw new Error("Medicine ID is required");
  }

  try {
    const res = await axios.get(`${BASE_REPORTS}/medicine/${medicineId}`);
    return res.data; // { success, medicine, history, reportId? }
  } catch (error) {
    console.error("Error fetching specific medicine report:", error.response?.data || error);
    throw error.response?.data || { message: "Failed to load medicine details" };
  }
};

// 3. Expiry Report
export const getExpiryReport = async (days = 90) => {
  try {
    const res = await axios.get(`${BASE_REPORTS}/expiry`, {
      params: { days: Number(days) },
    });
    return res.data; // { success, summary, nearExpiry, expired }
  } catch (error) {
    console.error("Error fetching expiry report:", error.response?.data || error);
    throw error.response?.data || { message: "Failed to load expiry report" };
  }
};

// 4. Low Stock Report
export const getLowStockReport = async (threshold = 50) => {
  try {
    const res = await axios.get(`${BASE_REPORTS}/low-stock`, {
      params: { threshold: Number(threshold) },
    });
    return res.data; // { success, summary, lowStockItems }
  } catch (error) {
    console.error("Error fetching low stock report:", error.response?.data || error);
    throw error.response?.data || { message: "Failed to load low stock report" };
  }
};

// 5. Get Saved Report by ID (if you want to view old generated reports)
export const getSavedReportById = async (reportId) => {
  if (!reportId) {
    throw new Error("Report ID is required");
  }

  try {
    const res = await axios.get(`${BASE_REPORTS}/${reportId}`);
    return res.data; // { success, report }
  } catch (error) {
    console.error("Error fetching saved report:", error.response?.data || error);
    throw error.response?.data || { message: "Failed to load saved report" };
  }
};