import React from "react";
import ReactDOM from "react-dom/client";
import { ChatWidget } from "./ChatWidget.jsx";
import styles from "./styles.css?inline";
import { detectPropertyFromPage } from "./propertyDetector.js";

// CRITICAL: Use single widget instance for all project IDs
// Project ID is only used for lead submission (CRM), not for widget config
const WIDGET_INSTANCE_KEY = "default-widget-instance";
const mountedWidgets = new Map();

// Global state store to preserve widget state across re-renders
// This prevents state loss when root.render() is called
const widgetStateStore = {
  isOpen: false,
  isIntentionallyOpen: false,
  lastOpenTime: 0,
  hasShown: false,
  messages: [],
  selectedCta: null,
  selectedBhk: null,
  currentStage: "cta",
  userName: "",
  nameSubmitted: false,
  phoneSubmitted: false,
  componentMountId: null,
};

// Get env API URL, but ignore it if it's localhost and we're on HTTPS
const rawEnvApiBaseUrl =
  typeof import.meta !== "undefined" && import.meta.env
    ? import.meta.env.VITE_WIDGET_API_BASE_URL
    : undefined;

// Filter out localhost if we're on HTTPS (runtime check)
const envApiBaseUrl = (() => {
  if (!rawEnvApiBaseUrl) return undefined;
  // If we're on HTTPS and env URL is localhost, ignore it (will use production fallback)
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && 
      (rawEnvApiBaseUrl.includes('localhost') || rawEnvApiBaseUrl.includes('127.0.0.1'))) {
    console.warn("HomesfyChat: Ignoring localhost env API URL on HTTPS site");
    return undefined;
  }
  return rawEnvApiBaseUrl;
})();

const envDefaultProjectId =
  typeof import.meta !== "undefined" && import.meta.env
    ? import.meta.env.VITE_WIDGET_DEFAULT_PROJECT_ID
    : undefined;

// Cache for widget theme to prevent repeated fetches
// Very short cache (2 seconds) to ensure widget always gets latest config
const themeCache = new Map();
const CACHE_DURATION_MS = 2 * 1000; // 2 seconds (ensures latest config while preventing excessive requests)

// Function to clear cache (useful for forcing fresh config)
function clearThemeCache() {
  themeCache.clear();
  console.log("HomesfyChat: Theme cache cleared - will fetch fresh config on next request");
}

async function fetchWidgetTheme(apiBaseUrl, projectId, forceRefresh = false) {
  // Check for cache-busting parameter in URL
  const urlParams = new URLSearchParams(window.location.search);
  const cacheBust = urlParams.get('widget_cache_bust') === 'true' || forceRefresh;
  
  // Check cache first (unless forcing refresh)
  const cacheKey = `${apiBaseUrl}:${projectId}`;
  if (!cacheBust) {
    const cached = themeCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION_MS) {
      console.log("HomesfyChat: Using cached config (cache expires in", Math.round((CACHE_DURATION_MS - (Date.now() - cached.timestamp)) / 1000), "seconds)");
      return cached.data;
    }
  } else {
    // Clear cache if forcing refresh
    themeCache.delete(cacheKey);
    console.log("HomesfyChat: Cache-busting enabled - fetching fresh config");
  }
  
  try {
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    // ALWAYS add timestamp to bypass browser cache and ensure latest config
    // This ensures we get the latest config from the server every time
    const timestamp = Date.now();
    const response = await fetch(
      `${apiBaseUrl}/api/widget-config/${encodeURIComponent(projectId)}?t=${timestamp}&_=${timestamp}`,
      {
        signal: controller.signal,
        credentials: 'omit', // Don't send credentials
        // Don't send custom headers - they trigger CORS preflight and aren't needed
        // cache: 'no-store' already prevents browser caching
        cache: 'no-store', // Always fetch fresh from server, never use browser cache
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to load widget config for ${projectId}`);
    }
    const data = await response.json();
    // Cache the result with timestamp
    const cacheTimestamp = Date.now();
    themeCache.set(cacheKey, { data, timestamp: cacheTimestamp });
    console.log("HomesfyChat: ✅ Latest config loaded from server and cached (will refresh in 10 seconds)");
    console.log("HomesfyChat: 📋 Config timestamp:", new Date(cacheTimestamp).toISOString());
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn("HomesfyChat: Widget theme fetch timeout, using defaults");
    } else {
      console.warn("HomesfyChat: using fallback theme", error);
    }
    // Return empty object, don't cache errors
    return {};
  }
}

function createEventDispatcher(apiBaseUrl, projectId, microsite) {
  return (type, extra = {}) => {
    // Skip event dispatch if API URL is localhost and we're not on localhost
    // This prevents connection refused errors in production
    const isLocalhostApi = apiBaseUrl && (apiBaseUrl.includes('localhost') || apiBaseUrl.includes('127.0.0.1'));
    const isLocalhostSite = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isLocalhostApi && !isLocalhostSite) {
      // Silently skip - events are not critical and localhost API won't work on production sites
      return;
    }
    
    try {
      const payload = {
        type,
        projectId,
        microsite,
        payload: { ...extra, at: new Date().toISOString() },
      };

      const body = JSON.stringify(payload);

      // Always use fetch with credentials: 'omit' to avoid CORS issues
      // sendBeacon doesn't support credentials control and may cause CORS errors
      fetch(`${apiBaseUrl}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
        credentials: 'omit', // CRITICAL: Must be 'omit' when using wildcard CORS
      }).catch((error) => {
        // Silently fail - events are not critical for widget functionality
        // Only log in development mode
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.debug("HomesfyChat: Event dispatch failed (non-critical):", error.message);
        }
      });
    } catch (error) {
      // Only log in development mode
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.debug("HomesfyChat: failed to dispatch event", error);
      }
    }
  };
}

async function mountWidget({
  apiBaseUrl,
  projectId, // Project ID from script - used for lead submission to CRM
  microsite,
  theme, // Shared widget design config (same for all projects)
  target,
}) {
  // Use single widget instance for all projects (shared design, like WhatsApp)
  // Project ID is only used for lead submission (different projects = different CRM entries)
  if (mountedWidgets.has(WIDGET_INSTANCE_KEY)) {
    const existingInstance = mountedWidgets.get(WIDGET_INSTANCE_KEY);
    console.log("HomesfyChat: Widget already mounted - skipping mount, updating project ID for lead submission:", projectId);
    // Update theme if it changed (but don't remount)
    if (existingInstance.updateTheme && theme) {
      existingInstance.updateTheme(theme);
    }
    // Update projectId in the instance for lead submission
    if (existingInstance.updateProjectId) {
      existingInstance.updateProjectId(projectId);
    }
    return existingInstance;
  }
  
  // CRITICAL: Double-check if widget host already exists in DOM
  // This prevents duplicate mounts even if mountedWidgets map is cleared
  const existingHost = document.querySelector('[data-homesfy-widget-host="true"]');
  if (existingHost) {
    console.log("HomesfyChat: Widget host element already exists in DOM - preventing duplicate mount");
    // Try to get existing instance or create a dummy one
    if (mountedWidgets.has(WIDGET_INSTANCE_KEY)) {
      return mountedWidgets.get(WIDGET_INSTANCE_KEY);
    }
    // If no instance but host exists, something went wrong - don't mount again
    console.error("HomesfyChat: Widget host exists but no instance found - this should not happen");
    return {
      destroy: () => {},
      updateTheme: () => {},
      updateProjectId: () => {},
    };
  }

  const host = target ?? document.createElement("div");
  if (!target) {
    // Ensure host is visible and properly positioned
    host.style.cssText = "position: fixed !important; z-index: 2147483647 !important; pointer-events: none !important; display: block !important; visibility: visible !important; opacity: 1 !important;";
    host.setAttribute('data-homesfy-widget-host', 'true');
    
    // Ensure body exists before appending
    if (!document.body) {
      console.error("HomesfyChat: document.body not available, waiting...");
      await new Promise(resolve => {
        if (document.body) {
          resolve();
        } else {
          const observer = new MutationObserver(() => {
            if (document.body) {
              observer.disconnect();
              resolve();
            }
          });
          observer.observe(document.documentElement, { childList: true });
          // Timeout after 5 seconds
          setTimeout(() => {
            observer.disconnect();
            resolve();
          }, 5000);
        }
      });
    }
    
    if (document.body) {
      document.body.appendChild(host);
      console.log("HomesfyChat: Widget host element added to DOM", host);
    } else {
      console.error("HomesfyChat: Failed to add widget host - document.body not available");
      throw new Error("Cannot mount widget: document.body not available");
    }
  }

  let shadow;
  try {
    shadow = host.attachShadow({ mode: "open" });
  } catch (shadowError) {
    console.error("HomesfyChat: Failed to create Shadow DOM:", shadowError);
    // Fallback: use host directly if Shadow DOM is not supported
    shadow = host;
    host.style.cssText += "all: initial; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;";
  }

  const styleTag = document.createElement("style");
  styleTag.textContent = styles;
  shadow.appendChild(styleTag);

  const mountNode = document.createElement("div");
  mountNode.style.cssText = "display: block !important; visibility: visible !important; opacity: 1 !important;";
  shadow.appendChild(mountNode);
  console.log("HomesfyChat: Widget mount node created in Shadow DOM", mountNode);

  // Create event dispatcher once and reuse it
  const eventDispatcher = createEventDispatcher(apiBaseUrl, projectId, microsite);
  
  // Create React root once
  const root = ReactDOM.createRoot(mountNode);
  
  // Store current props to detect changes
  // projectId is stored here for lead submission (different projects = different CRM entries)
  // theme is shared widget design (same for all projects)
  let currentProps = {
    apiBaseUrl,
    projectId, // Used for lead submission to CRM
    microsite,
    theme, // Shared widget design config
    onEvent: eventDispatcher,
  };

  // Initial render - use stable key that doesn't depend on projectId
  // Pass preserved state to widget to restore state across re-renders
  root.render(
    <ChatWidget
      key={WIDGET_INSTANCE_KEY} // Stable key - same for all project IDs
      apiBaseUrl={apiBaseUrl}
      projectId={projectId} // Pass projectId only for lead submission
      microsite={microsite}
      theme={theme}
      onEvent={eventDispatcher}
      preservedState={widgetStateStore} // Pass preserved state
    />
  );

  const instance = {
    root,
    host,
    mountNode,
    updateTheme(newTheme) {
      // Update theme without remounting
      // CRITICAL: Only update if theme actually changed (deep comparison)
      // This prevents unnecessary re-renders that could reset widget state
      if (newTheme && JSON.stringify(newTheme) !== JSON.stringify(currentProps.theme)) {
        console.log("HomesfyChat: Updating widget theme without remounting");
        currentProps.theme = newTheme;
        // Preserve state when re-rendering
        root.render(
          <ChatWidget
            key={WIDGET_INSTANCE_KEY}
            apiBaseUrl={currentProps.apiBaseUrl}
            projectId={currentProps.projectId} // Keep current projectId for lead submission
            microsite={currentProps.microsite}
            theme={newTheme}
            onEvent={currentProps.onEvent}
            preservedState={widgetStateStore} // Pass preserved state
          />
        );
      } else {
        console.log("HomesfyChat: Theme update skipped - no changes detected");
      }
    },
    updateProjectId(newProjectId) {
      // Update projectId for lead submission without remounting
      // This allows the same widget instance to handle leads for different projects
      if (newProjectId && newProjectId !== currentProps.projectId) {
        console.log("HomesfyChat: Updating project ID for lead submission:", newProjectId);
        currentProps.projectId = newProjectId;
        // Re-render with new projectId (only affects lead submission, widget design stays the same)
        // Preserve state when re-rendering
        root.render(
          <ChatWidget
            key={WIDGET_INSTANCE_KEY}
            apiBaseUrl={currentProps.apiBaseUrl}
            projectId={newProjectId}
            microsite={currentProps.microsite}
            theme={currentProps.theme}
            onEvent={currentProps.onEvent}
            preservedState={widgetStateStore} // Pass preserved state
          />
        );
      }
    },
    destroy() {
      console.log("HomesfyChat: Destroying widget instance");
      root.unmount();
      mountedWidgets.delete(WIDGET_INSTANCE_KEY);
      if (!target && host && host.parentNode) {
        host.remove();
      }
    },
  };

  mountedWidgets.set(WIDGET_INSTANCE_KEY, instance);
  console.log("HomesfyChat: Widget instance created - Project ID", projectId, "will be used for lead submission");
  return instance;
}

// Global flag to prevent multiple init calls
let initInProgress = false;

async function init(options = {}) {
  try {
    // CRITICAL: Check if widget is already mounted FIRST, before any async operations
    // This prevents multiple initializations that could cause remounts
    if (mountedWidgets.has(WIDGET_INSTANCE_KEY)) {
      const existingInstance = mountedWidgets.get(WIDGET_INSTANCE_KEY);
      console.log("HomesfyChat: Widget already initialized - skipping re-initialization to prevent reloads");
      const scriptElement = options.element || document.currentScript;
      const projectId =
        options.projectId ||
        scriptElement?.dataset.project ||
        scriptElement?.dataset.projectId ||
        scriptElement?.getAttribute('data-project') ||
        scriptElement?.getAttribute('data-project-id') ||
        envDefaultProjectId ||
        "default";
      // Update projectId in existing instance for lead submission (if changed)
      if (existingInstance.updateProjectId && projectId) {
        existingInstance.updateProjectId(projectId);
      }
      return existingInstance;
    }
    
    // CRITICAL: Prevent concurrent init calls
    if (initInProgress) {
      console.log("HomesfyChat: Init already in progress, skipping duplicate call to prevent reloads");
      // Wait for the existing init to complete
      while (initInProgress) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      // After waiting, check if widget was mounted
      if (mountedWidgets.has(WIDGET_INSTANCE_KEY)) {
        return mountedWidgets.get(WIDGET_INSTANCE_KEY);
      }
    }
    
    // Mark init as in progress
    initInProgress = true;
    
    const scriptElement = options.element || document.currentScript;
    
    // Extract project ID from script element (data-project attribute)
    // This project ID is used for lead submission to CRM
    // Widget design uses shared config (same for all projects)
    const projectId =
      options.projectId ||
      scriptElement?.dataset.project ||
      scriptElement?.dataset.projectId ||
      scriptElement?.getAttribute('data-project') ||
      scriptElement?.getAttribute('data-project-id') ||
      envDefaultProjectId ||
      "default";
    
    // Ensure DOM is ready
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        if (document.readyState !== 'loading') {
          resolve();
        } else {
          document.addEventListener('DOMContentLoaded', resolve, { once: true });
        }
      });
    }
  // Get API base URL - prioritize data attribute, then env, then window global
  // Never use localhost in production - it will cause CORS errors
  let apiBaseUrl = options.apiBaseUrl ||
    scriptElement?.dataset.apiBaseUrl ||
    envApiBaseUrl ||
    window?.HOMESFY_WIDGET_API_BASE_URL;
  
  // CRITICAL: Never use localhost on production HTTPS sites - force production API FIRST
  // This check must happen BEFORE any fallback logic to prevent localhost on HTTPS
  const isHttpsSite = window.location.protocol === 'https:';
  const isLocalhost = apiBaseUrl && (apiBaseUrl.includes('localhost') || apiBaseUrl.includes('127.0.0.1'));
  
  // Production API URL (stable domain)
  const PRODUCTION_API_URL = "https://api-three-pearl.vercel.app";
  
  if (isHttpsSite && isLocalhost) {
    console.error("HomesfyChat: ERROR - localhost API detected on HTTPS site! Forcing production API.");
    apiBaseUrl = PRODUCTION_API_URL;
    console.warn("HomesfyChat: Forced to production API:", apiBaseUrl);
  }
  
  // If no API URL provided, determine based on current site
  if (!apiBaseUrl) {
    const isLocalDev = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('localhost') ||
                       window.location.hostname === '';
    
    if (isLocalDev && window.location.protocol === 'http:') {
      // Only use localhost for actual local development (localhost + HTTP)
      apiBaseUrl = "http://localhost:4000";
      console.log("HomesfyChat: Using localhost API for local development:", apiBaseUrl);
      console.log("HomesfyChat: 💡 Tip: If API server isn't running, add data-api-base-url to use production API");
    } else {
      // For ANY other site (production, staging, etc.), use production API
      apiBaseUrl = PRODUCTION_API_URL;
      console.log("HomesfyChat: Using production API (no API URL specified):", apiBaseUrl);
    }
  }
  
  // Final safety check - NEVER use localhost on non-localhost sites
  const currentHostname = window.location.hostname;
  const isActuallyLocalhost = currentHostname === 'localhost' || 
                               currentHostname === '127.0.0.1' ||
                               currentHostname === '';
  
  if (!isActuallyLocalhost && apiBaseUrl && (apiBaseUrl.includes('localhost') || apiBaseUrl.includes('127.0.0.1'))) {
    console.error("HomesfyChat: CRITICAL ERROR - localhost API detected on non-localhost site! Forcing production API.");
    apiBaseUrl = PRODUCTION_API_URL;
    console.warn("HomesfyChat: Final override to production API:", apiBaseUrl);
  }
  
  // Additional check: If on HTTPS, NEVER use HTTP localhost
  if (window.location.protocol === 'https:' && apiBaseUrl && (apiBaseUrl.includes('localhost') || apiBaseUrl.includes('127.0.0.1'))) {
    console.error("HomesfyChat: CRITICAL ERROR - localhost API detected on HTTPS site! Forcing production API.");
    apiBaseUrl = PRODUCTION_API_URL;
    console.warn("HomesfyChat: HTTPS override to production API:", apiBaseUrl);
  }
  
  console.log("HomesfyChat: Using API Base URL:", apiBaseUrl);
  const microsite =
    options.microsite || scriptElement?.dataset.microsite || window.location.hostname;

  const themeOverrides = options.theme || {};
  
  // Widget design: Shared config (same appearance for all projects, like WhatsApp)
  // Lead submission: Uses actual project ID from script (different projects = different CRM entries)
  const leadProjectId = projectId; // Project ID from script (data-project attribute) - used for lead submission
  
  console.log("HomesfyChat: 🎨 Widget Design: Using shared config (same appearance for all projects)");
  console.log("HomesfyChat: 📝 Lead Submission: Will use project ID from script:", leadProjectId);
  
  // Fetch shared widget config (design/appearance) - same for all projects
  // ALWAYS fetch fresh config on page load to ensure latest settings
  const urlParams = new URLSearchParams(window.location.search);
  const forceRefresh = urlParams.get('widget_cache_bust') === 'true';
  
  console.log("HomesfyChat: 🔄 Fetching latest widget config from server...");
  let remoteTheme = {};
  try {
    // Always fetch fresh config on page load (force refresh on initial load)
    // Cache is only 2 seconds to ensure latest config appears quickly
    remoteTheme = await fetchWidgetTheme(apiBaseUrl, "default", true); // Force refresh on page load
    if (Object.keys(remoteTheme).length > 0) {
      console.log("HomesfyChat: ✅ Latest widget config loaded successfully from server");
      console.log("HomesfyChat: 📋 Config keys:", Object.keys(remoteTheme).join(', '));
      console.log("HomesfyChat: 👤 Agent Name:", remoteTheme.agentName || "NOT SET");
      console.log("HomesfyChat: 🎨 Primary Color:", remoteTheme.primaryColor || "NOT SET");
      console.log("HomesfyChat: 💬 Welcome Message:", remoteTheme.welcomeMessage?.substring(0, 50) || "NOT SET");
    } else {
      console.log("HomesfyChat: ⚠️ Using hardcoded default config (no remote config found)");
      console.log("HomesfyChat: 💡 Make sure API server is running and config file exists");
    }
  } catch (error) {
    console.warn("HomesfyChat: ⚠️ Failed to fetch latest config, using hardcoded defaults:", error);
    console.warn("HomesfyChat: 💡 Widget will still work with default settings");
    remoteTheme = {};
  }
  
  // ALWAYS detect property information from the current page
  // This ensures the widget works on ANY microsite without manual configuration
  // Run detection in parallel with theme fetch for faster loading
  console.log("HomesfyChat: Detecting property info from page...");
  let detectedPropertyInfo = detectPropertyFromPage();
  console.log("HomesfyChat: Property detection result:", detectedPropertyInfo && Object.keys(detectedPropertyInfo).length > 0 ? "Property detected" : "No property detected");
  
  // If property detected, use it locally (don't POST to API - requires API key)
  // The widget will use detected property info directly without updating server config
  // This avoids 401 errors and works perfectly for widget functionality
  if (detectedPropertyInfo && Object.keys(detectedPropertyInfo).length > 0) {
    console.log("HomesfyChat: Detected property from page:", detectedPropertyInfo);
    // Property info will be merged into theme below - no need to POST to API
  }
  
  // Always prioritize detected property info over remote config
  // This allows the same script to work on different microsites
  const theme = { 
    ...remoteTheme, 
    ...themeOverrides,
    // Use detected property info if available, otherwise use remote config
    propertyInfo: detectedPropertyInfo && Object.keys(detectedPropertyInfo).length > 0
      ? detectedPropertyInfo 
      : (remoteTheme?.propertyInfo || {})
  };
  
  // Debug: Log final theme being used
  console.log("HomesfyChat: 🎨 Final theme being used:", {
    agentName: theme.agentName || "NOT SET (will use fallback)",
    primaryColor: theme.primaryColor || "NOT SET (will use fallback)",
    bubblePosition: theme.bubblePosition || "NOT SET (will use fallback)",
    hasWelcomeMessage: !!theme.welcomeMessage
  });

    console.log("HomesfyChat: Mounting widget...");
    try {
      const widgetInstance = await mountWidget({
        apiBaseUrl,
        projectId: leadProjectId, // Pass actual project ID for lead submission
        microsite,
        theme,
        target: options.target,
      });
      console.log("HomesfyChat: ✅ Widget mounted successfully");
      console.log("HomesfyChat: 🎨 Design: Shared config (same for all) | 📝 Leads: Project ID", leadProjectId);
      
      // Debug: Verify widget is in DOM and visible
      setTimeout(() => {
        const hostElement = document.querySelector('[data-homesfy-widget-host="true"]');
        const bubbleButton = hostElement?.shadowRoot?.querySelector('.homesfy-widget__bubble-button');
        if (hostElement) {
          console.log("HomesfyChat: ✅ Widget host element found in DOM");
          console.log("HomesfyChat: 📍 Host position:", {
            position: window.getComputedStyle(hostElement).position,
            zIndex: window.getComputedStyle(hostElement).zIndex,
            display: window.getComputedStyle(hostElement).display,
            visibility: window.getComputedStyle(hostElement).visibility
          });
          if (bubbleButton) {
            console.log("HomesfyChat: ✅ Bubble button found");
            const bubbleStyles = window.getComputedStyle(bubbleButton);
            console.log("HomesfyChat: 📍 Bubble button styles:", {
              display: bubbleStyles.display,
              visibility: bubbleStyles.visibility,
              opacity: bubbleStyles.opacity,
              position: bubbleStyles.position
            });
          } else {
            console.warn("HomesfyChat: ⚠️ Bubble button not found in shadow DOM");
          }
        } else {
          console.error("HomesfyChat: ❌ Widget host element NOT found in DOM!");
        }
      }, 500);
      
      // Mark init as complete
      initInProgress = false;
      return widgetInstance;
    } catch (error) {
      console.error("HomesfyChat: Failed to mount widget:", error);
      // Don't throw - log error but allow page to continue
      console.warn("HomesfyChat: Widget initialization failed, but page will continue to function");
      // Mark init as complete even on error
      initInProgress = false;
      // Return a dummy instance to prevent further errors
      return {
        destroy: () => {}
      };
    }
  } catch (initError) {
    console.error("HomesfyChat: Critical error during initialization:", initError);
    // Mark init as complete even on error
    initInProgress = false;
    // Return a dummy instance to prevent further errors
    return {
      destroy: () => {}
    };
  }
}

// Expose clearThemeCache globally for manual cache clearing
if (typeof window !== "undefined") {
  window.HomesfyChatClearCache = clearThemeCache;
}

const HomesfyChat = { 
  init,
  clearCache: clearThemeCache, // Expose cache clearing method
};

if (typeof window !== "undefined") {
  // CRITICAL: Prevent script from running multiple times
  // Check if script has already been executed
  if (window.__HomesfyChatScriptExecuted) {
    console.log("HomesfyChat: Script already executed, skipping to prevent duplicate initialization");
    // Still expose the API in case it's needed
    if (!window.HomesfyChat) {
      window.HomesfyChat = HomesfyChat;
    }
  } else {
    // Mark script as executed
    window.__HomesfyChatScriptExecuted = true;
    
    window.HomesfyChat = HomesfyChat;
  
  // Debug: Log that widget script has loaded
  console.log("HomesfyChat: Widget script loaded successfully");
  console.log("HomesfyChat: Version info - Auto-init enabled, manual init available via window.HomesfyChat.init()");

  // Auto-init when script loads (unless explicitly disabled)
  // Find script element - handle both sync and async scripts
  const findScriptElement = () => {
    // Try currentScript first (works for sync scripts)
    let scriptElement = document.currentScript;
    
    // If currentScript is null (async script), find the script by src
    if (!scriptElement) {
      // Try multiple strategies to find the script element
      // Strategy 1: Find by exact src match (most reliable)
      const widgetScripts = Array.from(document.querySelectorAll('script[src*="widget.js"]'));
      if (widgetScripts.length > 0) {
        // For async scripts, the one that's loading/loaded is usually the last one
        // But also check if any have data-project attribute to be more specific
        scriptElement = widgetScripts.find(s => s.hasAttribute('data-project') || s.hasAttribute('data-api-base-url')) 
                     || widgetScripts[widgetScripts.length - 1];
      }
      
      // Strategy 2: If still not found, try finding by data attributes
      if (!scriptElement) {
        scriptElement = document.querySelector('script[data-project][src*="widget.js"]') ||
                       document.querySelector('script[data-api-base-url][src*="widget.js"]');
      }
    }
    
    return scriptElement;
  };
  
  // Function to check if we should auto-init
  const shouldAutoInit = () => {
    const scriptElement = findScriptElement();
    const autoInitDisabled = scriptElement?.dataset.autoInit === "false";
    
    // Check for required attributes - try both camelCase and kebab-case
    const hasProject = scriptElement?.dataset.project || 
                      scriptElement?.getAttribute('data-project');
    const hasApiUrl = scriptElement?.dataset.apiBaseUrl || 
                     scriptElement?.getAttribute('data-api-base-url') ||
                     window?.HOMESFY_WIDGET_API_BASE_URL;
    
    const hasRequiredAttrs = hasProject || hasApiUrl;
    
    return {
      shouldInit: !window.HomesfyChatInitialized && !autoInitDisabled && hasRequiredAttrs,
      scriptElement,
      hasProject,
      hasApiUrl
    };
  };
  
  // Auto-initialize widget
  const initializeWidget = () => {
    // CRITICAL: Prevent multiple initializations - check BOTH flags
    if (window.HomesfyChatInitialized) {
      console.log("HomesfyChat: Already initialized (flag set), skipping to prevent reloads");
      return;
    }
    
    // Also check if widget is already mounted - this is the most reliable check
    if (mountedWidgets.has(WIDGET_INSTANCE_KEY)) {
      console.log("HomesfyChat: Widget already mounted, skipping initialization to prevent reloads");
      window.HomesfyChatInitialized = true;
      return;
    }
    
    // Check if widget host element already exists in DOM
    const existingHost = document.querySelector('[data-homesfy-widget-host="true"]');
    if (existingHost) {
      console.log("HomesfyChat: Widget host element already exists in DOM, skipping initialization to prevent reloads");
      window.HomesfyChatInitialized = true;
      return;
    }
    
    const check = shouldAutoInit();
    
    if (!check.shouldInit) {
      const reason = !check.hasProject && !check.hasApiUrl 
        ? "Missing required attributes (data-project or data-api-base-url)"
        : window.HomesfyChatInitialized 
        ? "Already initialized"
        : "Auto-init disabled";
      
      console.warn("HomesfyChat: Auto-init skipped -", reason, {
        initialized: window.HomesfyChatInitialized,
        hasProject: check.hasProject,
        hasApiUrl: check.hasApiUrl,
        scriptElement: !!check.scriptElement,
        scriptSrc: check.scriptElement?.src
      });
      
      // If script element exists but missing attributes, log helpful message
      if (check.scriptElement && !check.hasProject && !check.hasApiUrl) {
        console.error("HomesfyChat: ❌ Script tag found but missing required attributes!");
        console.error("HomesfyChat: Required: data-project or data-api-base-url");
        console.error("HomesfyChat: Current script:", check.scriptElement.outerHTML.substring(0, 200));
      }
      
      return;
    }
    
    try {
      window.HomesfyChatInitialized = true;
      const scriptElement = check.scriptElement;
      
      console.log("HomesfyChat: Auto-initializing widget...");
      console.log("HomesfyChat: Script element found:", !!scriptElement);
      console.log("HomesfyChat: Project ID:", scriptElement?.dataset.project || scriptElement?.getAttribute('data-project'));
      console.log("HomesfyChat: API Base URL:", scriptElement?.dataset.apiBaseUrl || scriptElement?.getAttribute('data-api-base-url'));
      
      // Extract options from script element - prioritize data attributes
      const extractedProjectId = scriptElement?.dataset.project || 
                                  scriptElement?.getAttribute('data-project') ||
                                  scriptElement?.dataset.projectId ||
                                  scriptElement?.getAttribute('data-project-id');
      const extractedApiUrl = scriptElement?.dataset.apiBaseUrl || 
                               scriptElement?.getAttribute('data-api-base-url') ||
                               window?.HOMESFY_WIDGET_API_BASE_URL;
      const extractedMicrosite = scriptElement?.dataset.microsite || 
                                  scriptElement?.getAttribute('data-microsite') ||
                                  window.location.hostname;
      
      const options = {
        element: scriptElement,
        projectId: extractedProjectId,
        apiBaseUrl: extractedApiUrl,
        microsite: extractedMicrosite
      };
      
      console.log("HomesfyChat: 📋 Detected from script:", { 
        projectId: options.projectId || "Not found (will use default)", 
        apiBaseUrl: options.apiBaseUrl || "Not found (will use default)",
        microsite: options.microsite 
      });
      
      // CRITICAL: Final check before calling init
      if (mountedWidgets.has(WIDGET_INSTANCE_KEY) || 
          document.querySelector('[data-homesfy-widget-host="true"]')) {
        console.log("HomesfyChat: Widget already exists, skipping init call to prevent reloads");
        window.HomesfyChatInitialized = true;
        return;
      }
      
      console.log("HomesfyChat: Initializing widget...");
      init(options).then((instance) => {
        if (instance && typeof instance.destroy === 'function') {
          console.log("HomesfyChat: ✅ Widget initialized successfully!");
          window.HomesfyChatInitialized = true;
        } else {
          console.warn("HomesfyChat: ⚠️ Widget initialized but instance is invalid");
          console.warn("HomesfyChat: 💡 Try manually: window.HomesfyChat.init({ projectId: '5717', apiBaseUrl: 'https://api-three-pearl.vercel.app', microsite: 'www.navi-mumbai-properties.com' })");
          window.HomesfyChatInitialized = true; // Still mark as initialized to prevent retry loops
        }
      }).catch((error) => {
        console.error("HomesfyChat: ❌ Initialization error:", error);
        console.error("HomesfyChat: Error stack:", error.stack);
        console.error("HomesfyChat: 💡 Try manually: window.HomesfyChat.init({ projectId: '5717', apiBaseUrl: 'https://api-three-pearl.vercel.app', microsite: 'www.navi-mumbai-properties.com' })");
        // Mark as initialized to prevent infinite retry loops
        window.HomesfyChatInitialized = true;
      });
    } catch (error) {
      console.error("HomesfyChat: Failed to auto-initialize", error);
      // Keep initialized flag true to prevent retry loops
      window.HomesfyChatInitialized = true;
    }
  };
  
  // Try to initialize - with retry logic for async scripts
  const tryInitialize = () => {
    // Check if already initialized
    if (window.HomesfyChatInitialized) {
      return;
    }
    
    const attemptInit = () => {
      // Check if script element exists now
      const scriptElement = findScriptElement();
      if (!scriptElement && document.readyState !== 'complete') {
        // Script might not be in DOM yet, wait a bit more
        return false;
      }
      
      initializeWidget();
      return true;
    };
    
    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        // Try immediately, then retry after a short delay if needed
        if (!attemptInit()) {
          setTimeout(() => attemptInit(), 200);
        }
      }, { once: true });
    } else if (document.readyState === "interactive") {
      // DOM is loading but not complete - wait a bit
      setTimeout(() => attemptInit(), 100);
    } else {
      // DOM is complete - try immediately
      if (!attemptInit()) {
        // If script element not found, retry once more after a delay
        setTimeout(() => attemptInit(), 300);
      }
    }
  };
  
  // CRITICAL: Only initialize if not already initialized
  // Check multiple conditions to prevent duplicate initialization
  if (!window.HomesfyChatInitialized && 
      !mountedWidgets.has(WIDGET_INSTANCE_KEY) &&
      !document.querySelector('[data-homesfy-widget-host="true"]')) {
    // Start initialization
    tryInitialize();
    
    // Also try on window load as a fallback (for async scripts that load late)
    // But only if still not initialized
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        if (!window.HomesfyChatInitialized && 
            !mountedWidgets.has(WIDGET_INSTANCE_KEY) &&
            !document.querySelector('[data-homesfy-widget-host="true"]')) {
          console.log("HomesfyChat: Window loaded, retrying initialization...");
          setTimeout(() => {
            if (!window.HomesfyChatInitialized && 
                !mountedWidgets.has(WIDGET_INSTANCE_KEY) &&
                !document.querySelector('[data-homesfy-widget-host="true"]')) {
              initializeWidget();
            } else {
              console.log("HomesfyChat: Widget already initialized on window load, skipping");
            }
          }, 100);
        } else {
          console.log("HomesfyChat: Widget already initialized, skipping window load handler");
        }
      }, { once: true });
    }
  } else {
    console.log("HomesfyChat: Widget already initialized or mounted, skipping auto-init");
  }
  }
}

export default HomesfyChat;




