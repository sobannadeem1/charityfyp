
import React, { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";

import Medicines from "./pages/Medicine";
import Donations from "./pages/Donation";
import Reports from "./pages/Report";
import Home from "./pages/Home";
import Login from "./pages/Login";

import { NotificationProvider } from "./context/NotificationContext";
import { getCurrentAdmin } from "./api/medicineapi";

import "./index.css";
import "./App.css";

const SoldMedicines = lazy(() => import("./pages/SoldMedicine"));
const ExpiringSoon = lazy(() => import("./pages/ExpiringSoon"));
const InvoiceHistory = lazy(() => import("./pages/InvoiceHistory"));

const App = () => {
  const [isAdmin, setIsAdmin] = useState(null);

  
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

  if (isAdmin === null) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <NotificationProvider>
      <Router>
        <div className="app-container">
          <Header isAdmin={isAdmin} setIsAdmin={setIsAdmin} />

          <main className="main-content">
            <Suspense
              fallback={
                <div className="loader-container">
                  <div className="spinner"></div>
                </div>
              }
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

                <Route
                  path="/login"
                  element={<Login setIsAdmin={setIsAdmin} />}
                />

                <Route path="/expiring-soon" element={<ExpiringSoon />} />

               

                <Route
                  path="/reports"
                  element={isAdmin ? <Reports /> : <Navigate to="/login" />}
                />

                <Route
                  path="/invoices"
                  element={isAdmin ? <InvoiceHistory /> : <Navigate to="/login" />}
                />

                <Route
                  path="/sold"
                  element={isAdmin ? <SoldMedicines /> : <Navigate to="/login" />}
                />

                <Route path="*" element={<Navigate to="/" />} />

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