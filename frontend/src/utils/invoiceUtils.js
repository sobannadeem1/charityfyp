// src/utils/invoiceUtils.js
import { createInvoice } from "../api/medicineapi";
import charityLogo from "../assets/logo.png";
import { toast } from "sonner";

const getUnitsPerPackage = (packSize) => {
  if (!packSize) return 1;
  const match = packSize.toString().toLowerCase().match(/\b(\d+)\b/);
  return match ? parseInt(match[1], 10) : 1;
};

// NOW ACCEPTS FULL PATIENT DETAILS OBJECT
export const printInvoice = async (saleData, patientDetails = {}) => {
  const {
    name = "Walk-in Patient",
    gender = "",
    address = "",
    phoneNumber = "",
    cnic = "",
    age,
  } = patientDetails;

  const nameToUse = name.trim() || "Walk-in Patient";
  const genderToUse = gender.trim() || "";
  const addressToUse = address.trim() || "Not Provided";
  const phoneToUse = phoneNumber.trim() || "Not Provided";
  const cnicToUse = cnic.trim() || "Not Provided";
  const ageToUse = age !== undefined ? age : "Not Provided";

  try {
    const isGroup = Array.isArray(saleData.items);
    const group = isGroup
      ? saleData
      : {
          items: [saleData],
          soldAt: new Date().toISOString(),
          soldBy: "Staff",
        };

    const grandTotal = group.items.reduce((sum, item) => {
      const units = getUnitsPerPackage(item.packSize);
      const type = item.sellType || "packages";
      const qty = Number(item.quantitySold || 0);
      const price = Number(item.salePrice || 0);

      return type === "units" ? sum + qty * (price / units) : sum + qty * price;
    }, 0);

    // SAVE INVOICE — SEND ALL PATIENT DETAILS
    try {
      await createInvoice({
        patientName: nameToUse,
        patientGender: genderToUse,
        patientAddress: addressToUse,
        phoneNumber: phoneToUse,
        cnic: cnicToUse,
        age: ageToUse,
        items: group.items.map((item) => ({
          medicine: item._id || null,
          name: item.name,
          category: item.category || "",
          manufacturer: item.manufacturer || "",
          strength: item.strength || "",
          packSize: item.packSize || "Standard",
          sellType: item.sellType || "packages",
          quantitySold: item.quantitySold,
          salePrice: item.salePrice,
          totalAmount:
            item.sellType === "units"
              ? item.quantitySold * (item.salePrice / getUnitsPerPackage(item.packSize))
              : item.quantitySold * item.salePrice,
        })),
        totalRevenue: grandTotal,
      });
    } catch (e) {
      console.warn("Invoice save failed, continuing to print...");
    }

    const itemsRows = group.items
      .map((item) => {
        const units = getUnitsPerPackage(item.packSize);
        const type = item.sellType || "packages";
        const unitPrice = type === "units" ? item.salePrice / units : item.salePrice;
        const total =
          type === "units" ? item.quantitySold * (item.salePrice / units) : item.quantitySold * item.salePrice;

        return `
        <tr class="item-row">
          <td class="item-details">
            <div class="item-name">${item.name}</div>
            <div class="item-pack">${item.packSize || "Standard Pack"}${
          item.strength ? ` • ${item.strength}` : ""
        }</div>
          </td>
          <td class="item-qty">
            <div class="qty-main">${
              type === "units"
                ? `${item.quantitySold} units`
                : `${item.quantitySold} packages`
            }</div>
            ${
              type === "units"
                ? `<small class="qty-sub blue">(${(
                    item.quantitySold / units
                  ).toFixed(1)} packages)</small>`
                : `<small class="qty-sub green">(${item.quantitySold * units} units)</small>`
            }
          </td>
          <td class="item-unit">
            PKR ${unitPrice.toFixed(2)}
            <div class="unit-sub">per ${type === "units" ? "unit" : "package"}</div>
          </td>
          <td class="item-total">PKR ${total.toFixed(2)}</td>
        </tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Invoice - Noor Sardar HealthCare</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  :root {
    --primary: #3498db;
    --primary-dark: #2980b9;
    --success: #27ae60;
    --success-light: #2ecc71;
    --text-dark: #2c3e50;
    --text-light: #7f8c8d;
    --bg-light: #f5f7fa;
    --white: #ffffff;
  }
  html { font-size: 14px; zoom: 0.9; }
  body { max-width: 900px; margin: 0 auto; transform: scale(0.95); transform-origin: top center; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: var(--bg-light); color: var(--text-dark); padding: 2rem; }
  .container { max-width: 60rem; margin: 0 auto; background: var(--white); border-radius: 1.2rem; overflow: hidden; border: 0.3rem solid var(--primary); box-shadow: 0 1.5rem 3.5rem rgba(0,0,0,0.15); }
  .header { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: var(--white); text-align: center; padding: 3rem 2rem; }
  .header h1 { font-size: 2.2rem; font-weight: 700; }
  .header h2 { font-size: 1.3rem; opacity: 0.95; }
  .invoice-id { margin-top: 1rem; background: rgba(255,255,255,0.25); border-radius: 2rem; padding: 0.6rem 1.5rem; font-size: 1rem; display: inline-block; font-weight: 600; }
  .info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5rem; background: #f0f8ff; padding: 2rem 2.5rem; } /* ← Changed to 3 columns */
  .info-box { background: var(--white); border-left: 0.4rem solid var(--primary); border-radius: 1rem; padding: 1.4rem; box-shadow: 0 0.5rem 1.5rem rgba(0,0,0,0.1); }
  .info-box strong { display: block; font-size: 0.8rem; color: var(--text-light); text-transform: uppercase; margin-bottom: 0.4rem; }
  .info-box div { font-size: 1rem; font-weight: 600; }
  .patient-name { font-size: 1.4rem; font-weight: bold; color: #27ae60; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { padding: 1rem 1.2rem; border-bottom: 0.05rem solid #e0e0e0; vertical-align: top; }
  th { background: var(--primary); color: var(--white); font-size: 0.95rem; font-weight: 600; text-align: left; }
  th:nth-child(2), td:nth-child(2) { text-align: center; width: 25%; }
  th:nth-child(3), td:nth-child(3), th:nth-child(4), td:nth-child(4) { text-align: right; width: 20%; }
  td:first-child { width: 35%; }
  .qty-sub.blue { color: #2563eb; font-size: 0.8rem; display: block; }
  .qty-sub.green { color: #16a34a; font-size: 0.8rem; display: block; }
  .total-row td { background: linear-gradient(135deg, var(--success), var(--success-light)); color: white; padding: 2rem 1.2rem !important; font-size: 1.5rem !important; font-weight: 700; text-align: right; }
  .print-area { text-align: center; padding: 2.5rem; background: #f8f9fa; }
  .print-btn { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: var(--white); border: none; padding: 1rem 3rem; font-size: 1.1rem; border-radius: 2rem; cursor: pointer; font-weight: 600; }
  .footer { text-align: center; background: var(--text-dark); color: var(--white); padding: 2rem; font-size: 0.9rem; }
  @media print { body { padding: 0; background: white; } .print-area { display: none; } .container { border: none; box-shadow: none; } }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="display: flex; flex-direction: column; align-items: center; gap: 0.8rem;">
        <img src="${charityLogo}" alt="Noor Sardar HealthCare Logo" style="height: 85px; max-width: 220px; object-fit: contain; background: white; padding: 0.5rem; border-radius: 0.8rem;" />
        <h1>Noor Sardar HealthCare Center</h1>
        <h2>MEDICINE SALES INVOICE</h2>
        <div class="invoice-id">Invoice #INV-${new Date(group.soldAt).getTime().toString(36).toUpperCase().slice(-8)}</div>
      </div>
    </div>

    <div class="info">
      <div class="info-box">
        <strong>Patient Name</strong>
        <div class="patient-name">${nameToUse}</div>
      </div>
      <div class="info-box">
        <strong>Gender</strong>
        <div>${genderToUse}</div>
      </div>
      <div class="info-box">
        <strong>Age</strong>
        <div>${ageToUse}</div>
      </div>
      <div class="info-box">
        <strong>Phone Number</strong>
        <div>${phoneToUse}</div>
      </div>
      <div class="info-box">
        <strong>CNIC</strong>
        <div>${cnicToUse}</div>
      </div>
      <div class="info-box">
        <strong>Address</strong>
        <div>${addressToUse}</div>
      </div>
      <div class="info-box">
        <strong>Sale Date & Time</strong>
        <div>
          ${new Date(group.soldAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}<br>
          ${new Date(group.soldAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })}
        </div>
      </div>
      <div class="info-box">
        <strong>Served By</strong>
        <div>${group.soldBy}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Medicine Details</th>
          <th>Quantity Sold</th>
          <th>Unit Price</th>
          <th>Total Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
        <tr class="total-row">
          <td colspan="3">
            GRAND TOTAL
            ${group.items.length > 1 ? `<div class="items-note">(${group.items.length} items)</div>` : ""}
          </td>
          <td>PKR ${grandTotal.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div class="print-area">
      <button class="print-btn" onclick="window.print()">PRINT INVOICE</button>
      <p style="margin-top:0.8rem; color:#666; font-size:0.9rem;">Press Ctrl + P to print</p>
    </div>

    <div class="footer">
      <p>Thank you for choosing <strong>Noor Sardar HealthCare Center</strong></p>
      <p style="margin-top:0.5rem; opacity:0.8;">Computer-generated invoice • No signature required</p>
    </div>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=1000,height=900");
    win.document.write(html);
    win.document.close();
    win.focus();

    toast.success(`Invoice generated for ${nameToUse}`);
  } catch (error) {
    console.error("Invoice error:", error);
    toast.error("Failed to print invoice");
  }
};
