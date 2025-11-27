// App.jsx — FINAL FIXED VERSION
import React, { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Medicines from "./pages/Medicine";
import Donations from "./pages/Donation";
import Reports from "./pages/Report";
import Home from "./pages/Home";
import Login from "./pages/Login";
import { NotificationProvider } from "./context/NotificationContext"; // ← ADD THIS
import { getCurrentAdmin } from "./api/medicineapi";
import "./index.css";
import "./App.css";

// Lazy load heavy pages
const SoldMedicines = lazy(() => import("./pages/SoldMedicine"));
const ExpiringSoon = lazy(() => import("./pages/ExpiringSoon"));

const App = () => {
  const [isAdmin, setIsAdmin] = useState(null); // ← null = loading, not false!

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await getCurrentAdmin();
        setIsAdmin(true);
      } catch (err) {
        setIsAdmin(false);
      }
    };
    checkAuth();
  }, []);

  // Show nothing or a loader until we know auth status
  if (isAdmin === null) {
    return (
      <div className="full-screen-loader">
        <div className="spinner"></div>
        <p>Loading app...</p>
      </div>
    );
  }

  return (
    <NotificationProvider>
      {" "}
      {/* ← ALWAYS MOUNTED */}
      <Router>
        <div className="app-container">
          <Header isAdmin={isAdmin} setIsAdmin={setIsAdmin} />

          <main className="main-content">
            <Suspense
              fallback={<div className="page-loader">Loading page...</div>}
            >
              <Routes>
                <Route path="/" element={<Home />} />
                <Route
                  path="/medicines"
                  element={<Medicines isAdmin={isAdmin} />}
                />
                <Route
                  path="/donations"
                  element={<Donations isAdmin={isAdmin} />}
                />
                <Route path="/reports" element={<Reports />} />
                <Route
                  path="/login"
                  element={<Login setIsAdmin={setIsAdmin} />}
                />

                {/* These pages use notifications → must be inside NotificationProvider */}
                <Route path="/expiring-soon" element={<ExpiringSoon />} />
                {isAdmin && <Route path="/sold" element={<SoldMedicines />} />}
              </Routes>
            </Suspense>
          </main>

          <Footer />
        </div>
      </Router>
    </NotificationProvider>
  );
};

export default App;
