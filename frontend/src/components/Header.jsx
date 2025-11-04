import React, { useEffect, useState } from "react";
import "../styles/headerfooter.css";
import { NavLink, useNavigate } from "react-router-dom";

export default function Header({ setIsAdmin }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  // ✅ Check if admin is logged in (via token/session)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/admin/me", {
          credentials: "include",
        });
        setIsLoggedIn(res.ok);
      } catch (err) {
        console.error("Auth check failed:", err);
        setIsLoggedIn(false);
      }
    };
    checkAuth();
  }, []);

  // ✅ Logout
  const handleLogout = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        setIsAdmin(false);
        setIsLoggedIn(false);
        navigate("/", { replace: true });
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // ✅ Login redirect
  const handleLogin = () => {
    navigate("/login");
  };

  return (
    <header className="site-header" role="banner">
      <div className="container header-inner">
        {/* 🔹 Brand Logo */}
        <div className="brand">
          <div className="logo" aria-hidden>
            <img src="/charity.png" alt="Charity Medical Logo" />
          </div>
          <div className="brand-text">
            <span className="org-name">Charity Medical</span>
            <span className="org-sub">Inventory</span>
          </div>
        </div>

        {/* 🔹 Navigation */}
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

        {/* 🔹 Header Controls */}
        <div className="header-controls">
          {/* 👤 Avatar (only when logged in) */}
          {isLoggedIn && (
            <div className="user-section">
              <button className="avatar" title="Profile">
                <img
                  src="https://via.placeholder.com/40x40.png?text=A"
                  alt="Admin avatar"
                />
              </button>
            </div>
          )}

          {/* 🚪 Logout / 🔑 Login */}
          {isLoggedIn ? (
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <button className="login-btn" onClick={handleLogin}>
              Login
            </button>
          )}

          {/* 🍔 Mobile Menu */}
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
