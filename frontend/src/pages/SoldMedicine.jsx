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
      <html>
      <head>
        <title>Invoice - ${saleRecord.name}</title>
        <style>
          @media print {
            .no-print { display: none !important; }
            body { margin: 0; padding: 15px; font-size: 14px; }
            .invoice-container { border: none; box-shadow: none; }
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 30px; 
            color: #333;
            max-width: 700px;
          }
          .invoice-container {
            border: 2px solid #3498db;
            border-radius: 10px;
            padding: 25px;
            background: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .invoice-header { 
            text-align: center; 
            border-bottom: 2px solid #3498db; 
            padding-bottom: 20px; 
            margin-bottom: 25px;
          }
          .invoice-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
            font-size: 14px;
          }
          .invoice-table th { 
            background: #3498db; 
            color: white;
            padding: 12px;
            text-align: left;
            border: 1px solid #2980b9;
          }
          .invoice-table td { 
            padding: 12px;
            border: 1px solid #ddd;
          }
          .total-section { 
            text-align: right; 
            margin-top: 25px; 
            font-size: 1.2em;
            font-weight: bold;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #ddd;
          }
          .print-section {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #ddd;
          }
          .print-btn {
            background: #3498db;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            transition: background 0.3s;
          }
          .print-btn:hover {
            background: #2980b9;
          }
          .shortcut-hint {
            color: #666;
            font-size: 12px;
            margin-top: 8px;
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="invoice-header">
            <h1 style="margin: 0; color: #2c3e50;">💊 Noor Sardar HealthCare Center</h1>
            <h2 style="margin: 10px 0; color: #3498db;">MEDICINE SALES INVOICE</h2>
            <p style="margin: 0; color: #7f8c8d;">Invoice #INV-${
              saleRecord._id?.slice(-8)?.toUpperCase() || "N/A"
            }</p>
          </div>

          <div style="margin: 15px 0; padding: 15px; background: #e8f4fd; border-radius: 6px;">
            <strong>Sale Date:</strong> ${new Date(
              saleRecord.soldAt
            ).toLocaleString()}<br>
            <strong>Sold By:</strong> ${saleRecord.soldBy || "Operator"}
          </div>

          <table class="invoice-table">
            <thead>
              <tr>
                <th>Medicine Details</th>
                <th>Quantity</th>
                <th>Unit Price (PKR)</th>
                <th>Total Amount (PKR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${saleRecord.name}</strong><br/>
                  <small style="color: #666;">${
                    saleRecord.packSize || "No package info"
                  }</small>
                </td>
                <td>${saleInfo.displayText}</td>
                <td>${displayUnitPrice.toFixed(2)}</td>
                <td><strong>${totalAmount.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            <div style="font-size: 1.3em; color: #27ae60;">
              Grand Total: <strong>PKR ${totalAmount.toFixed(2)}</strong>
            </div>
          </div>

          <div class="print-section no-print">
            <button class="print-btn" onclick="window.print()">
              🖨️ PRINT INVOICE NOW
            </button>
            <div class="shortcut-hint">
              💡 Quick tip: Press <strong>Ctrl + P</strong> (Windows) or <strong>Cmd + P</strong> (Mac) to print
            </div>
          </div>

          <div style="margin-top: 40px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #ddd; padding-top: 20px;">
            <p>Thank you for your purchase! 🎉</p>
            <p><em>This is a computer-generated invoice</em></p>
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
                        {new Date(r.soldAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "2-digit",
                          year: "numeric",
                        })}
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
