import React, { useState } from "react";
import "../styles/headerfooter.css";
import { NavLink, useNavigate } from "react-router-dom";
import NotificationBell from "./NotificationBell"; // Import the bell component
import { logoutAdmin } from "../api/medicineapi";
import logo from "../assets/logo.png";

export default function Header({ isAdmin, setIsAdmin }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutAdmin();
      setIsAdmin(false);
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleLogin = () => navigate("/login");

  return (
    <header className="site-header" role="banner">
      <div className="container header-inner">
        {/* 🔹 Brand Logo */}
        <div className="brand">
          <div className="logo" aria-hidden>
            <img src={logo} alt="Charity Medical Logo" />
          </div>
          <div className="brand-text">
            <span className="org-name">Noor Sardar</span>
            <span className="org-sub">HealthCare Center</span>
          </div>
        </div>

        <nav
          className={`main-nav ${mobileOpen ? "open show" : ""}`}
          aria-label="Main"
        >
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Dashboard
          </NavLink>

          {/* 🔽 Medicines Dropdown */}
          <div className="nav-dropdown">
            <span className="dropdown-toggle">Medicines ▾</span>
            <div className="dropdown-menu">
              <NavLink to="/medicines">All Medicines</NavLink>
              <NavLink to="/expiring-soon">Expiring Soon</NavLink>

              {isAdmin && <NavLink to="/sold">Sold Medicines</NavLink>}
              {isAdmin && <NavLink to="/invoices">Invoice History</NavLink>}
            </div>
          </div>

          <NavLink to="/donations">Donations</NavLink>
          <NavLink to="/reports">Reports</NavLink>
        </nav>

        {/* 🔹 Header Controls */}
        <div className="header-controls">
          {/* 🔔 NOTIFICATION BELL - Add this line */}
          {isAdmin && <NotificationBell />}

          {isAdmin && (
            <div className="user-section">
              <button className="avatar" title="Noor Sardar Admin">
                <img src={logo} alt="Admin avatar" />
              </button>
            </div>
          )}

          {isAdmin ? (
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <button className="login-btn" onClick={handleLogin}>
              Login
            </button>
          )}

          <button
            className={`hamburger ${mobileOpen ? "open" : ""}`}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => {
              setMobileOpen((s) => {
                const next = !s;
                document.body.classList.toggle("menu-open", next);
                return next;
              });
            }}
            title="Menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
