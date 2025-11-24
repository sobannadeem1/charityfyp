import axios from "axios";
import { BASE_URL } from "./medicineapi";

/* ==============================
   Donation APIs
============================== */
const BASE_DONATIONS = `${BASE_URL}/donations`;
export const createDonation = async (donationData) => {
  try {
    const res = await axios.post(BASE_DONATIONS, donationData);
    return res.data;
  } catch (error) {
    console.error("Error creating donation:", error.response?.data || error);
    throw error.response?.data || error;
  }
};

export const getAllDonations = async ({
  page = 1,
  limit = 10,
  status = "",
  type = "",
  search = "",
} = {}) => {
  try {
    const res = await axios.get(BASE_DONATIONS, {
      params: { page, limit, status, type, search },
    });
    return res.data;
  } catch (error) {
    console.error("Error fetching donations:", error.response?.data || error);
    throw error.response?.data || error;
  }
};

export const getDonationById = async (id) => {
  try {
    const res = await axios.get(`${BASE_DONATIONS}/${id}`);
    return res.data;
  } catch (error) {
    console.error("Error fetching donation:", error);
    throw error.response?.data || error;
  }
};

export const updateDonationStatus = async (id, statusData) => {
  try {
    const res = await axios.put(`${BASE_DONATIONS}/${id}/status`, statusData);
    return res.data;
  } catch (error) {
    console.error("Error updating status:", error.response?.data || error);
    throw error.response?.data || error;
  }
};

export const deleteDonation = async (id) => {
  try {
    const res = await axios.delete(`${BASE_DONATIONS}/${id}`);
    return res.data;
  } catch (error) {
    console.error("Error deleting donation:", error);
    throw error.response?.data || error;
  }
};
