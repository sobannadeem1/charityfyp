// contexts/NotificationContext.jsx - FIX DUPLICATION
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { getAllMedicines } from "../api/medicineapi";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem("medicine-notifications");
      const parsed = saved ? JSON.parse(saved) : [];
      console.log("📥 Loaded notifications from localStorage:", parsed.length);
      return parsed;
    } catch (error) {
      console.error("Error loading notifications from localStorage:", error);
      return [];
    }
  });

  const [unreadCount, setUnreadCount] = useState(0);
  const hasInitialized = useRef(false); // ✅ Prevent duplicate initial checks

  // Save to localStorage whenever notifications change
  useEffect(() => {
    try {
      localStorage.setItem(
        "medicine-notifications",
        JSON.stringify(notifications)
      );
      console.log(
        "💾 Saved notifications to localStorage:",
        notifications.length
      );
    } catch (error) {
      console.error("Error saving notifications to localStorage:", error);
    }

    const unread = notifications.filter((n) => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  // Check for expiring medicines - BUT respect existing notifications
  const checkExpiringMedicines = async () => {
    try {
      console.log("🔍 Checking expiring medicines...");
      const res = await getAllMedicines();
      const medicines = Array.isArray(res) ? res : res.data || [];

      const today = new Date();
      const expiringSoon = medicines.filter((med) => {
        if (!med.expiry) return false;
        const expiryDate = new Date(med.expiry);
        const daysLeft = Math.ceil(
          (expiryDate - today) / (1000 * 60 * 60 * 24)
        );
        return daysLeft <= 7 && daysLeft >= 0;
      });

      console.log("🔍 Found expiring medicines:", expiringSoon.length);

      let newNotificationsCount = 0;

      // Create notifications ONLY for NEW expiring medicines
      expiringSoon.forEach((med) => {
        const expiryDate = new Date(med.expiry);
        const daysLeft = Math.ceil(
          (expiryDate - today) / (1000 * 60 * 60 * 24)
        );

        // ✅ Check if notification already exists
        const notificationExists = notifications.some(
          (n) => n.medicineId === med._id && n.type === "expiry"
        );

        if (!notificationExists) {
          console.log("➕ Adding new notification for:", med.name);
          addNotification({
            type: "expiry",
            title: "Medicine Expiring Soon",
            message: `${
              med.name
            } expires in ${daysLeft} days (${expiryDate.toLocaleDateString()})`,
            medicineId: med._id,
            expiryDate: med.expiry,
            daysLeft,
            read: false,
          });
          newNotificationsCount++;
        }
      });

      console.log(`✅ Added ${newNotificationsCount} new notifications`);
    } catch (error) {
      console.error("Error checking expiring medicines:", error);
    }
  };

  // Run on component mount - but only once
  useEffect(() => {
    if (!hasInitialized.current) {
      console.log("🚀 Initializing notification system...");
      checkExpiringMedicines();
      hasInitialized.current = true;
    }

    // Check every 24 hours for NEW expiries only
    const interval = setInterval(checkExpiringMedicines, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []); // Empty dependency array - only run on mount

  const addNotification = (notification) => {
    setNotifications((prev) => {
      // Double-check if notification already exists (race condition fix)
      const exists = prev.find(
        (n) => n.medicineId === notification.medicineId && n.type === "expiry"
      );

      if (exists) {
        console.log(
          "⚠️ Notification already exists, skipping:",
          notification.message
        );
        return prev;
      }

      console.log("✅ Adding new notification:", notification.message);
      const newNotification = {
        id: Date.now(), // Unique ID
        timestamp: new Date(),
        ...notification,
      };

      return [newNotification, ...prev];
    });
  };

  const markAsRead = (id) => {
    console.log("👀 Marking as read:", id);
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  const markAllAsRead = () => {
    console.log("👀 Marking all as read");
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
  };

  const clearNotification = (id) => {
    console.log("🗑️ Deleting notification ID:", id);
    setNotifications((prev) => {
      const filtered = prev.filter((notif) => notif.id !== id);
      console.log("📊 Notifications after deletion:", filtered.length);
      return filtered;
    });
  };

  // Clear old notifications (older than 30 days)
  const clearOldNotifications = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    setNotifications((prev) =>
      prev.filter((notif) => new Date(notif.timestamp) > thirtyDaysAgo)
    );
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearOldNotifications,
        checkExpiringMedicines,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  }
  return context;
};
