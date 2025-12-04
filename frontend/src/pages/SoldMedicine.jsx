import React, { useEffect, useState, useCallback, useMemo } from "react";
import { getSalesWithPagination } from "../api/medicineapi.js"; // You'll need to create this API function
import "../styles/SoldMedicine.css";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { FaChartBar, FaDollarSign } from "react-icons/fa";

export default function SoldMedicines() {
  const [soldRecords, setSoldRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [sortSalesBy, setSortSalesBy] = useState("date-newest");
  const [filterMonth, setFilterMonth] = useState("all");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const pageSize = 10;

  const navigate = useNavigate();

  // ✅ Keep all your existing calculation functions (they're working fine)
  const getUnitsPerPackage = useCallback((packSize) => {
    if (!packSize) return 1;
    const packSizeStr = packSize.toString().toLowerCase();
    const match = packSizeStr.match(/\b(\d+)\b/);
    return match ? parseInt(match[1]) : 1;
  }, []);
  const getPricePerUnit = useCallback(
    (salePrice, packSize) => {
      if (!salePrice) return 0;
      const unitsPerPackage = getUnitsPerPackage(packSize);
      return unitsPerPackage <= 0 ? salePrice : salePrice / unitsPerPackage;
    },
    [getUnitsPerPackage]
  );
  const calculateTotalAmount = useCallback(
    (record) => {
      if (record.total && record.total > 0) {
        return Number(record.total);
      }

      const sellType = record.originalSellType || record.sellType;

      if (sellType === "packages") {
        return record.quantitySold * record.salePrice;
      } else {
        const unitPrice = getPricePerUnit(record.salePrice, record.packSize);
        return record.quantitySold * unitPrice;
      }
    },
    [getPricePerUnit]
  );
  const displayedSales = useMemo(() => {
    let list = [...soldRecords];

    // Month filter
    if (filterMonth !== "all") {
      const [year, month] = filterMonth.split("-");
      list = list.filter((r) => {
        const d = new Date(r.soldAt);
        return d.getFullYear() === +year && d.getMonth() + 1 === +month;
      });
    }

    // Sorting
    list.sort((a, b) => {
      switch (sortSalesBy) {
        case "date-newest":
          return new Date(b.soldAt) - new Date(a.soldAt);
        case "date-oldest":
          return new Date(a.soldAt) - new Date(b.soldAt);
        case "revenue-high":
          return calculateTotalAmount(b) - calculateTotalAmount(a);
        case "revenue-low":
          return calculateTotalAmount(a) - calculateTotalAmount(b);
        case "quantity-high":
          return b.quantitySold - a.quantitySold;
        default:
          return 0;
      }
    });

    return list;
  }, [soldRecords, filterMonth, sortSalesBy, calculateTotalAmount]);
  // FIXED: Group FIRST, then apply filters/sorting on GROUPS
  const groupedDisplayedSales = useMemo(() => {
    // Step 1: Group ALL records by exact timestamp + soldBy (before any filtering)
    const allGroups = {};
    soldRecords.forEach((record) => {
      const timeKey = new Date(record.soldAt).toISOString().slice(0, 19);
      const key = `${timeKey}_${record.soldBy || "unknown"}`;

      if (!allGroups[key]) {
        allGroups[key] = {
          key,
          soldAt: record.soldAt,
          soldBy: record.soldBy || "Staff",
          items: [],
          timestamp: new Date(record.soldAt).getTime(), // for sorting
        };
      }
      allGroups[key].items.push(record);
    });

    let groups = Object.values(allGroups);

    // Step 2: Apply month filter on group level
    if (filterMonth !== "all") {
      const [year, month] = filterMonth.split("-");
      const filterYear = +year;
      const filterMonthNum = +month;

      groups = groups.filter((group) => {
        const d = new Date(group.soldAt);
        return (
          d.getFullYear() === filterYear && d.getMonth() + 1 === filterMonthNum
        );
      });
    }

    // Step 3: Sorting by group (not individual items)
    groups.sort((a, b) => {
      switch (sortSalesBy) {
        case "date-newest":
          return b.timestamp - a.timestamp;
        case "date-oldest":
          return a.timestamp - b.timestamp;
        case "revenue-high":
          const totalA = a.items.reduce(
            (s, i) => s + calculateTotalAmount(i),
            0
          );
          const totalB = b.items.reduce(
            (s, i) => s + calculateTotalAmount(i),
            0
          );
          return totalB - totalA;
        case "revenue-low":
          const totalA2 = a.items.reduce(
            (s, i) => s + calculateTotalAmount(i),
            0
          );
          const totalB2 = b.items.reduce(
            (s, i) => s + calculateTotalAmount(i),
            0
          );
          return totalA2 - totalB2;
        case "quantity-high":
          const qtyA = a.items.reduce((s, i) => s + i.quantitySold, 0);
          const qtyB = b.items.reduce((s, i) => s + i.quantitySold, 0);
          return qtyB - qtyA;
        default:
          return 0;
      }
    });

    return groups;
  }, [soldRecords, filterMonth, sortSalesBy, calculateTotalAmount]);

  const getDisplayUnitPrice = useCallback(
    (record) => {
      const sellType = record.originalSellType || record.sellType;
      if (sellType === "units") {
        return getPricePerUnit(record.salePrice, record.packSize);
      }
      return record.salePrice; // packages
    },
    [getPricePerUnit]
  );

  const getUnitLabel = useCallback((record) => {
    const sellType = record.originalSellType || record.sellType;
    return sellType === "units" ? "per unit" : "per package";
  }, []);

  const getSaleTypeInfo = useCallback(
    (record) => {
      const originalSellType = record.originalSellType || record.sellType;
      const unitsPerPackage = getUnitsPerPackage(record.packSize);

      if (originalSellType === "units") {
        const packagesEquivalent = record.quantitySold / unitsPerPackage;
        const unitPrice = getPricePerUnit(record.salePrice, record.packSize);
        return {
          type: "units",
          displayText: `${record.quantitySold} units`,
          packagesEquivalent: packagesEquivalent.toFixed(1),
          calculation: `${record.quantitySold} units × PKR ${unitPrice.toFixed(
            2
          )}`,
        };
      } else {
        const totalUnits = record.quantitySold * unitsPerPackage;
        return {
          type: "packages",
          displayText: `${record.quantitySold} packages`,
          totalUnits: totalUnits,
          calculation: `${
            record.quantitySold
          } packages × PKR ${record.salePrice.toFixed(2)}`,
        };
      }
    },
    [getUnitsPerPackage, getPricePerUnit]
  );

  // ✅ FIXED: Fetch with pagination - now handles both normal and search
  const fetchSoldRecords = async (page = 1, searchTerm = "") => {
    try {
      setLoading(true);

      let res;
      if (searchTerm.trim()) {
        // ✅ FIXED: Correct parameter order - searchTerm, page, pageSize
        res = await getSalesWithPagination(page, pageSize, searchTerm);
        setIsSearching(true);
      } else {
        // ✅ FIXED: Correct parameter order - page, pageSize
        res = await getSalesWithPagination(page, pageSize);
        setIsSearching(false);
      }

      const data = Array.isArray(res.data) ? res.data : res.data || [];

      console.log("📦 LOADED RECORDS:", {
        search: searchTerm,
        page: page,
        records: data.length,
        pagination: res.pagination,
        isSearching: !!searchTerm.trim(),
      });

      setSoldRecords(data);

      // Set pagination info from backend
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
        setTotalRecords(
          res.pagination.totalSales || res.pagination.totalRecords || 0
        );
        setCurrentPage(res.pagination.currentPage || page);
      }

      const total = data.reduce(
        (acc, item) => acc + calculateTotalAmount(item),
        0
      );
      setTotalRevenue(total);

      setTotalRevenue(total);
    } catch (err) {
      console.error("Error fetching records:", err);
      toast.error("Failed to load records.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED: Load data when component mounts or page/search changes
  useEffect(() => {
    fetchSoldRecords(currentPage, search);
  }, [currentPage]);

  // ✅ UPDATED: Search functionality with server-side search
  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);

    // Reset to page 1 when search changes
    setCurrentPage(1);

    // Use debounce to avoid too many API calls
    const timeoutId = setTimeout(() => {
      fetchSoldRecords(1, val);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  // ✅ Clear search and return to normal pagination
  const clearSearch = () => {
    setSearch("");
    setCurrentPage(1);
    fetchSoldRecords(1, "");
  };

  // ✅ Pagination controls
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const generateInvoice = useCallback(
    (saleRecordOrGroup) => {
      try {
        const isGroup = Array.isArray(saleRecordOrGroup.items);
        const group = isGroup
          ? saleRecordOrGroup
          : {
              items: [saleRecordOrGroup],
              soldAt: saleRecordOrGroup.soldAt,
              soldBy: saleRecordOrGroup.soldBy || "Staff",
            };

        const grandTotal = group.items.reduce(
          (acc, item) => acc + calculateTotalAmount(item),
          0
        );

        const itemsRows = group.items
          .map((item) => {
            const info = getSaleTypeInfo(item);
            const unitPrice = getDisplayUnitPrice(item);
            const unitLabel =
              item.originalSellType || item.sellType === "units"
                ? "unit"
                : "package";
            const total = calculateTotalAmount(item);

            return `
        <tr class="item-row">
          <td class="item-details">
            <div class="item-name">${item.name}</div>
            <div class="item-pack">${item.packSize || "Standard Pack"}${
              item.strength ? ` • ${item.strength}` : ""
            }</div>
          </td>
          <td class="item-qty">
            <div class="qty-main">${info.displayText}</div>
            ${
              info.type === "units"
                ? `<small class="qty-sub blue">(${info.packagesEquivalent} packages)</small>`
                : ""
            }
            ${
              info.type === "packages" && info.totalUnits
                ? `<small class="qty-sub green">(${info.totalUnits} units)</small>`
                : ""
            }
          </td>
          <td class="item-unit">
            PKR ${unitPrice.toFixed(2)}
            <div class="unit-sub">per ${
              info.type === "units" ? "unit" : "package"
            }</div>
          </td>
          <td class="item-total">
            PKR ${total.toFixed(2)}
          </td>
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
html {
  font-size: 14px; /* Normalize rem scale (was default 16px) */
  zoom: 0.9; /* Compensates for browser zoom when opened in new window */
}

body {
  max-width: 900px;
  margin: 0 auto;
  transform: scale(0.95);
  transform-origin: top center;
}

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg-light);
      color: var(--text-dark);
      padding: 2rem;
    }

    .container {
      max-width: 60rem;
      margin: 0 auto;
      background: var(--white);
      border-radius: 1.2rem;
      overflow: hidden;
      border: 0.3rem solid var(--primary);
      box-shadow: 0 1.5rem 3.5rem rgba(0, 0, 0, 0.15);
    }

    .header {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: var(--white);
      text-align: center;
      padding: 3rem 2rem;
    }

    .header h1 { font-size: 2.2rem; font-weight: 700; }
    .header h2 { font-size: 1.3rem; opacity: 0.95; }
    .invoice-id {
      margin-top: 1rem;
      background: rgba(255,255,255,0.25);
      border-radius: 2rem;
      padding: 0.6rem 1.5rem;
      font-size: 1rem;
      display: inline-block;
      font-weight: 600;
    }

    .info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      background: #f0f8ff;
      padding: 2rem 2.5rem;
    }

    .info-box {
      background: var(--white);
      border-left: 0.4rem solid var(--primary);
      border-radius: 1rem;
      padding: 1.4rem;
      box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.1);
    }

    .info-box strong {
      display: block;
      font-size: 0.8rem;
      color: var(--text-light);
      text-transform: uppercase;
      margin-bottom: 0.4rem;
    }

    .info-box div { font-size: 1rem; font-weight: 600; }

   table {
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  margin: 0 auto;
  table-layout: fixed; /* Ensures columns align perfectly */
}

th, td {
  padding: 1rem 1.2rem;
  border-bottom: 0.05rem solid #e0e0e0;
  vertical-align: top;
  word-wrap: break-word;
}

th {
  background: var(--primary);
  color: var(--white);
  font-size: 0.95rem;
  font-weight: 600;
  text-align: left;
}

th:nth-child(2), td:nth-child(2) {
  text-align: center;
  width: 25%;
}

th:nth-child(3), td:nth-child(3),
th:nth-child(4), td:nth-child(4) {
  text-align: right;
  width: 20%;
}

td:first-child {
  width: 35%;
}

.item-total {
  font-weight: 700;
  color: var(--success);
  font-size: 1.1rem;
}

.total-row td {
  background: linear-gradient(135deg, var(--success), var(--success-light));
  color: white;
  padding: 2rem 1.2rem !important;
  font-size: 1.5rem !important;
  font-weight: 700;
  text-align: right;
}


    .item-row td {
      padding: 1rem;
      border-bottom: 0.05rem solid #e0e0e0;
      vertical-align: top;
    }

    .item-name {
      font-weight: 600;
      font-size: 1rem;
      color: var(--text-dark);
    }

    .item-pack {
      font-size: 0.8rem;
      color: var(--text-light);
      margin-top: 0.3rem;
    }

    .item-qty { text-align: center; }
    .qty-main { font-weight: 600; }
    .qty-sub { font-size: 0.75rem; display: block; margin-top: 0.2rem; }
    .blue { color: var(--primary); }
    .green { color: var(--success); }

    .item-unit, .item-total { text-align: right; }
    .unit-sub {
      font-size: 0.75rem;
      color: #95a5a6;
      margin-top: 0.3rem;
    }

    .item-total {
      font-weight: 700;
      color: var(--success);
      font-size: 1.1rem;
    }

    .total-row td {
      background: linear-gradient(135deg, var(--success), var(--success-light));
      color: var(--white);
      padding: 2rem 1rem;
      font-size: 1.6rem;
      font-weight: 700;
      text-align: right;
    }

    .items-note { font-size: 1rem; margin-top: 0.4rem; opacity: 0.9; }

    .print-area {
      text-align: center;
      padding: 2.5rem;
      background: #f8f9fa;
    }

    .print-btn {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: var(--white);
      border: none;
      padding: 1rem 3rem;
      font-size: 1.1rem;
      border-radius: 2rem;
      cursor: pointer;
      font-weight: 600;
      transition: 0.3s;
      box-shadow: 0 0.6rem 1.5rem rgba(52,152,219,0.4);
    }

    .print-btn:hover {
      transform: translateY(-0.2rem);
      box-shadow: 0 0.9rem 2rem rgba(52,152,219,0.5);
    }

    .footer {
      text-align: center;
      background: var(--text-dark);
      color: var(--white);
      padding: 2rem;
      font-size: 0.9rem;
    }

    @media print {
      body { background: white; padding: 0; }
      .print-area { display: none; }
      .container { border: none; box-shadow: none; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Noor Sardar HealthCare Center</h1>
      <h2>MEDICINE SALES INVOICE</h2>
      <div class="invoice-id">Invoice #INV-${new Date(group.soldAt)
        .getTime()
        .toString(36)
        .toUpperCase()
        .slice(-8)}</div>
    </div>

    <div class="info">
      <div class="info-box">
        <strong>Sale Date & Time</strong>
        <div>
          ${new Date(group.soldAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}<br>
          ${new Date(group.soldAt).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}
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
          <th style="text-align:center;">Quantity Sold</th>
          <th style="text-align:right;">Unit Price</th>
          <th style="text-align:right;">Total Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
        <tr class="total-row">
          <td colspan="3">
            GRAND TOTAL
            ${
              group.items.length > 1
                ? `<div class="items-note">(${group.items.length} items)</div>`
                : ""
            }
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

        const win = window.open(
          "",
          "_blank",
          "width=1000,height=900,scrollbars=yes,resizable=yes"
        );
        win.document.write(html);
        win.document.close();
        win.focus();

        toast.success(
          `Invoice ready! ${
            group.items.length > 1 ? `(${group.items.length} items)` : ""
          }`
        );
      } catch (err) {
        console.error(err);
        toast.error("Failed to generate invoice");
      }
    },
    [getSaleTypeInfo, getDisplayUnitPrice, calculateTotalAmount]
  );

  const summaryData = useMemo(() => {
    const filteredRevenue = soldRecords.reduce(
      (sum, item) => sum + calculateTotalAmount(item),
      0
    );

    return [
      {
        svgIcon: (
          <div className="icon-wrapper">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 10h2v7H4zm4 3h2v4H8zm4-5h2v9h-2zm4 2h2v7h-2z" />
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM5 19V5h14v14H5z" />
            </svg>
          </div>
        ),
        title: "Total Sold Items",
        value: totalRecords.toLocaleString(),
        subtitle: isSearching ? "matching results" : "all time",
        color: "#3498db",
        highlight: true,
      },
      {
        svgIcon: (
          <div className="icon-wrapper">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
            </svg>
          </div>
        ),
        title:
          filterMonth !== "all" || isSearching
            ? "Filtered Revenue"
            : "Total Revenue",
        value: `PKR ${filteredRevenue.toLocaleString("en-US", {
          minimumFractionDigits: 2,
        })}`,
        subtitle: isSearching
          ? "current results"
          : filterMonth !== "all"
          ? "this month"
          : "all sales",
        color: "#27ae60",
        highlight: true,
      },
    ];
  }, [
    soldRecords,
    totalRecords,
    isSearching,
    filterMonth,
    calculateTotalAmount,
  ]);

  return (
    <div className="sold-container">
      <div className="sold-header">
        <h1>💰 Sold Medicines</h1>
        <div className="header-controls">
          <div className="search-box">
            <input
              type="search"
              placeholder="🔍 Search medicine..."
              value={search}
              onChange={handleSearch}
            />
          </div>
          <div className="sold-filter-bar">
            <select
              value={sortSalesBy}
              onChange={(e) => setSortSalesBy(e.target.value)}
              className="filter-select"
            >
              <option value="date-newest">Newest First</option>
              <option value="date-oldest">Oldest First</option>
              <option value="revenue-high">Highest Revenue</option>
              <option value="revenue-low">Lowest Revenue</option>
              <option value="quantity-high">Most Quantity</option>
            </select>

            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Months</option>
              {/* Generate last 12 months */}
              {Array.from({ length: 12 }, (_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const value = `${d.getFullYear()}-${String(
                  d.getMonth() + 1
                ).padStart(2, "0")}`;
                const label = d.toLocaleDateString("default", {
                  month: "long",
                  year: "numeric",
                });
                return (
                  <option key={value} value={value}>
                    {label}
                  </option>
                );
              })}
            </select>

            <button
              onClick={() => {
                setSortSalesBy("date-newest");
                setFilterMonth("all");
              }}
              className="reset-btn"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="summary-cards">
        {summaryData.map((card, index) => (
          <div
            key={index}
            className={`summary-card ${card.highlight ? "highlight" : ""}`}
          >
            <div className="summary-icon" style={{ color: card.color }}>
              <div className="icon-placeholder">{card.svgIcon}</div>
            </div>
            <div className="summary-content">
              <h3>{card.title}</h3>
              <p className="big-value">{card.value}</p>
              <small className="summary-subtitle">{card.subtitle}</small>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="loader-container">
          <div className="spinner"></div>
          <p>
            {isSearching
              ? `Searching for "${search}"...`
              : "Loading sold medicines..."}
          </p>
        </div>
      ) : displayedSales.length > 0 ? (
        <>
          <div className="sold-table-wrapper">
            <table className="sold-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Package</th>
                  <th>Quantity Sold</th>
                  <th>Unit Price</th>
                  <th>Total (PKR)</th>
                  <th>Date</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {groupedDisplayedSales.map((group) => {
                  const groupTotal = group.items.reduce(
                    (sum, r) => sum + calculateTotalAmount(r),
                    0
                  );
                  const firstItem = group.items[0]; // Use first for date/time

                  return (
                    <tr key={group.key} className="group-row">
                      <td className="medicine-name">
                        {group.items.length > 1 && (
                          <span className="bulk-badge">
                            Bulk Sale ({group.items.length} items)
                          </span>
                        )}
                        <div className="group-items-list">
                          {group.items.map((item, i) => (
                            <div key={item._id} className="group-item">
                              <span className="medicine-icon">💊</span>
                              <strong>{item.name}</strong>
                              {item.strength && (
                                <small> • {item.strength}</small>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="package-cell">
                        <div className="group-packages">
                          {group.items.map((item) => (
                            <div key={item._id} className="package-tag">
                              {item.packSize || "Standard"}
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="quantity-cell">
                        {group.items.map((item) => {
                          const info = getSaleTypeInfo(item);
                          return (
                            <div key={item._id} className="quantity-item">
                              <span className={`sale-type-badge ${info.type}`}>
                                {info.type === "units" ? "Pill" : "Package"}
                              </span>
                              {info.displayText}
                              {info.type === "units" && (
                                <small>({info.packagesEquivalent} pkg)</small>
                              )}
                            </div>
                          );
                        })}
                      </td>

                      <td className="price-cell">
                        {group.items.map((item) => (
                          <div key={item._id}>
                            PKR {getDisplayUnitPrice(item).toFixed(2)}
                            <small style={{ color: "#666", fontSize: "0.8em" }}>
                              {getUnitLabel(item)}
                            </small>
                          </div>
                        ))}
                      </td>

                      <td className="total-cell highlight-total">
                        <div className="group-total-amount">
                          PKR {groupTotal.toFixed(2)}
                        </div>
                        <small style={{ color: "#27ae60", fontWeight: "bold" }}>
                          Group Total
                        </small>
                      </td>

                      <td className="date-cell">
                        {new Date(firstItem.soldAt)
                          .toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })
                          .replace(",", " •")}
                        <br />
                        <small style={{ opacity: 0.7 }}>
                          by {firstItem.soldBy || "Staff"}
                        </small>
                      </td>

                      <td className="invoice-action">
                        <button
                          className="invoice-btn bulk"
                          onClick={() => generateInvoice(group)}
                        >
                          Invoice{" "}
                          {group.items.length > 1
                            ? `(${group.items.length} items)`
                            : ""}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ✅ Number Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-btn prev-next"
              >
                ←
              </button>

              <div className="page-numbers">
                {/* Show first page */}
                {currentPage > 3 && (
                  <button onClick={() => goToPage(1)} className="page-number">
                    1
                  </button>
                )}

                {/* Show ellipsis if needed */}
                {currentPage > 4 && <span className="page-ellipsis">...</span>}

                {/* Show pages around current page */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    return Math.abs(page - currentPage) <= 2;
                  })
                  .map((page) => (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`page-number ${
                        page === currentPage ? "active" : ""
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                {/* Show ellipsis if needed */}
                {currentPage < totalPages - 3 && (
                  <span className="page-ellipsis">...</span>
                )}

                {/* Show last page */}
                {currentPage < totalPages - 2 && (
                  <button
                    onClick={() => goToPage(totalPages)}
                    className="page-number"
                  >
                    {totalPages}
                  </button>
                )}
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="pagination-btn prev-next"
              >
                →
              </button>

              <div className="page-info">
                <span className="records-info">
                  Page {currentPage} of {totalPages} • {totalRecords}{" "}
                  {isSearching ? "results" : "total records"}
                </span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="no-records">
          <div className="no-records-icon">😔</div>
          <h3>
            No {isSearching || filterMonth !== "all" ? "matching" : "sold"}{" "}
            records found
          </h3>
          <p>
            {isSearching
              ? `No results for "${search}"`
              : filterMonth !== "all"
              ? `No sales in ${new Date(filterMonth + "-01").toLocaleDateString(
                  "default",
                  { month: "long", year: "numeric" }
                )}`
              : "No sales recorded yet"}
          </p>
          {isSearching && (
            <button className="clear-search-btn" onClick={clearSearch}>
              Clear Search
            </button>
          )}
        </div>
      )}
    </div>
  );
}
