import React, { useEffect, useState, useCallback, useMemo,useRef } from "react";
import { createInvoice, getSalesWithPagination, getSoldMedicines } from "../api/medicineapi.js"; // You'll need to create this API function
import "../styles/SoldMedicine.css";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { GiMedicines } from "react-icons/gi";

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

  const navigate = useNavigate();
  useEffect(() => {
  getSoldMedicines()
    .then((res) => {
      console.log(
        res.data.map((s) => ({
          id: s._id,
          total: s.totalAmount,
        }))
      );
    })
    .catch(console.error);
}, []);


  // Add this ref at the top with your other useRefs
  const abortControllerRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  

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
  const calculateTotalAmount = useCallback((record) => {
  // Primary source of truth: DB stored totalAmount
  if (record.totalAmount !== undefined && record.totalAmount !== null) {
    return Number(record.totalAmount);
  }

  // Fallback for legacy records (optional)
  if (record.total !== undefined && record.total !== null) {
    return Number(record.total);
  }

  // If somehow both are missing, return 0
  return 0;
}, []);

  
const getDisplayUnitPrice = useCallback((record) => {
  const sellType = record.originalSellType || record.sellType;

  // IF unitPrice IS SAVED → USE IT DIRECTLY (DO NOT DIVIDE AGAIN!)
  if (record.unitPrice !== undefined && record.unitPrice > 0) {
    return Number(record.unitPrice);
  }

  // ONLY IF NO unitPrice (very very old data), then calculate
  if (sellType === "units") {
    const unitsPerPackage = record.unitsPerPackage || getUnitsPerPackage(record.packSize);
    return record.salePrice / unitsPerPackage;
  }

  return record.salePrice || 0;
}, [getUnitsPerPackage]);
  const getUnitLabel = useCallback((record) => {
    const sellType = record.originalSellType || record.sellType;
    return sellType === "units" ? "per unit" : "per package";
  }, []);

  const getSaleTypeInfo = useCallback((record) => {
  const originalSellType = record.originalSellType || record.sellType;
  const unitsPerPackage = record.unitsPerPackage || getUnitsPerPackage(record.packSize);

  if (originalSellType === "units") {
    const unitPrice = record.unitPrice || (record.salePrice / unitsPerPackage);
    return {
      type: "units",
      displayText: `${record.quantitySold} units`,
      packagesEquivalent: (record.quantitySold / unitsPerPackage).toFixed(1),
      calculation: `${record.quantitySold} units × PKR ${unitPrice.toFixed(2)}`,
    };
  } else {
    return {
      type: "packages",
      displayText: `${record.quantitySold} packages`,
      totalUnits: record.quantitySold * unitsPerPackage,
      calculation: `${record.quantitySold} packages × PKR ${record.salePrice.toFixed(2)}`,
    };
  }
}, [getUnitsPerPackage]);


const fetchSoldRecords = async (page = 1) => {
  if (abortControllerRef.current) abortControllerRef.current.abort();
  const controller = new AbortController();
  abortControllerRef.current = controller;

  try {
    setLoading(true);

    const response = await getSalesWithPagination({
      page,
      limit: 10,
      q: search.trim(),
      month: filterMonth !== "all" ? filterMonth : undefined,
      sort: sortSalesBy,
      signal: controller.signal,
    });

    if (!controller.signal.aborted) {
      setSoldRecords(response.data || []); // keep same name, but now already grouped

      setTotalRevenue(response.summary?.totalRevenue || 0);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalRecords(response.pagination?.totalGroups || 0);
      setCurrentPage(response.pagination.currentPage);

    }
  } catch (err) {
    if (err.name !== "AbortError") toast.error("Failed to load sales");
  } finally {
    if (!controller.signal.aborted) setLoading(false);
  }
};

// FINAL & PERFECT: One useEffect to rule them all
useEffect(() => {
  fetchSoldRecords(currentPage);
}, [currentPage, search, filterMonth, sortSalesBy]);

const handleSearch = (e) => {
  const val = e.target.value;
  setSearch(val);
  setCurrentPage(1);

  // Cancel previous timeout & API call
  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  if (abortControllerRef.current) abortControllerRef.current.abort();

  // If search is cleared instantly → fetch immediately
  if (val.trim() === "") {
    fetchSoldRecords(1);
    return;
  }

  // Debounce only when typing (not when clearing)
  searchTimeoutRef.current = setTimeout(() => {
    fetchSoldRecords(1);
  }, 400);
};

// Also clear timeout when component unmounts
useEffect(() => {
  return () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };
}, []);

const clearSearch = () => {
  setSearch("");
  setCurrentPage(1);
  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  if (abortControllerRef.current) abortControllerRef.current.abort();
  fetchSoldRecords(1); // Immediate fetch with empty search
};
useEffect(() => {
  setIsSearching(search.trim().length > 0);
}, [search]);

  // ✅ Pagination controls
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };


const summaryData = useMemo(() => {
  const isFiltered = search.trim() !== "" || filterMonth !== "all";

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
      title: isFiltered ? "Filtered Transactions" : "Total Transactions",
      value: totalRecords.toLocaleString(),
      subtitle: isFiltered 
        ? (search.trim() ? `Search: "${search.trim()}"` : `Month: ${new Date(filterMonth + "-01").toLocaleDateString("default", { month: "long", year: "numeric" })}`)
        : "All time",
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
      title: isFiltered ? "Filtered Revenue" : "Total Revenue",
      value: `PKR ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: isFiltered
        ? (search.trim() ? `Results for "${search.trim()}"` : filterMonth !== "all" ? "Current month only" : "")
        : "All time sales",
      color: "#27ae60",
      highlight: true,
    },
  ];
}, [totalRecords, totalRevenue, search, filterMonth]); // ← Yehi dependencies perfect hain

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
              onChange={(e) => {
  setSortSalesBy(e.target.value);
  setCurrentPage(1); // ← ADD THIS LINE
}}
              
              className="filter-select"
            >
              <option value="date-newest">Newest First</option>
              <option value="date-oldest">Oldest First</option>
              <option value="revenue-high">Highest Revenue</option>
              <option value="revenue-low">Lowest Revenue</option>
              <option value="quantity-high">Most Quantity</option>
            </select>

            <select
              value={filterMonth}onChange={(e) => {
  setFilterMonth(e.target.value);
  setCurrentPage(1); // ← ADD THIS LINE
}}
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
      ) : soldRecords.length > 0 ? (
        <>
          <div className="sold-table-wrapper">
  <table className="sold-table">
    <thead>
      <tr>
        <th>Medicine</th>
        <th>Package</th>
        <th>Quantity</th>
        <th>Unit Price</th>
        <th>Total</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody>
      {soldRecords.length > 0 &&
        soldRecords.map((group) => {
          const groupTotal = group.items.reduce((sum, item) => {
  return sum + calculateTotalAmount(item);
}, 0);
          const firstItem = group.items[0];
          const isBulk = group.items.length > 1;

          return (
            <>
            

              {/* Clean Glass Cards */}
              {group.items.map((item, index) => {
                const info = getSaleTypeInfo(item);
                const itemTotal = calculateTotalAmount(item);
                const isLast = index === group.items.length - 1;

                return (
                  <tr 
                    key={`${group.key}-${item._id}`} 
                    className={`glass-item-row ${isBulk ? 'bulk-glass-item' : ''} ${isLast ? 'last-glass-item' : ''}`}

                  >
                 
                    {/* Medicine - Glass Card */}
                    <td className="td-medicine-glass">
                      <div className="medicine-glass-card">
                        <div className="medicine-icon-glass">
                          <span className="pill-icon-glass"><GiMedicines/></span>
                        </div>
                        <div className="medicine-info-glass">
                         <div className="medicine-name-glass">
  {item.name}
  {isBulk && index === 0 && (
    <span className="bulk-inline-badge">Bulk</span>
  )}
</div>

                          {item.strength && (
                            <div className="strength-badge-glass">
                              {item.strength}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Package - Glass Badge */}
                    <td className="td-package-glass">
                      <div className="package-glass-badge">
                        {item.packSize || "Standard"}
                      </div>
                    </td>

                    {/* Quantity - Glass Display */}
                    <td className="td-quantity-glass">
                      <div className="quantity-glass-display">
                        <div className="quantity-main-glass">
                          {info.displayText}
                        </div>
                        {info.type === "units" && (
                          <div className="quantity-sub-glass">
                            ≈ {info.packagesEquivalent} packages
                          </div>
                        )}
                        {info.type === "packages" && info.totalUnits && (
                          <div className="quantity-sub-glass">
                            = {info.totalUnits} units
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Price - Glass Card */}
                    <td className="td-price-glass">
                      <div className="price-glass-card">
                        <div className="price-main-glass">
                          PKR {getDisplayUnitPrice(item).toFixed(2)}
                        </div>
                        <div className="price-label-glass">
                          per {item.sellType === "units" ? "unit" : "package"}
                        </div>
                      </div>
                    </td>

                   {index === 0 && (
  <td className="td-total-glass" rowSpan={group.items.length}>
    <div className="total-glass-card">
      <div className="total-amount-glass">
        PKR {groupTotal.toFixed(2)}
      </div>
      {isBulk && (
        <div className="total-items-glass">
          ({group.items.length} items)
        </div>
      )}
    </div>
  </td>
)}

                    {index === 0 && (
  <td className="td-date-glass" rowSpan={group.items.length}>
    <div className="date-glass-card">
      <div className="date-main-glass">
        {new Date(firstItem.soldAt).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        })}
      </div>
      <div className="date-time-glass">
        {new Date(firstItem.soldAt).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </div>
      <div className="sold-by-glass">
        by {firstItem.soldBy || "Staff"}
      </div>
    </div>
  </td>
)}

           
                  </tr>
                );
              })}
            </>
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
    Page {currentPage} of {totalPages} • Showing 10 groups per page
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