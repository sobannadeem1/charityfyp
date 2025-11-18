import { useState, useEffect } from "react";

export default function HoverRollCard({ title, value, color, icon, onClick }) {
  const [displayValue, setDisplayValue] = useState(0); // start from 0

  useEffect(() => {
    // Animate numbers on mount
    let start = 0;
    const end = value;
    const increment = Math.max(1, Math.floor(end / 50));
    const interval = setInterval(() => {
      start += increment;
      if (start >= end) {
        start = end;
        clearInterval(interval);
      }
      setDisplayValue(start);
    }, 10);

    return () => clearInterval(interval); // cleanup
  }, [value]);

  return (
    <div className="dash-card" style={{ background: color }} onClick={onClick}>
      <div className="dash-card-icon">{icon}</div>
      <h3>{title}</h3>
      <p className="dash-card-number">{displayValue}</p>
    </div>
  );
}
