import { NavLink, Route, Routes } from "react-router-dom";
import { LeadsPage } from "./pages/LeadsPage.jsx";
import { SettingsPage } from "./pages/SettingsPage.jsx";
import { InstallPage } from "./pages/InstallPage.jsx";
import { AnalyticsPage } from "./pages/AnalyticsPage.jsx";
import { ConversationsPage } from "./pages/ConversationsPage.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";

const navItems = [
  { to: "/leads", label: "Leads" },
  { to: "/conversations", label: "Conversations" },
  { to: "/analytics", label: "Analytics" },
  { to: "/settings", label: "Widget Settings" },
  { to: "/install", label: "Install Script" },
];

export default function App() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-36 -left-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute -bottom-40 right-[-10%] h-[420px] w-[420px] rounded-full bg-indigo-500/20 blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="border-b border-white/5 bg-white/5 backdrop-blur-xl">
          <div className="mx-auto flex max-w-none items-center justify-between px-6 py-6">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.4em] text-slate-300">
                Homesfy Experience Cloud
              </p>
              <h1 className="text-2xl font-semibold">Chat Widget Command Center</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-500 to-blue-600" />
                <div>
                  <p className="text-sm font-medium">
                    {localStorage.getItem("dashboard_username") || "Admin"}
                  </p>
                  <p className="text-xs text-slate-300">homesfy.com</p>
                </div>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem("dashboard_token");
                  localStorage.removeItem("dashboard_username");
                  localStorage.removeItem("dashboard_login_time");
                  window.location.href = "/";
                }}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
          <nav className="border-t border-white/5">
            <div className="mx-auto flex max-w-none gap-6 px-6">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `relative py-4 text-sm font-medium transition-colors ${
                      isActive
                        ? "text-sky-300"
                        : "text-slate-300/70 hover:text-slate-100"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <span className="relative inline-flex items-center gap-2">
                      {isActive && (
                        <span className="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full bg-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.6)]" />
                      )}
                      {item.label}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>
        </header>

        <main className="mx-auto max-w-none px-6 py-10">
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <LeadsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leads"
              element={
                <ProtectedRoute>
                  <LeadsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/conversations"
              element={
                <ProtectedRoute>
                  <ConversationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/install"
              element={
                <ProtectedRoute>
                  <InstallPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}


