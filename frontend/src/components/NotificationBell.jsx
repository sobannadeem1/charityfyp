// components/NotificationBell.jsx
import React, { useState, useRef, useEffect } from "react";
import { useNotifications } from "../context/NotificationContext";
import { FaBell, FaTimes } from "react-icons/fa";
import "../styles/notificationBell.css";

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    checkExpiringMedicines,  
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};
useEffect(() => {
  const handleEscape = (e) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  document.addEventListener("keydown", handleEscape);
  return () => document.removeEventListener("keydown", handleEscape);
}, []);
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

const handleBellClick = () => {
  setIsOpen(!isOpen);
  if (!isOpen) {
    checkExpiringMedicines(); // refresh notifications
  }
};
  const getUrgencyColor = (daysLeft) => {
    if (daysLeft <= 3) return "#ff4444";
    if (daysLeft <= 7) return "#ffaa00";
    return "#33b5e5";
  };

  const getUrgencyText = (daysLeft) => {
    if (daysLeft <= 3) return "Critical";
    if (daysLeft <= 7) return "Urgent";
    return "Warning";
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <div className="bell-icon" onClick={handleBellClick}>
        <FaBell />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </div>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
  <h3>Notifications</h3>

  <div className="notification-actions">
    {unreadCount > 0 && (
      <button
        className="mark-all-read"
        onClick={markAllAsRead}
      >
        Mark all read
      </button>
    )}

    <button onClick={() => setIsOpen(false)} className="close-btn">
      <FaTimes />
    </button>
  </div>
</div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <p>No notifications</p>
                <span>You're all caught up! 🎉</span>
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${
                    notification.read ? "read" : "unread"
                  }`}
                  onClick={(e) => {
  e.stopPropagation();
  markAsRead(notification.id);
}}
                >
                  <div className="notification-content">
                    <div className="notification-title">
                      {notification.title}
                      {notification.daysLeft && (
                        <span
                          className="urgency-badge"
                          style={{
                            backgroundColor: getUrgencyColor(
                              notification.daysLeft
                            ),
                          }}
                        >
                          {getUrgencyText(notification.daysLeft)}
                        </span>
                      )}
                    </div>
                    <div className="notification-message">
                      {notification.message}
                    </div>
                    
                 <div className="notification-time">
  {formatTime(notification.timestamp)}
</div>
                  </div>
                  <button
                    className="delete-notification"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearNotification(notification.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          {notifications.length > 10 && (
            <div className="notification-footer">
              <button
                onClick={() => {
                  /* Navigate to full notifications page */
                }}
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
