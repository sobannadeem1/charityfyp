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

export const getAllMedicines = async () => {
  const res = await axios.get(BASE_MEDICINES);
  return res.data;
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
  const res = await axios.patch(`${BASE_MEDICINES}/${id}/sell`, {
    quantitySold,
    sellType,
  });
  return res.data;
};

export const getSoldMedicines = async () => {
  const res = await axios.get(`${BASE_MEDICINES}/sold/records`);
  return res.data;
};

export const getSalesByMedicine = async (id) => {
  const res = await axios.get(`${BASE_MEDICINES}/sales/${id}`);
  return res.data;
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
