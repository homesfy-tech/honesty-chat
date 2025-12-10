import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApiUrl, legacyAuthConfig } from "../config/auth.js";
import { api } from "../lib/api.js";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const trimmedUsername = username.trim();
      const trimmedPassword = password.trim();

      if (!trimmedUsername || !trimmedPassword) {
        setError("Username and password are required");
        setLoading(false);
        return;
      }

      // Try API authentication first (multi-user support)
      try {
        const response = await api.post("/users/auth", {
          username: trimmedUsername,
          password: trimmedPassword,
        });

        if (response.data.success) {
          // Store session information
          localStorage.setItem("dashboard_token", response.data.token);
          localStorage.setItem("dashboard_username", response.data.username);
          localStorage.setItem("dashboard_login_time", Date.now().toString());
          localStorage.setItem("dashboard_expires_at", response.data.expiresAt.toString());

          // Redirect to dashboard
          window.location.href = "/";
          return;
        }
      } catch (apiError) {
        // If API authentication fails, try legacy single-user auth
        console.log("API auth failed, trying legacy auth:", apiError.response?.status);
        
        const expectedUsername = legacyAuthConfig.username.trim();
        const expectedPassword = legacyAuthConfig.password.trim();

        if (trimmedUsername === expectedUsername && trimmedPassword === expectedPassword) {
          // Legacy authentication (backward compatibility)
          const token = btoa(`${username}:${Date.now()}`);
          localStorage.setItem("dashboard_token", token);
          localStorage.setItem("dashboard_username", username);
          localStorage.setItem("dashboard_login_time", Date.now().toString());

          window.location.href = "/";
          return;
        }
      }

      // If both methods fail
      setError("Invalid username or password");
    } catch (err) {
      setError("Login failed. Please try again.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Homesfy Experience Cloud
            </h1>
            <p className="text-slate-300 text-sm">
              Chat Widget Command Center
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-white placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Logging in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">
              Secure access to dashboard
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            Configure credentials in environment variables
          </p>
        </div>
      </div>
    </div>
  );
}

