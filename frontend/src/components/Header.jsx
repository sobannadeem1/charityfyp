import React, { useState } from "react";
import "../styles/headerfooter.css";
import { NavLink, useNavigate } from "react-router-dom";

export default function Header({ darkMode, setDarkMode, setIsAuthenticated }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/logout", {
        method: "POST",
        credentials: "include", // ✅ important to send cookie
      });

      if (res.ok) {
        setIsAuthenticated(false);
        navigate("/", { replace: true }); // redirect to login
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="site-header" role="banner">
      <div className="container header-inner">
        {/* Brand (Logo + Text) */}
        <div className="brand">
          <div className="logo" aria-hidden>
            <img src="/charity.png" alt="Charity Medical Logo" />
          </div>
          <div className="brand-text">
            <span className="org-name">Charity Medical</span>
            <span className="org-sub">Inventory</span>
          </div>
        </div>

        {/* Navigation */}
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
          <NavLink to="/medicines">Medicines</NavLink>
          <NavLink to="/donations">Donations</NavLink>
          <NavLink to="/reports">Reports</NavLink>
        </nav>

        {/* Header Controls */}
        <div className="header-controls">
          {/* 🔍 Search */}
          <div className={`search-wrap ${searchOpen ? "open" : ""}`}>
            <input
              type="search"
              placeholder="Search medicine or donor..."
              aria-label="Search"
            />
            <button
              className="search-close"
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
            >
              &times;
            </button>
          </div>

          <button
            className="icon-btn"
            aria-label="Toggle search"
            onClick={() => {
              setSearchOpen((s) => !s);
              setMobileOpen(false);
            }}
            title="Search"
          >
            🔍
          </button>

          {/* 🌙 Dark Mode Toggle */}
          <button
            className="icon-btn"
            onClick={() => setDarkMode(!darkMode)}
            title="Toggle Dark Mode"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>

          {/* 👤 User Avatar + Logout */}
          <div className="user-section">
            <button className="avatar" title="Profile">
              <img
                src="https://via.placeholder.com/40x40.png?text=A"
                alt="Admin avatar"
              />
            </button>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>

          {/* 🍔 Mobile Hamburger */}
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
              setSearchOpen(false);
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
