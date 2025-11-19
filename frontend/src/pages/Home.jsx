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
import "../styles/Dashboard.css";
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
  const navigate = useNavigate();

  useEffect(() => {
    fetchMedicines();
    generateWelcomeMessage();
  }, []);

  const fetchMedicines = async () => {
    try {
      const data = await getAllMedicines();
      console.log("🔍 Fetched medicines:", data); // Debug log

      const meds = Array.isArray(data) ? data : data.data || [];
      console.log("📊 Processed medicines array:", meds);

      // Log first medicine to see its structure
      if (meds.length > 0) {
        console.log("🔬 First medicine details:", meds[0]);
        console.log("📋 Available fields:", Object.keys(meds[0]));
        console.log("💊 unitsAvailable field:", meds[0].unitsAvailable);
        console.log("📦 quantity field:", meds[0].quantity);
        console.log("🏷️ packSize field:", meds[0].packSize);
      }

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

  // IMPROVED: Better unit calculation with fallbacks
  const getUnitsAvailable = (medicine) => {
    console.log("🧮 Calculating units for:", medicine?.name);

    // Check if unitsAvailable exists and is valid
    if (
      medicine?.unitsAvailable !== undefined &&
      medicine.unitsAvailable !== null
    ) {
      const units = Number(medicine.unitsAvailable);
      console.log("✅ Using unitsAvailable:", units);
      return isNaN(units) ? 0 : units;
    }

    console.log("❌ unitsAvailable not found, using fallback calculation");

    // Fallback 1: Use quantity field directly
    const quantity = Number(medicine?.quantity) || 0;
    console.log("📦 Quantity field:", quantity);

    // Fallback 2: Calculate from packSize if available
    if (medicine?.packSize) {
      console.log("🏷️ PackSize:", medicine.packSize);
      const match = medicine.packSize.match(
        /(\d+)\s*(tablets?|capsules?|ml|vials?|bottles?|sachets?|tubes?|g|grams?|units?)/i
      );
      const unitsPerPackage = match ? parseInt(match[1]) : 1;
      console.log("🔢 Units per package:", unitsPerPackage);

      const totalUnits = quantity * unitsPerPackage;
      console.log("📊 Total units calculated:", totalUnits);
      return totalUnits;
    }

    console.log("📦 No packSize, using quantity as units:", quantity);
    return quantity;
  };

  const getUnitsPerPackage = (medicine) => {
    if (
      medicine?.unitsPerPackage !== undefined &&
      medicine.unitsPerPackage !== null
    ) {
      const units = Number(medicine.unitsPerPackage);
      return isNaN(units) ? 1 : units;
    }

    // Fallback: Extract from packSize
    if (!medicine?.packSize) return 1;
    const match = medicine.packSize.match(
      /(\d+)\s*(tablets?|capsules?|ml|vials?|bottles?|sachets?|tubes?|g|grams?|units?)/i
    );
    return match ? parseInt(match[1]) : 1;
  };

  // FILTER: Get only active medicines (stock > 0)
  const activeMedicines = medicines.filter((medicine) => {
    const units = getUnitsAvailable(medicine);
    console.log(
      `📋 ${medicine.name}: ${units} units - ${
        units > 0 ? "ACTIVE" : "OUT OF STOCK"
      }`
    );
    return units > 0;
  });

  // FIXED: Safe calculations using ONLY active medicines
  const calculateTotalUnits = (meds) => {
    const total = meds.reduce((total, medicine) => {
      const units = getUnitsAvailable(medicine);
      console.log(`➕ Adding ${medicine.name}: ${units} units`);
      return total + units;
    }, 0);

    console.log("🎯 TOTAL UNITS CALCULATED:", total);
    return total;
  };

  const calculateTotalPackages = (meds) => {
    return meds.reduce((total, medicine) => {
      const unitsAvailable = getUnitsAvailable(medicine);
      const unitsPerPackage = getUnitsPerPackage(medicine);
      const packages = Math.ceil(unitsAvailable / unitsPerPackage);
      console.log(
        `📦 ${medicine.name}: ${unitsAvailable} units = ${packages} packages`
      );
      return total + packages;
    }, 0);
  };

  // Counts with SAFE calculations - USING ACTIVE MEDICINES ONLY
  const totalActiveMedicines = activeMedicines.length;
  const totalAllMedicines = medicines.length;

  const outOfStock = medicines.filter((m) => getUnitsAvailable(m) <= 0).length;

  const expiringSoon = activeMedicines.filter((m) => {
    if (!m.expiry) return false;
    const expiryDate = new Date(m.expiry);
    const today = new Date();
    const diffDays = (expiryDate - today) / (1000 * 60 * 60 * 24);
    return diffDays <= 30 && diffDays >= 0;
  }).length;

  // Ready for Distribution - ONLY ACTIVE MEDICINES
  const readyForDistribution = activeMedicines.filter(
    (med) => !med.expiry || new Date(med.expiry) > new Date()
  );

  const totalPackagesAvailable = calculateTotalPackages(activeMedicines);
  const totalUnitsAvailable = calculateTotalUnits(activeMedicines);

  console.log("🎯 FINAL TOTAL UNITS:", totalUnitsAvailable);
  console.log("📦 FINAL TOTAL PACKAGES:", totalPackagesAvailable);

  const estimatedPatientsServed = Math.floor(totalUnitsAvailable / 30);

  // FIXED: Safe inventory value calculation - ONLY ACTIVE MEDICINES
  const totalInventoryValue = activeMedicines.reduce((sum, med) => {
    const unitsAvailable = getUnitsAvailable(med);
    const unitsPerPackage = getUnitsPerPackage(med);
    const packagePrice = Number(med.purchasePrice || 0);

    if (unitsPerPackage > 0) {
      const unitCost = packagePrice / unitsPerPackage;
      const medicineValue = unitsAvailable * unitCost;
      console.log(
        `💰 ${med.name}: ${unitsAvailable} units × PKR ${unitCost.toFixed(
          2
        )} = PKR ${medicineValue.toFixed(2)}`
      );
      return sum + medicineValue;
    }
    return sum;
  }, 0);

  console.log("💰 FINAL INVENTORY VALUE:", totalInventoryValue);

  // FIXED: Top ACTIVE medicines only
  const topMedicinesByUnits = activeMedicines
    .map((medicine) => ({
      ...medicine,
      totalUnits: getUnitsAvailable(medicine),
      displayName:
        medicine.name.length > 15
          ? medicine.name.substring(0, 15) + "..."
          : medicine.name,
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
            return `Units: ${context.raw.toLocaleString()}`;
          },
        },
      },
      title: {
        display: true,
        text: "Top Active Medicines by Available Units",
        color: "#000",
        font: { size: 16, weight: "bold" },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: "#000",
          callback: function (value) {
            return value.toLocaleString();
          },
        },
        title: {
          display: true,
          text: "Total Units",
          color: "#000",
        },
      },
      x: {
        ticks: {
          color: "#000",
        },
        title: {
          display: true,
          text: "Medicines",
          color: "#000",
        },
      },
    },
  };

  // Bar Chart Data - ONLY ACTIVE MEDICINES
  const barChartData = {
    labels: topMedicinesByUnits.map((med) => med.displayName),
    datasets: [
      {
        label: "Units Available",
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

  // FIXED: Navigation handlers
  const handleNavigateToMedicines = () => {
    navigate("/medicines");
  };

  return (
    <main className="dashboard">
      <div className="container">
        <h2 className="dash-welcome">{welcomeMsg}</h2>

        <div className="dash-cards">
          <HoverRollCard
            title="Active Medicines"
            value={totalActiveMedicines}
            color="linear-gradient(135deg,#36b5f0,#36f0d8)"
            icon={<FaPills />}
            onClick={handleNavigateToMedicines}
            subtitle={`${totalAllMedicines} total medicines`}
            additionalInfo={[
              `📊 ${
                new Set(activeMedicines.map((m) => m.category)).size
              } categories`,
              `📦 ${outOfStock} out of stock`,
            ]}
          />

          <HoverRollCard
            title="Expiring Soon"
            value={expiringSoon}
            color="linear-gradient(135deg,#f59e0b,#fbbf24)"
            icon={<FaExclamationTriangle />}
            onClick={handleNavigateToMedicines}
            subtitle="Within 30 days"
            additionalInfo={[
              `${expiringSoon} of ${totalActiveMedicines} active`,
              "Check inventory regularly",
            ]}
          />

          <HoverRollCard
            title="Ready for Distribution"
            value={readyForDistribution.length}
            color="linear-gradient(135deg, #43e97b, #38f9d7)"
            icon={<FaHandsHelping />}
            onClick={handleNavigateToMedicines}
            subtitle={
              !isNaN(totalUnitsAvailable)
                ? `${totalUnitsAvailable.toLocaleString()} total units`
                : "Calculating..."
            }
            additionalInfo={[
              `📦 ${totalPackagesAvailable} packages`,
              `👥 Serves ~${
                !isNaN(estimatedPatientsServed)
                  ? estimatedPatientsServed.toLocaleString()
                  : 0
              } patients`,
            ]}
          />

          <HoverRollCard
            title="Total Active Units"
            value={
              !isNaN(totalUnitsAvailable)
                ? totalUnitsAvailable.toLocaleString()
                : "Calculating..."
            }
            color="linear-gradient(135deg,#8b5cf6,#06b6d4)"
            icon={<FaCapsules />}
            subtitle="Available for distribution"
            onClick={handleNavigateToMedicines}
            additionalInfo={[
              `📊 ${totalPackagesAvailable} packages`,
              `🏥 ${
                !isNaN(estimatedPatientsServed)
                  ? estimatedPatientsServed.toLocaleString()
                  : 0
              } patients`,
            ]}
          />
        </div>

        {topMedicinesByUnits.length > 0 && (
          <div className="charts-grid">
            <div className="chart-container">
              <Bar data={barChartData} options={barChartOptions} />
              <p className="chart-note">
                * Showing top {topMedicinesByUnits.length} active medicines by
                unit count
              </p>
            </div>
          </div>
        )}

        {activeMedicines.length === 0 && medicines.length > 0 && (
          <div className="no-data-message">
            <h3>📭 No Active Medicines</h3>
            <p>
              All {medicines.length} medicines are currently out of stock. Add
              new stock to see analytics.
            </p>
            <button
              className="add-medicine-btn"
              onClick={handleNavigateToMedicines}
            >
              ➕ Manage Medicines
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
