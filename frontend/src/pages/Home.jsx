import "../styles/dashboard.css";

export default function Home() {
  return (
    <main className="dashboard">
      <div className="container">
        <h2 className="dash-title">Dashboard Overview</h2>

        {/* Cards Row */}

        <div className="dash-cards">
          <div className="dash-card">
            <h3>Total Medicines</h3>
            <p>120</p>
          </div>
          <div className="dash-card">
            <h3>Total Donations</h3>
            <p>45</p>
          </div>
          <div className="dash-card">
            <h3>Expiring Soon</h3>
            <p>8</p>
          </div>
          <div className="dash-card">
            <h3>Out of Stock</h3>
            <p>5</p>
          </div>
        </div>
      </div>
    </main>
  );
}
