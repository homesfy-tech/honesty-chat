import { useEffect, useState, useRef } from "react";
import { api } from "../lib/api.js";

// Determine default project ID based on environment
// Local development uses "local", production uses "default"
const getDefaultProjectId = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'local'; // Local development
    }
  }
  return 'default'; // Production
};

const DEFAULT_PROJECT_ID = getDefaultProjectId();

export function SettingsPage() {
  const [projectId, setProjectId] = useState(DEFAULT_PROJECT_ID);
  const [formState, setFormState] = useState({});
  const [status, setStatus] = useState("idle");
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Default values for pre-filling
  const DEFAULT_CONFIG = {
    agentName: "Riya from Homesfy",
    avatarUrl: "https://cdn.homesfy.com/assets/riya-avatar.png",
    primaryColor: "#6158ff",
    autoOpenDelayMs: 4000,
    welcomeMessage: "Hi, I'm Riya from Homesfy 👋\nHow can I help you today?",
    followupMessage: "Sure… I'll send that across right away!",
    bhkPrompt: "Which configuration you are looking for?",
    inventoryMessage: "That's cool… we have inventory available with us.",
    phonePrompt: "Please enter your mobile number...",
    thankYouMessage: "Thanks! Our expert will call you shortly 📞",
    bubblePosition: "bottom-right"
  };

  const loadConfig = async () => {
    setStatus("loading");
    try {
      const response = await api.get(`/widget-config/${projectId}`);
      let config = response.data || {};
      
      // Convert snake_case to camelCase if needed (for backward compatibility)
      if (config.agent_name && !config.agentName) {
        config = {
          projectId: config.project_id || config.projectId,
          agentName: config.agent_name || config.agentName,
          avatarUrl: config.avatar_url || config.avatarUrl,
          primaryColor: config.primary_color || config.primaryColor,
          followupMessage: config.followup_message || config.followupMessage,
          bhkPrompt: config.bhk_prompt || config.bhkPrompt,
          inventoryMessage: config.inventory_message || config.inventoryMessage,
          phonePrompt: config.phone_prompt || config.phonePrompt,
          thankYouMessage: config.thank_you_message || config.thankYouMessage,
          bubblePosition: config.bubble_position || config.bubblePosition,
          autoOpenDelayMs: config.auto_open_delay_ms || config.autoOpenDelayMs,
          welcomeMessage: config.welcome_message || config.welcomeMessage,
          propertyInfo: config.property_info || config.propertyInfo || {},
        };
      }
      
      // Merge with defaults to ensure all fields are pre-filled
      const mergedConfig = { ...DEFAULT_CONFIG, ...config };
      setFormState(mergedConfig);
      
      // Set avatar preview if URL exists
      if (mergedConfig.avatarUrl) {
        setAvatarPreview(mergedConfig.avatarUrl);
      }
      
      setStatus("idle");
    } catch (error) {
      console.error("Failed to load widget config", error);
      // Use defaults on error
      setFormState(DEFAULT_CONFIG);
      setAvatarPreview(DEFAULT_CONFIG.avatarUrl);
      setStatus("error");
    }
  };

  useEffect(() => {
    loadConfig();
  }, [projectId]);

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      alert('Please select an image file first');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      // Get API key from localStorage
      const apiKey = localStorage.getItem("widget_config_api_key");
      if (!apiKey) {
        const enteredKey = prompt("API Key required for upload. Enter Widget Config API Key:");
        if (!enteredKey) {
          setUploading(false);
          return;
        }
        localStorage.setItem("widget_config_api_key", enteredKey);
      }

      const response = await api.post('/upload/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-API-Key': localStorage.getItem("widget_config_api_key")
        }
      });

      if (response.data && response.data.url) {
        // Update form state with new avatar URL
        setFormState((prev) => ({ ...prev, avatarUrl: response.data.url }));
        setAvatarPreview(response.data.url);
        alert('✅ Image uploaded successfully! Click "Save Changes" to apply.');
      }
    } catch (error) {
      console.error("Failed to upload image", error);
      if (error.response?.status === 401) {
        const apiKey = prompt("API Key required. Enter Widget Config API Key:");
        if (apiKey) {
          localStorage.setItem("widget_config_api_key", apiKey);
          // Retry upload
          setTimeout(() => handleImageUpload(), 100);
        }
      } else {
        alert(`Failed to upload image: ${error.response?.data?.error || error.message}`);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus("saving");
    try {
      // Log what we're sending
      console.log("📤 Saving config:", {
        projectId,
        avatarUrl: formState.avatarUrl,
        agentName: formState.agentName,
        primaryColor: formState.primaryColor
      });
      
      // API key is automatically added by axios interceptor if in localStorage
      const response = await api.post(`/widget-config/${projectId}`, formState);
      
      console.log("✅ Save response:", response.data);
      console.log("✅ Response status:", response.status);
      
      // Check if the response contains the updated config or just a message
      if (response.data && (response.data.agentName || response.data.projectId)) {
        // Response contains the config - update form state directly
        setFormState(response.data);
        if (response.data.avatarUrl) {
          setAvatarPreview(response.data.avatarUrl);
        }
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
      
      // Notify widget to refresh immediately
      if (typeof window !== 'undefined' && window.HomesfyChatClearCache) {
        window.HomesfyChatClearCache();
        console.log("✅ Widget cache cleared - changes will appear immediately");
      }
      
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
            Customize the Homesfy chat experience. Changes reflect immediately in the widget (within 3 seconds).
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
            Profile Picture
          </label>
          <div className="flex items-center gap-4">
            {avatarPreview && (
              <div className="relative">
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="avatar-upload"
              />
              <label
                htmlFor="avatar-upload"
                className="cursor-pointer inline-block rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/20 transition"
              >
                📷 Choose Image
              </label>
              {fileInputRef.current?.files?.[0] && (
                <button
                  type="button"
                  onClick={handleImageUpload}
                  disabled={uploading}
                  className="ml-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              )}
            </div>
          </div>
          <input
            type="text"
            value={formState.avatarUrl || ""}
            onChange={handleChange("avatarUrl")}
            className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400 focus:outline-none mt-2"
            placeholder="Or enter image URL directly"
          />
          <p className="text-xs text-slate-400 mt-1">
            Upload an image or paste a URL. Changes appear in widget within 3 seconds.
          </p>
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
              <span className="text-emerald-400">✅ Changes saved! Widget will update within 3 seconds.</span>
            )}
            {status === "error" && (
              <span className="text-red-400">❌ Failed to save. Check console for details.</span>
            )}
            {status === "idle" && (
              <span className="text-slate-400">Ready to save - changes reflect immediately</span>
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
