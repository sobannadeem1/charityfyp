import React from "react";
import "../styles/footer.css";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container footer-grid">
        {/* About Section */}
        <div className="f-about">
          <h4>Noor Sardar HealthCare Center</h4>
          <p>
            A community-focused healthcare initiative providing essential
            medical support, medicine distribution, and patient care to
            underserved families.
          </p>
          <p style={{ fontWeight: "bolder" }}>
            © {new Date().getFullYear()} Noor Sardar HealthCare Center — All
            rights reserved.
          </p>
        </div>

        {/* Quick Links */}
        <div className="f-links">
          <h5>Quick Links</h5>
          <ul>
            <li>
              <Link to="/">Dashboard</Link>
            </li>
            <li>
              <Link to="/medicines">Medicines</Link>
            </li>
            <li>
              <Link to="/donations">Donations</Link>
            </li>
            <li>
              <Link to="/reports">Reports</Link>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div className="f-contact">
          <h5>Contact</h5>
          <p>Email: noorsardar@healthcare.org</p>
          <p>Phone: +92 300 1234567</p>

          <div className="socials" aria-hidden>
            <a className="social" href="#facebook">
              F
            </a>
            <a className="social" href="#twitter">
              T
            </a>
            <a className="social" href="#instagram">
              I
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
