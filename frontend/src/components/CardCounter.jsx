import { useState, useEffect } from "react";

export default function HoverRollCard({
  title,
  value,
  color,
  icon,
  onClick,
  subtitle,
  additionalInfo,
}) {
  // SAFELY convert value to a number, default to 0
  const safeValue = (() => {
    if (value === null || value === undefined || value === "") return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  })();

  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (safeValue === 0) {
      setDisplayValue(0);
      return;
    }

    let start = 0;
    const end = safeValue;
    const duration = 800; // ms
    const steps = 50;
    const increment = end / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      start = Math.floor(increment * currentStep);

      if (currentStep >= steps) {
        start = end;
        clearInterval(timer);
      }

      setDisplayValue(start);
    }, duration / steps);

    return () => clearInterval(timer);
  }, [safeValue]); // ← depend on safeValue, not raw value

  return (
    <div className="dash-card" style={{ background: color }} onClick={onClick}>
      <div className="dash-card-icon">{icon}</div>
      <h3>{title}</h3>
      <p className="dash-card-number">{displayValue.toLocaleString()}</p>
      {subtitle && <p className="dash-card-subtitle">{subtitle}</p>}
      {additionalInfo && (
        <div className="additional-info">
          {additionalInfo.map((info, i) => (
            <small key={i}>{info}</small>
          ))}
        </div>
      )}
    </div>
  );
}
