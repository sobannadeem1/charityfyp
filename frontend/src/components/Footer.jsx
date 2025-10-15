import React from "react";
import "../styles/headerfooter.css";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container footer-grid">
        <div className="f-about">
          <h4>Charity Medical Store</h4>
          <p>
            A simple inventory system to manage donated medicines and supplies —
            built for charity clinics.
          </p>
        </div>

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

        <div className="f-contact">
          <h5>Contact</h5>
          <p>Email: info@charity.org</p>
          <p>Phone: +92 300 0000000</p>
          <div className="socials" aria-hidden>
            <a className="social" href="#twitter">
              T
            </a>
            <a className="social" href="#fb">
              F
            </a>
            <a className="social" href="#ig">
              I
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
