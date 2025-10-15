import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Medicines from "./pages/Medicine";
import Donations from "./pages/Donation";
import Reports from "./pages/Report";
import Home from "./pages/Home";
import Login from "./pages/Login";

import "./index.css";

const App = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ Check if JWT cookie exists on first load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/admin/me", {
          credentials: "include", // send cookies
        });
        setIsAuthenticated(res.ok);
      } catch (err) {
        console.error("Auth check failed:", err);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <Router>
      <div className={`app-container ${darkMode ? "dark" : ""}`}>
        {/* Show Header + Footer only if logged in */}
        {isAuthenticated && (
          <Header
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            setIsAuthenticated={setIsAuthenticated} // ✅ added
          />
        )}

        <main className="main-content">
          {!isAuthenticated ? (
            <Login setIsAuthenticated={setIsAuthenticated} />
          ) : (
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/medicines" element={<Medicines />} />
              <Route path="/donations" element={<Donations />} />
              <Route path="/reports" element={<Reports />} />
            </Routes>
          )}
        </main>

        {isAuthenticated && <Footer />}
      </div>
    </Router>
  );
};

export default App;
