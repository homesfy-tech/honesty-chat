import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { LoginPage } from "../pages/LoginPage.jsx";

function checkAuthentication() {
  const token = localStorage.getItem("dashboard_token");
  const username = localStorage.getItem("dashboard_username");
  const loginTime = localStorage.getItem("dashboard_login_time");
  const expiresAt = localStorage.getItem("dashboard_expires_at");

  if (token && username && loginTime) {
    // Check expiration (use expiresAt if available, otherwise calculate from loginTime)
    let isValid = false;
    
    if (expiresAt) {
      // Use API-provided expiration time
      isValid = Date.now() < parseInt(expiresAt, 10);
    } else {
      // Fallback to 24-hour session for legacy auth
      const sessionDuration = 24 * 60 * 60 * 1000;
      const timeSinceLogin = Date.now() - parseInt(loginTime, 10);
      isValid = timeSinceLogin < sessionDuration;
    }

    if (isValid) {
      return true;
    } else {
      // Session expired - clear all auth data
      localStorage.removeItem("dashboard_token");
      localStorage.removeItem("dashboard_username");
      localStorage.removeItem("dashboard_login_time");
      localStorage.removeItem("dashboard_expires_at");
      return false;
    }
  }
  return false;
}

export function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    // Check authentication on mount
    setIsAuthenticated(checkAuthentication());

    // Listen for storage changes (when login happens in another tab/window)
    const handleStorageChange = (e) => {
      if (e.key === "dashboard_token" || e.key === "dashboard_username" || e.key === "dashboard_login_time") {
        setIsAuthenticated(checkAuthentication());
      }
    };

    // Listen for custom login event (when login happens in same window)
    const handleLogin = () => {
      setIsAuthenticated(checkAuthentication());
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("dashboard-login", handleLogin);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("dashboard-login", handleLogin);
    };
  }, []);

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Render protected content
  return children;
}

