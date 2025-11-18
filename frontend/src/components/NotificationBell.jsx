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
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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
    if (unreadCount > 0 && !isOpen) {
      markAllAsRead();
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
            <button onClick={() => setIsOpen(false)} className="close-btn">
              <FaTimes />
            </button>
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
                  onClick={() => markAsRead(notification.id)}
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
                      {new Date(notification.timestamp).toLocaleDateString()} •
                      {new Date(notification.timestamp).toLocaleTimeString()}
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
