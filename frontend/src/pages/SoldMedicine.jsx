import React, { useEffect, useState, useCallback, useMemo } from "react";
import { getSalesWithPagination } from "../api/medicineapi.js"; // You'll need to create this API function
import "../styles/SoldMedicine.css";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { FaChartBar, FaDollarSign } from "react-icons/fa";

export default function SoldMedicines() {
  const [soldRecords, setSoldRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
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

  const getDisplayUnitPrice = useCallback(
    (record) => {
      const sellType = record.originalSellType || record.sellType;
      return sellType === "packages"
        ? record.salePrice
        : getPricePerUnit(record.salePrice, record.packSize);
    },
    [getPricePerUnit]
  );

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
      setFiltered(data);

      // Set pagination info from backend
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
        setTotalRecords(
          res.pagination.totalSales || res.pagination.totalRecords || 0
        );
        setCurrentPage(res.pagination.currentPage || page);
      }

      // Calculate total revenue for current page
      const total = data.reduce((acc, item) => {
        return acc + calculateTotalAmount(item);
      }, 0);

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

  // ✅ Generate PDF Invoice (same as before)
  const generateInvoice = useCallback(
    (saleRecord) => {
      try {
        const saleInfo = getSaleTypeInfo(saleRecord);
        const totalAmount = calculateTotalAmount(saleRecord);
        const displayUnitPrice = getDisplayUnitPrice(saleRecord);

        const invoiceWindow = window.open("", "_blank", "width=800,height=900");

        const invoiceContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Invoice - ${saleRecord.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #f4f7fa;
      color: #2c3e50;
      line-height: 1.6;
      padding: 20px;
    }

    @media print {
      body { background: white; padding: 10px; }
      .no-print { display: none !important; }
      .invoice-box { box-shadow: none; border: 2px solid #3498db; }
    }

    .invoice-box {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.15);
      border: 3px solid #3498db;
    }

    .header {
      background: linear-gradient(135deg, #3498db, #2980b9);
      color: white;
      padding: 30px 25px;
      text-align: center;
    }

    .header h1 {
      font-size: 28px;
      margin-bottom: 8px;
      font-weight: 700;
    }

    .header h2 {
      font-size: 20px;
      opacity: 0.95;
      font-weight: 400;
    }

    .invoice-no {
      background: rgba(255,255,255,0.2);
      display: inline-block;
      padding: 8px 20px;
      border-radius: 50px;
      font-weight: bold;
      margin-top: 15px;
      backdrop-filter: blur(5px);
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      padding: 25px;
      background: #f8fdff;
      border-bottom: 1px dashed #ddd;
    }

    .info-item {
      background: white;
      padding: 15px;
      border-radius: 10px;
      border-left: 4px solid #3498db;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .info-item strong {
      color: #2c3e50;
      display: block;
      margin-bottom: 5px;
      font-size: 14px;
      opacity: 0.8;
    }

    .table-container {
      padding: 25px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 16px;
    }

    th {
      background: #3498db;
      color: white;
      padding: 15px 12px;
      text-align: left;
      font-weight: 600;
    }

    td {
      padding: 15px 12px;
      border-bottom: 1px solid #eee;
    }

    tr:nth-child(even) {
      background-color: #f8f9fa;
    }

    .medicine-name {
      font-weight: bold;
      color: #2c3e50;
      font-size: 17px;
    }

    .pack-info {
      color: #7f8c8d;
      font-size: 13px;
      margin-top: 4px;
    }

    .total-section {
      background: linear-gradient(135deg, #27ae60, #2ecc71);
      color: white;
      padding: 25px;
      text-align: right;
      font-size: 22px;
      font-weight: bold;
      border-radius: 0 0 12px 12px;
    }

    .total-amount {
      font-size: 28px !important;
      text-shadow: 0 2px 5px rgba(0,0,0,0.3);
    }

    .print-section {
      text-align: center;
      padding: 30px 25px;
      background: #f8f9fa;
      border-top: 1px dashed #ddd;
    }

    .print-btn {
      background: linear-gradient(135deg, #3498db, #2980b9);
      color: white;
      border: none;
      padding: 16px 40px;
      font-size: 18px;
      font-weight: bold;
      border-radius: 50px;
      cursor: pointer;
      box-shadow: 0 6px 15px rgba(52, 152, 219, 0.4);
      transition: all 0.3s;
    }

    .print-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 25px rgba(52, 152, 219, 0.5);
    }

    .footer {
      text-align: center;
      padding: 30px 25px;
      color: #7f8c8d;
      font-size: 14px;
      border-top: 1px solid #eee;
      background: #f8f9fa;
    }

    .highlight {
      color: #27ae60;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="invoice-box">
    <!-- Header -->
    <div class="header">
      <h1>Noor Sardar HealthCare Center</h1>
      <h2>MEDICINE SALES INVOICE</h2>
      <div class="invoice-no">
        Invoice #INV-${saleRecord._id?.slice(-8).toUpperCase() || "N/A"}
      </div>
    </div>

    <!-- Info Grid -->
    <div class="info-grid">
      <div class="info-item">
        <strong>Sale Date & Time</strong>
        ${new Date(saleRecord.soldAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })} at 
        ${new Date(saleRecord.soldAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })}
      </div>
      <div class="info-item">
        <strong>Served By</strong>
        ${saleRecord.soldBy || "Pharmacy Staff"}
      </div>
    </div>

    <!-- Medicine Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Medicine Details</th>
            <th style="text-align: center;">Quantity</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="medicine-name">${saleRecord.name}</div>
              <div class="pack-info">
                ${
                  saleRecord.packSize
                    ? `${saleRecord.packSize}`
                    : "Standard Pack"
                }
                ${saleRecord.strength ? ` • ${saleRecord.strength}` : ""}
              </div>
            </td>
            <td style="text-align: center; font-weight: bold;">
              ${saleInfo.displayText}
            </td>
            <td style="text-align: right;">PKR ${displayUnitPrice.toFixed(
              2
            )}</td>
            <td style="text-align: right; font-weight: bold; color: #27ae60;">
              PKR ${totalAmount.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Grand Total -->
    <div class="total-section">
      <div>
        GRAND TOTAL: <span class="total-amount">PKR ${totalAmount.toFixed(
          2
        )}</span>
      </div>
    </div>

    <!-- Print Button -->
    <div class="print-section no-print">
      <button class="print-btn" onclick="window.print()">
        PRINT INVOICE
      </button>
      <p style="margin-top: 12px; color: #666;">
        Tip: Press <strong>Ctrl + P</strong> (or <strong>Cmd + P</strong> on Mac) to print quickly
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Thank you for trusting <span class="highlight">Noor Sardar HealthCare Center</span> </p>
      <p><em>This is a computer-generated invoice • No signature required</em></p>
      <p style="margin-top: 15px; font-size: 12px; opacity: 0.7;">
        For queries: Contact Pharmacy Desk • Open 24/7
      </p>
    </div>
  </div>
</body>
</html>
`;

        invoiceWindow.document.write(invoiceContent);
        invoiceWindow.document.close();
        invoiceWindow.focus();

        toast.success("Invoice opened! Click PRINT button or press Ctrl+P 🖨️");
      } catch (error) {
        console.error("Error generating invoice:", error);
        toast.error("Failed to generate invoice");
      }
    },
    [getSaleTypeInfo, calculateTotalAmount, getDisplayUnitPrice]
  );

  // ✅ Memoized summary data
  const summaryData = useMemo(
    () => [
      {
        icon: <FaChartBar />,
        title: "Total Sold Items",
        value: totalRecords,
      },
      {
        icon: <FaDollarSign />,
        title: isSearching ? "Page Revenue" : "Total Revenue",
        value: `PKR ${totalRevenue.toFixed(2)}`,
      },
    ],
    [totalRecords, totalRevenue, isSearching]
  );

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
        </div>
      </div>

      <div className="summary-cards">
        {summaryData.map((card, index) => (
          <div key={index} className="summary-card">
            <div className="summary-icon">{card.icon}</div>
            <div className="summary-content">
              <h3>{card.title}</h3>
              <p>{card.value}</p>
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
      ) : filtered.length > 0 ? (
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
                {filtered.map((r) => {
                  const saleInfo = getSaleTypeInfo(r);
                  const totalAmount = calculateTotalAmount(r);
                  const displayUnitPrice = getDisplayUnitPrice(r);

                  return (
                    <tr key={r._id}>
                      <td className="medicine-name">
                        <span className="medicine-icon">💊</span>
                        {r.name || "-"}
                      </td>
                      <td className="package-cell">
                        {r.packSize ? (
                          <div className="package-info-small">
                            <span className="package-icon">📦</span>
                            {r.packSize}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="quantity-cell">
                        <div className="sale-quantity">
                          <span className={`sale-type-badge ${saleInfo.type}`}>
                            {saleInfo.type === "units" ? "💊" : "📦"}
                          </span>
                          {saleInfo.displayText}
                          {saleInfo.type === "units" && (
                            <small className="equivalent-info">
                              ({saleInfo.packagesEquivalent} packages)
                            </small>
                          )}
                          {saleInfo.type === "packages" && (
                            <small className="equivalent-info">
                              ({saleInfo.totalUnits} units)
                            </small>
                          )}
                        </div>
                      </td>
                      <td className="price-cell">
                        PKR {displayUnitPrice.toFixed(2)}
                        <small className="price-label">
                          {saleInfo.type === "units"
                            ? "per unit"
                            : "per package"}
                        </small>
                      </td>
                      <td className="total-cell">
                        PKR {totalAmount.toFixed(2)}
                        <small className="calculation-label">
                          {saleInfo.calculation}
                        </small>
                      </td>
                      <td className="date-cell">
                        {new Date(r.soldAt)
                          .toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })
                          .replace(",", ".")}
                      </td>
                      <td className="invoice-action">
                        <button
                          className="invoice-btn"
                          onClick={() => generateInvoice(r)}
                        >
                          🧾 Generate
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
          <h3>No {isSearching ? "matching" : "sold"} records found</h3>
          <p>
            {isSearching
              ? `No results found for "${search}". Try different search terms.`
              : "Try adjusting your search terms or check back later"}
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
