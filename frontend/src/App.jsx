import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Medicines from "./pages/Medicine";
import Donations from "./pages/Donation";
import Reports from "./pages/Report";
import Home from "./pages/Home";
import Login from "./pages/Login";
import SoldMedicines from "./pages/SoldMedicine";
import "./index.css";
import ExpiringSoon from "./pages/ExpiringSoon";

const App = () => {
  const [isAdmin, setIsAdmin] = useState(false);

  // ✅ Optional: check if admin is logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/admin/me", {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) setIsAdmin(true);
      } catch (err) {
        setIsAdmin(false);
      }
    };
    checkAuth();
  }, []);

  return (
    <Router>
      <div className="app-container">
        <Header isAdmin={isAdmin} setIsAdmin={setIsAdmin} />

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/medicines"
              element={<Medicines isAdmin={isAdmin} />}
            />
            <Route path="/donations" element={<Donations />} />
            <Route path="/expiring-soon" element={<ExpiringSoon />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/sold" element={<SoldMedicines />} />
            <Route path="/login" element={<Login setIsAdmin={setIsAdmin} />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
