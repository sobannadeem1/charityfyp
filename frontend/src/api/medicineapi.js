import axios from "axios";

const BASE_URL = "http://localhost:5000/api/medicines"; // your backend route

// Automatically include cookies (for authMiddleware)
axios.defaults.withCredentials = true;

// ✅ Add new medicine (with image)
export const addMedicine = async (formData) => {
  try {
    const response = await axios.post(BASE_URL, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
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

// ✅ Update existing medicine (with optional new image)
export const updateMedicine = async (id, formData) => {
  try {
    const response = await axios.put(`${BASE_URL}/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
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
// ✅ Sell medicine (decrease quantity)
export const sellMedicine = async (id, quantitySold) => {
  try {
    const res = await axios.patch(`${BASE_URL}/${id}/sell`, { quantitySold });
    return res.data;
  } catch (error) {
    console.error("Error selling medicine:", error);
    throw error;
  }
};
