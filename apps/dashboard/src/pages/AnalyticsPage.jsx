import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

export function AnalyticsPage() {
  const [stats, setStats] = useState({
    chatsShown: 0,
    chatsStarted: 0,
    leadsCaptured: 0,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await api.get("/events", {
          // Placeholder for future filters
        });
        setStats((prev) => ({ ...prev, ...(response.data || {}) }));
      } catch (error) {
        console.warn("Analytics endpoint not implemented yet", error);
      }
    }

    loadStats();
  }, []);

  const conversion = stats.chatsShown
    ? Math.round((stats.leadsCaptured / stats.chatsShown) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Analytics</h2>
        <p className="text-sm text-slate-500">
          Track engagement across your microsites. Extend the events API to
          populate these cards.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard label="Chat Popups" value={stats.chatsShown} trend="+12%" />
        <StatCard label="Chats Started" value={stats.chatsStarted} trend="+8%" />
        <StatCard
          label="Leads Captured"
          value={stats.leadsCaptured}
          trend={`${conversion}% conversion`}
        />
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
        Connect event tracking to unlock deeper analytics. Post widget events to
        `/api/events` with type `chat_shown`, `chat_started`, and `lead_submitted`.
      </div>
    </div>
  );
}

function StatCard({ label, value, trend }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-blue-600">
        {trend}
      </p>
    </div>
  );
}


