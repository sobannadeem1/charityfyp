const BASE_MEDICINES = "https://charityfyp-jm4i.vercel.app/api/medicines";
const BASE_ADMIN = "https://charityfyp-jm4i.vercel.app/api/admin";
const BASE_INVOICES = "https://charityfyp-jm4i.vercel.app/api/invoices";

axios.defaults.withCredentials = true;
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
