import axios from "axios";

const BASE_URL = "http://localhost:5000/api/medicines";

// Always include cookies (for authMiddleware)
axios.defaults.withCredentials = true;

// ✅ Add new medicine
export const addMedicine = async (data) => {
  try {
    const response = await axios.post(BASE_URL, data);
    return response.data;
  } catch (error) {
    console.error("Error adding medicine:", error);
    throw error;
  }
};

// ✅ Get all medicines
export const getAllMedicines = async () => {
  try {
    const response = await axios.get(BASE_URL);
    return response.data;
  } catch (error) {
    console.error("Error fetching medicines:", error);
    throw error;
  }
};

// ✅ Get single medicine by ID
export const getMedicineById = async (id) => {
  try {
    const response = await axios.get(`${BASE_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching medicine:", error);
    throw error;
  }
};

// ✅ Update medicine
export const updateMedicine = async (id, data) => {
  try {
    const response = await axios.put(`${BASE_URL}/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Error updating medicine:", error);
    throw error;
  }
};

// ✅ Delete medicine
export const deleteMedicine = async (id) => {
  try {
    const response = await axios.delete(`${BASE_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting medicine:", error);
    throw error;
  }
};

// ✅ Sell medicine (reduce quantity)
export const sellMedicine = async (id, quantitySold) => {
  try {
    const response = await axios.patch(`${BASE_URL}/${id}/sell`, {
      quantitySold,
    });
    return response.data;
  } catch (error) {
    console.error("Error selling medicine:", error);
    throw error;
  }
};
