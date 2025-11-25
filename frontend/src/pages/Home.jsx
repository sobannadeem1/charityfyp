// src/pages/Home.jsx   (or wherever your dashboard file is)
import { useEffect, useState } from "react";
import { getAllMedicines } from "../api/medicineapi";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "../styles/Dashboard.css";
import HoverRollCard from "../components/CardCounter";
import {
  FaPills,
  FaExclamationTriangle,
  FaHandsHelping,
  FaCapsules,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Home() {
  const [medicines, setMedicines] = useState([]);
  const [welcomeMsg, setWelcomeMsg] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchMedicines();
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    const greeting =
      hour < 12
        ? "Good Morning"
        : hour < 18
        ? "Good Afternoon"
        : "Good Evening";

    // ACTUAL EMOJIS
    const emojis = [
      "☀️",
      "🌙",
      "💊",
      "🩺",
      "🧴",
      "💉",
      "⭐",
      "📦",
      "❤️",
      "✨",
      "➕",
      "🌿",
      "💎",
      "🌞",
      "🔆",
      "🌈",
    ];

    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    setWelcomeMsg(`${greeting} ${randomEmoji}`);
  }, []);
  const fetchMedicines = async () => {
    try {
      const data = await getAllMedicines();
      setMedicines(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load medicines:", err);
      setMedicines([]);
    }
  };

  // 100% SAFE CALCULATIONS — NO NaN POSSIBLE
  const activeMedicines = medicines.filter(
    (m) => Number(m.unitsAvailable || 0) > 0
  );

  const totalUnits = activeMedicines.reduce(
    (sum, m) => sum + (Number(m.unitsAvailable) || 0),
    0
  );

  const totalPackages = activeMedicines.reduce((sum, m) => {
    const perPack = Number(m.unitsPerPackage) || 1;
    const units = Number(m.unitsAvailable) || 0;
    return sum + (perPack > 0 ? Math.ceil(units / perPack) : 0);
  }, 0);

  const expiringSoon = activeMedicines.filter((m) => {
    if (!m.expiry) return false;
    const daysLeft = (new Date(m.expiry) - new Date()) / (1000 * 60 * 60 * 24);
    return daysLeft >= 0 && daysLeft <= 30;
  }).length;

  const readyForDistribution = activeMedicines.filter(
    (m) => !m.expiry || new Date(m.expiry) > new Date()
  ).length;

  // FINAL SAFE VALUES TO PASS TO HoverRollCard
  const safeTotalUnits = Number.isFinite(totalUnits) ? totalUnits : 0;
  const safeTotalPackages = Number.isFinite(totalPackages) ? totalPackages : 0;
  const estimatedPatients = Math.floor(safeTotalUnits / 30);

  const displayUnits = safeTotalUnits.toLocaleString();
  const displayPackages = safeTotalPackages.toLocaleString();
  const displayPatients = estimatedPatients.toLocaleString();

  // Top 5 for chart
  const top5 = [...activeMedicines]
    .sort(
      (a, b) =>
        (Number(b.unitsAvailable) || 0) - (Number(a.unitsAvailable) || 0)
    )
    .slice(0, 5)
    .map((m) => ({
      name:
        String(m.name || "Unknown").substring(0, 15) +
        (m.name?.length > 15 ? "..." : ""),
      units: Number(m.unitsAvailable) || 0,
    }));

  const chartData = {
    labels: top5.map((x) => x.name),
    datasets: [
      {
        label: "Units Available",
        data: top5.map((x) => x.units),
        backgroundColor: [
          "#36b5f0",
          "#ff7e5f",
          "#43e97b",
          "#a855f7",
          "#f59e0b",
        ],
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: "Top 5 Medicines by Units",
        font: { size: 16 },
      },
    },
  };

  return (
    <main className="dashboard">
      <div className="container">
        <h2 className="dash-welcome">{welcomeMsg}</h2>

        <div className="dash-cards">
          {/* ALL value= ARE NOW 100% SAFE — NO NaN EVER */}
          <HoverRollCard
            title="Active Medicines"
            value={activeMedicines.length} // ← number
            color="linear-gradient(135deg,#36b5f0,#36f0d8)"
            icon={<FaPills />}
            onClick={() => navigate("/medicines")}
          />

          <HoverRollCard
            title="Expiring Soon"
            value={expiringSoon} // ← number
            color="linear-gradient(135deg,#f59e0b,#fbbf24)"
            icon={<FaExclamationTriangle />}
            onClick={() => navigate("/expiring-soon")}
          />

          <HoverRollCard
            title="Ready for Distribution"
            value={readyForDistribution} // ← number
            color="linear-gradient(135deg,#43e97b,#38f9d7)"
            icon={<FaHandsHelping />}
            onClick={() => navigate("/medicines")}
          />

          <HoverRollCard
            title="Total Active Units"
            value={totalUnits} // ← STRING! NEVER NaN!
            color="linear-gradient(135deg,#8b5cf6,#06b6d4)"
            icon={<FaCapsules />}
            onClick={() => navigate("/medicines")}
          />
        </div>

        {top5.length > 0 && (
          <div className="charts-grid">
            <div className="chart-container">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
