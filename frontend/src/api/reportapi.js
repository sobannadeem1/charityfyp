// src/api/reportsapi.js

import axios from "axios";
import { BASE_URL } from "./medicineapi";

const BASE_REPORTS = `${BASE_URL}/reports`;

export const getAllStockReport = async ({
  page = 1,
  limit = 50,
  search = "",
  category = "",
  status = "", // Added this
  fromDate = "",
  toDate = "",
  signal,
} = {}) => {
  try {
    const params = new URLSearchParams();
    params.append("page", page);
    params.append("limit", limit);
    if (search) params.append("search", search.trim());
    if (category && category !== "") params.append("category", category);
    if (status) params.append("status", status); // Added this
    if (fromDate) params.append("fromDate", fromDate);
    if (toDate) params.append("toDate", toDate);

    const res = await axios.get(`${BASE_REPORTS}/stock`, { params, signal });
    return res.data;
  }
  catch (error) {
  if (error.name === "AbortError" || error.name === "CanceledError") {
    return null;
  }
  console.error("Error fetching stock report:", error.response?.data || error);
  throw error.response?.data || { message: "Failed to load stock report" };
}
}; 
// Baaki functions same rakh sakte ho (no change)
export const getSpecificMedicineReport = async (medicineId) => {
  if (!medicineId) throw new Error("Medicine ID is required");
  const res = await axios.get(`${BASE_REPORTS}/medicine/${medicineId}`);
  return res.data;
};

export const getExpiryReport = async (days = 90) => {
  const res = await axios.get(`${BASE_REPORTS}/expiry`, { params: { days } });
  return res.data;
};

export const getLowStockReport = async (threshold = 50) => {
  const res = await axios.get(`${BASE_REPORTS}/low-stock`, { params: { threshold } });
  return res.data;
};