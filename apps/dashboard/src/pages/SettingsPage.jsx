import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

const DEFAULT_PROJECT_ID = "default";

export function SettingsPage() {
  const [projectId, setProjectId] = useState(DEFAULT_PROJECT_ID);
  const [formState, setFormState] = useState({});
  const [status, setStatus] = useState("idle");

  const loadConfig = async () => {
    setStatus("loading");
    try {
      const response = await api.get(`/widget-config/${projectId}`);
      setFormState(response.data || {});
      setStatus("idle");
    } catch (error) {
      console.error("Failed to load widget config", error);
      setStatus("error");
    }
  };

  useEffect(() => {
    loadConfig();
  }, [projectId]);

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus("saving");
    try {
      // API key is automatically added by axios interceptor if in localStorage
      const response = await api.post(`/widget-config/${projectId}`, formState);
      
      console.log("✅ Save response:", response.data);
      console.log("✅ Response status:", response.status);
      
      // Check if the response contains the updated config or just a message
      if (response.data && (response.data.agentName || response.data.projectId)) {
        // Response contains the config - update form state directly
        setFormState(response.data);
        console.log("✅ Config updated in form state");
      } else if (response.data && response.data.message) {
        // Response is just a message - reload from server
        console.log("ℹ️ Response is message only, reloading config...");
        await loadConfig();
      } else {
        // Unknown response format - reload anyway
        console.log("ℹ️ Unknown response format, reloading config...");
        await loadConfig();
      }
      
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
      
    } catch (error) {
      console.error("❌ Failed to update widget config", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      
      if (error.response?.status === 401) {
        setStatus("error");
        const apiKey = prompt("API Key required. Enter Widget Config API Key:");
        if (apiKey) {
          localStorage.setItem("widget_config_api_key", apiKey);
          // Retry after setting API key
          setTimeout(() => handleSubmit(event), 100);
        }
      } else if (error.response?.status === 429) {
        setStatus("error");
        alert("Too many requests. Please wait a moment and try again.");
      } else {
        setStatus("error");
        const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
        alert(`Failed to save: ${errorMsg}\n\nCheck browser console for details.`);
        console.error("Error details:", error.response?.data || error.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Widget Settings</h2>
          <p className="text-sm text-slate-300">
            Customize the Homesfy chat experience. Changes save to database instantly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-300">Project ID</label>
          <input
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400 focus:outline-none"
            placeholder="default"
          />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-6 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur md:grid-cols-2"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">
            Agent Name
          </label>
          <input
            value={formState.agentName || ""}
            onChange={handleChange("agentName")}
            className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400 focus:outline-none"
            placeholder="e.g., Riya from Homesfy"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">
            Avatar URL
          </label>
          <input
            value={formState.avatarUrl || ""}
            onChange={handleChange("avatarUrl")}
            className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">
            Primary Color
          </label>
          <input
            type="color"
            value={formState.primaryColor || "#6158ff"}
            onChange={handleChange("primaryColor")}
            className="h-10 w-32 cursor-pointer rounded-lg border border-white/10 bg-white/10"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">
            Auto-open Delay (ms)
          </label>
          <input
            type="number"
            min={0}
            step={500}
            value={formState.autoOpenDelayMs || 4000}
            onChange={handleChange("autoOpenDelayMs")}
            className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400 focus:outline-none"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-200">
            Welcome Message
          </label>
          <textarea
            rows={3}
            value={formState.welcomeMessage || ""}
            onChange={handleChange("welcomeMessage")}
            className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400 focus:outline-none"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-200">
            Follow-up Message (after CTA)
          </label>
          <textarea
            rows={2}
            value={formState.followupMessage || ""}
            onChange={handleChange("followupMessage")}
            className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400 focus:outline-none"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-200">
            Configuration Prompt
          </label>
          <textarea
            rows={2}
            value={formState.bhkPrompt || ""}
            onChange={handleChange("bhkPrompt")}
            className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400 focus:outline-none"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-200">
            Inventory Message
          </label>
          <textarea
            rows={2}
            value={formState.inventoryMessage || ""}
            onChange={handleChange("inventoryMessage")}
            className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400 focus:outline-none"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-200">
            Phone Prompt
          </label>
          <textarea
            rows={2}
            value={formState.phonePrompt || ""}
            onChange={handleChange("phonePrompt")}
            className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400 focus:outline-none"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-200">
            Thank You Message
          </label>
          <textarea
            rows={2}
            value={formState.thankYouMessage || ""}
            onChange={handleChange("thankYouMessage")}
            className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400 focus:outline-none"
          />
        </div>

        <div className="md:col-span-2 flex items-center justify-between pt-4 border-t border-white/10">
          <div className="text-sm">
            {status === "saving" && (
              <span className="text-sky-400">💾 Saving changes...</span>
            )}
            {status === "saved" && (
              <span className="text-emerald-400">✅ Changes saved successfully! Widget will update in 2-3 minutes.</span>
            )}
            {status === "error" && (
              <span className="text-red-400">❌ Failed to save. Check console for details.</span>
            )}
            {status === "idle" && (
              <span className="text-slate-400">Ready to save</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={loadConfig}
              disabled={status === "saving" || status === "loading"}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔄 Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                const apiKey = prompt("Enter Widget Config API Key:");
                if (apiKey) {
                  localStorage.setItem("widget_config_api_key", apiKey);
                  alert("API Key saved to localStorage!");
                }
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
            >
              Set API Key
            </button>
            <button
              type="submit"
              disabled={status === "saving"}
              className="rounded-lg bg-sky-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "saving" ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}


