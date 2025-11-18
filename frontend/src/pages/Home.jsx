import { useEffect, useState } from "react";
import { getAllMedicines } from "../api/medicineapi";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import "../styles/dashboard.css";
import HoverRollCard from "../components/CardCounter";
import {
  FaPills,
  FaExclamationTriangle,
  FaBoxOpen,
  FaHandHoldingHeart,
  FaHandsHelping,
  FaCapsules,
  FaPrescriptionBottleAlt,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Home() {
  const [medicines, setMedicines] = useState([]);
  const [welcomeMsg, setWelcomeMsg] = useState("");

  useEffect(() => {
    fetchMedicines();
    generateWelcomeMessage();
  }, []);

  const fetchMedicines = async () => {
    try {
      const data = await getAllMedicines();
      const meds = Array.isArray(data) ? data : data.data || [];
      setMedicines(meds);
    } catch (error) {
      console.error("Failed to fetch medicines:", error);
    }
  };

  const generateWelcomeMessage = () => {
    const hour = new Date().getHours();
    let greeting = "Hello";
    if (hour < 12) greeting = "Good Morning 🌅";
    else if (hour < 18) greeting = "Good Afternoon ☀️";
    else greeting = "Good Evening 🌙";

    const emojis = ["💊", "🩺", "🧴", "💉", "🌟", "📦", "💊"];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    setWelcomeMsg(`${greeting} ${randomEmoji}`);
  };

  // Helper function to extract units from packSize
  const getUnitsPerPackage = (medicine) => {
    if (!medicine?.packSize) return 1;
    const match = medicine.packSize.match(
      /(\d+)\s*(tablets?|capsules?|ml|vials?|bottles?|sachets?|tubes?|g|grams?|units?)/i
    );
    return match ? parseInt(match[1]) : 1;
  };

  // Calculate total units across all medicines
  const calculateTotalUnits = (meds) => {
    return meds.reduce((total, medicine) => {
      const unitsPerPackage = getUnitsPerPackage(medicine);
      return total + Number(medicine.quantity) * unitsPerPackage;
    }, 0);
  };

  // Counts with Package/Unit Logic
  const totalMedicines = medicines.length;

  const outOfStock = medicines.filter((m) => Number(m.quantity) <= 0).length;

  const expiringSoon = medicines.filter((m) => {
    if (!m.expiry) return false;
    const expiryDate = new Date(m.expiry);
    const today = new Date();
    const diffDays = (expiryDate - today) / (1000 * 60 * 60 * 24);
    return diffDays <= 30 && diffDays >= 0;
  }).length;

  // Ready for Distribution with Unit Calculation
  const readyForDistribution = medicines.filter(
    (med) =>
      Number(med.quantity) > 0 &&
      (!med.expiry || new Date(med.expiry) > new Date())
  );

  const totalPackagesAvailable = readyForDistribution.reduce(
    (sum, m) => sum + Number(m.quantity),
    0
  );

  const totalUnitsAvailable = calculateTotalUnits(readyForDistribution);

  const estimatedPatientsServed = Math.floor(totalUnitsAvailable / 30); // Assuming 30 units per patient

  // NEW: Category-wise statistics
  const categoryStats = medicines.reduce((acc, medicine) => {
    const category = medicine.category || "Other";
    if (!acc[category]) {
      acc[category] = {
        count: 0,
        totalPackages: 0,
        totalUnits: 0,
      };
    }
    acc[category].count++;
    acc[category].totalPackages += Number(medicine.quantity);
    acc[category].totalUnits +=
      Number(medicine.quantity) * getUnitsPerPackage(medicine);
    return acc;
  }, {});

  // Top 5 medicines by unit count
  const topMedicinesByUnits = medicines
    .map((medicine) => ({
      ...medicine,
      totalUnits: Number(medicine.quantity) * getUnitsPerPackage(medicine),
    }))
    .sort((a, b) => b.totalUnits - a.totalUnits)
    .slice(0, 5);

  // Chart Options
  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: { color: "#000", font: { size: 12 } },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `Units: ${context.raw}`;
          },
        },
      },
      title: {
        display: true,
        text: "Top Medicines by Total Units",
        color: "#000",
        font: { size: 16, weight: "bold" },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: "#000" },
        title: {
          display: true,
          text: "Total Units",
          color: "#000",
        },
      },
      x: {
        ticks: { color: "#000" },
        title: {
          display: true,
          text: "Medicines",
          color: "#000",
        },
      },
    },
  };

  // Bar Chart Data - Top Medicines by Units
  const barChartData = {
    labels: topMedicinesByUnits.map((med) => med.name),
    datasets: [
      {
        label: "Total Units Available",
        data: topMedicinesByUnits.map((med) => med.totalUnits),
        backgroundColor: [
          "#36b5f0",
          "#ff7e5f",
          "#43e97b",
          "#a855f7",
          "#f59e0b",
        ],
        borderColor: "#fff",
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const navigate = useNavigate();

  return (
    <main className="dashboard">
      <div className="container">
        <h2 className="dash-welcome">{welcomeMsg}</h2>

        <div className="dash-cards">
          <HoverRollCard
            title="Total Medicines"
            value={totalMedicines}
            color="linear-gradient(135deg,#36b5f0,#36f0d8)"
            icon={<FaPills />}
            onClick={() => navigate("/medicines")}
            subtitle={`${Object.keys(categoryStats).length} categories`}
          />

          <HoverRollCard
            title="Expiring Soon"
            value={expiringSoon}
            color="linear-gradient(135deg,#ff7e5f,#feb47b)"
            icon={<FaExclamationTriangle />}
            onClick={() => navigate("/expiring-soon")}
            subtitle="Within 30 days"
          />

          <HoverRollCard
            title="Ready for Distribution"
            value={readyForDistribution.length}
            color="linear-gradient(135deg, #43e97b, #38f9d7)"
            icon={<FaHandsHelping />}
            onClick={() => navigate("/medicines")}
            subtitle={`${totalUnitsAvailable.toLocaleString()} total units`}
            additionalInfo={[
              `📦 ${totalPackagesAvailable} packages`,
              `👥 Serves ~${estimatedPatientsServed} patients`,
            ]}
          />

          <HoverRollCard
            title="Inventory Value"
            value={`PKR ${medicines
              .reduce(
                (sum, med) =>
                  sum + Number(med.quantity) * Number(med.purchasePrice || 0),
                0
              )
              .toLocaleString()}`}
            color="linear-gradient(135deg,#a855f7,#ec4899)"
            icon={<FaPrescriptionBottleAlt />}
            subtitle="Total stock value"
            additionalInfo={[
              `💊 ${totalUnitsAvailable.toLocaleString()} units`,
              `📦 ${totalPackagesAvailable} packages`,
            ]}
          />
        </div>

        <div className="charts-grid">
          <div className="chart-container">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>
      </div>
    </main>
  );
}
