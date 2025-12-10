import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";

const DEFAULT_PRIMARY_COLOR = "#6158ff";
const DEFAULT_PRIMARY_RGB = "97, 88, 255";
const DEFAULT_AVATAR_URL =
  "https://v2assets.zopim.io/2F4uasrDz8AwB7cxrCz3igHZtZovK0w4-concierge?1759235162633";

function extractRgbChannels(color) {
  if (typeof color !== "string") {
    return null;
  }

  const trimmed = color.trim();

  if (trimmed.startsWith("#")) {
    let hex = trimmed.slice(1);
    if ([3, 4].includes(hex.length)) {
      hex = hex
        .split("")
        .map((char) => char + char)
        .join("")
        .slice(0, 6);
    }

    if ((hex.length === 6 || hex.length === 8) && /^[0-9a-f]{6,8}$/i.test(hex)) {
      const base = hex.slice(0, 6);
      const r = parseInt(base.slice(0, 2), 16);
      const g = parseInt(base.slice(2, 4), 16);
      const b = parseInt(base.slice(4, 6), 16);
      return `${r}, ${g}, ${b}`;
    }

    return null;
  }

  const rgbMatch = trimmed.match(
    /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i
  );

  if (rgbMatch) {
    const [, r, g, b] = rgbMatch.map(Number);
    if ([r, g, b].every((channel) => channel >= 0 && channel <= 255)) {
      return `${r}, ${g}, ${b}`;
    }
  }

  return null;
}

// Format timestamp like WhatsApp
function formatMessageTime(timestamp) {
  if (!timestamp) return "";
  
  const now = new Date();
  const msgDate = new Date(timestamp);
  const diffMs = now - msgDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  // Format time (e.g., "10:30 AM")
  const timeStr = msgDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  
  // If less than 1 minute ago, show "Just now"
  if (diffMins < 1) {
    return "Just now";
  }
  
  // If same day, show just time
  const isToday = now.toDateString() === msgDate.toDateString();
  if (isToday) {
    return timeStr;
  }
  
  // If yesterday, show "Yesterday 10:30 AM"
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = yesterday.toDateString() === msgDate.toDateString();
  if (isYesterday) {
    return `Yesterday ${timeStr}`;
  }
  
  // If within last 7 days, show day name
  if (diffDays < 7) {
    const dayName = msgDate.toLocaleDateString("en-US", { weekday: "short" });
    return `${dayName} ${timeStr}`;
  }
  
  // Otherwise show date
  const dateStr = msgDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${dateStr} ${timeStr}`;
}

function resolveAvatarUrl(raw) {
  if (raw === undefined) {
    return DEFAULT_AVATAR_URL;
  }

  if (raw === null) {
    return "";
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed;
  }

  return DEFAULT_AVATAR_URL;
}

const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
];
const CTA_OPTIONS = [
  "Pricing & Floor Plans 💸💸",
  "Download Brochure ⬇️",
  "Get The Best Quote 💰",
  "Site Visit Or Virtual Tour 🚁",
  "Pricing on Whatsapp ✅",
  "Get A Call Back 📞",
];

const BHK_OPTIONS = [
  "1 Bhk",
  "2 Bhk",
  "3 Bhk",
  "4 Bhk",
  "Other",
  "Yet to decide",
];

const COUNTRY_PHONE_CODES = [
  { code: "+91", name: "India", countryCode: "IN", selected: true },
  { code: "+1", name: "USA", countryCode: "US" },
  { code: "+44", name: "UK", countryCode: "GB" },
  { code: "+971", name: "UAE", countryCode: "AE" },
  { code: "+61", name: "Australia", countryCode: "AU" },
  { code: "+1", name: "Canada", countryCode: "CA" },
  { code: "+65", name: "Singapore", countryCode: "SG" },
  { code: "+86", name: "China", countryCode: "CN" },
  { code: "+81", name: "Japan", countryCode: "JP" },
  { code: "+49", name: "Germany", countryCode: "DE" },
  { code: "+33", name: "France", countryCode: "FR" },
  { code: "+39", name: "Italy", countryCode: "IT" },
  { code: "+34", name: "Spain", countryCode: "ES" },
  { code: "+92", name: "Pakistan", countryCode: "PK" },
  { code: "+880", name: "Bangladesh", countryCode: "BD" },
  { code: "+94", name: "Sri Lanka", countryCode: "LK" },
  { code: "+977", name: "Nepal", countryCode: "NP" },
  { code: "+60", name: "Malaysia", countryCode: "MY" },
  { code: "+66", name: "Thailand", countryCode: "TH" },
  { code: "+62", name: "Indonesia", countryCode: "ID" },
  { code: "+63", name: "Philippines", countryCode: "PH" },
  { code: "+84", name: "Vietnam", countryCode: "VN" },
  { code: "+852", name: "Hong Kong", countryCode: "HK" },
  { code: "+966", name: "Saudi Arabia", countryCode: "SA" },
  { code: "+973", name: "Bahrain", countryCode: "BH" },
  { code: "+965", name: "Kuwait", countryCode: "KW" },
  { code: "+974", name: "Qatar", countryCode: "QA" },
  { code: "+968", name: "Oman", countryCode: "OM" },
  { code: "+20", name: "Egypt", countryCode: "EG" },
  { code: "+27", name: "South Africa", countryCode: "ZA" },
  { code: "+234", name: "Nigeria", countryCode: "NG" },
  { code: "+254", name: "Kenya", countryCode: "KE" },
  { code: "+55", name: "Brazil", countryCode: "BR" },
  { code: "+52", name: "Mexico", countryCode: "MX" },
  { code: "+54", name: "Argentina", countryCode: "AR" },
  { code: "+7", name: "Russia", countryCode: "RU" },
  { code: "+380", name: "Ukraine", countryCode: "UA" },
  { code: "+48", name: "Poland", countryCode: "PL" },
  { code: "+90", name: "Turkey", countryCode: "TR" },
  { code: "+213", name: "Algeria", countryCode: "DZ" },
  { code: "+376", name: "Andorra", countryCode: "AD" },
  { code: "+244", name: "Angola", countryCode: "AO" },
  { code: "+1264", name: "Anguilla", countryCode: "AI" },
  { code: "+1268", name: "Antigua & Barbuda", countryCode: "AG" },
  { code: "+374", name: "Armenia", countryCode: "AM" },
  { code: "+297", name: "Aruba", countryCode: "AW" },
  { code: "+43", name: "Austria", countryCode: "AT" },
  { code: "+994", name: "Azerbaijan", countryCode: "AZ" },
  { code: "+1242", name: "Bahamas", countryCode: "BS" },
  { code: "+1246", name: "Barbados", countryCode: "BB" },
  { code: "+375", name: "Belarus", countryCode: "BY" },
  { code: "+32", name: "Belgium", countryCode: "BE" },
  { code: "+501", name: "Belize", countryCode: "BZ" },
  { code: "+229", name: "Benin", countryCode: "BJ" },
  { code: "+1441", name: "Bermuda", countryCode: "BM" },
  { code: "+975", name: "Bhutan", countryCode: "BT" },
  { code: "+591", name: "Bolivia", countryCode: "BO" },
  { code: "+387", name: "Bosnia Herzegovina", countryCode: "BA" },
  { code: "+267", name: "Botswana", countryCode: "BW" },
  { code: "+673", name: "Brunei", countryCode: "BN" },
  { code: "+359", name: "Bulgaria", countryCode: "BG" },
  { code: "+226", name: "Burkina Faso", countryCode: "BF" },
  { code: "+257", name: "Burundi", countryCode: "BI" },
  { code: "+855", name: "Cambodia", countryCode: "KH" },
  { code: "+237", name: "Cameroon", countryCode: "CM" },
  { code: "+238", name: "Cape Verde Islands", countryCode: "CV" },
  { code: "+1345", name: "Cayman Islands", countryCode: "KY" },
  { code: "+236", name: "Central African Republic", countryCode: "CF" },
  { code: "+56", name: "Chile", countryCode: "CL" },
  { code: "+57", name: "Colombia", countryCode: "CO" },
  { code: "+269", name: "Comoros", countryCode: "KM" },
  { code: "+242", name: "Congo", countryCode: "CG" },
  { code: "+682", name: "Cook Islands", countryCode: "CK" },
  { code: "+506", name: "Costa Rica", countryCode: "CR" },
  { code: "+385", name: "Croatia", countryCode: "HR" },
  { code: "+357", name: "Cyprus", countryCode: "CY" },
  { code: "+420", name: "Czech Republic", countryCode: "CZ" },
  { code: "+45", name: "Denmark", countryCode: "DK" },
  { code: "+253", name: "Djibouti", countryCode: "DJ" },
  { code: "+372", name: "Estonia", countryCode: "EE" },
  { code: "+251", name: "Ethiopia", countryCode: "ET" },
  { code: "+358", name: "Finland", countryCode: "FI" },
  { code: "+995", name: "Georgia", countryCode: "GE" },
  { code: "+233", name: "Ghana", countryCode: "GH" },
  { code: "+30", name: "Greece", countryCode: "GR" },
  { code: "+852", name: "Hong Kong", countryCode: "HK" },
  { code: "+36", name: "Hungary", countryCode: "HU" },
  { code: "+354", name: "Iceland", countryCode: "IS" },
  { code: "+353", name: "Ireland", countryCode: "IE" },
  { code: "+972", name: "Israel", countryCode: "IL" },
  { code: "+1876", name: "Jamaica", countryCode: "JM" },
  { code: "+962", name: "Jordan", countryCode: "JO" },
  { code: "+7", name: "Kazakhstan", countryCode: "KZ" },
  { code: "+82", name: "Korea South", countryCode: "KR" },
  { code: "+961", name: "Lebanon", countryCode: "LB" },
  { code: "+370", name: "Lithuania", countryCode: "LT" },
  { code: "+60", name: "Malaysia", countryCode: "MY" },
  { code: "+960", name: "Maldives", countryCode: "MV" },
  { code: "+356", name: "Malta", countryCode: "MT" },
  { code: "+230", name: "Mauritius", countryCode: "MU" },
  { code: "+377", name: "Monaco", countryCode: "MC" },
  { code: "+212", name: "Morocco", countryCode: "MA" },
  { code: "+31", name: "Netherlands", countryCode: "NL" },
  { code: "+64", name: "New Zealand", countryCode: "NZ" },
  { code: "+47", name: "Norway", countryCode: "NO" },
  { code: "+351", name: "Portugal", countryCode: "PT" },
  { code: "+40", name: "Romania", countryCode: "RO" },
  { code: "+221", name: "Senegal", countryCode: "SN" },
  { code: "+381", name: "Serbia", countryCode: "RS" },
  { code: "+421", name: "Slovakia", countryCode: "SK" },
  { code: "+386", name: "Slovenia", countryCode: "SI" },
  { code: "+211", name: "South Sudan", countryCode: "SS" },
  { code: "+46", name: "Sweden", countryCode: "SE" },
  { code: "+41", name: "Switzerland", countryCode: "CH" },
  { code: "+886", name: "Taiwan", countryCode: "TW" },
  { code: "+255", name: "Tanzania", countryCode: "TZ" },
  { code: "+216", name: "Tunisia", countryCode: "TN" },
  { code: "+256", name: "Uganda", countryCode: "UG" },
  { code: "+598", name: "Uruguay", countryCode: "UY" },
  { code: "+998", name: "Uzbekistan", countryCode: "UZ" },
  { code: "+58", name: "Venezuela", countryCode: "VE" },
  { code: "+260", name: "Zambia", countryCode: "ZM" },
  { code: "+263", name: "Zimbabwe", countryCode: "ZW" },
];

const DEFAULT_COUNTRY =
  COUNTRY_PHONE_CODES.find((entry) => entry.selected) ||
  COUNTRY_PHONE_CODES.find((entry) => entry.code === "+91") ||
  COUNTRY_PHONE_CODES[0];

function countryOptionKey(entry) {
  return `${entry.code}|${entry.countryCode}`;
}

function findCountryByKey(value) {
  return COUNTRY_PHONE_CODES.find(
    (entry) => countryOptionKey(entry) === value
  );
}

const SORTED_COUNTRY_PHONE_CODES = COUNTRY_PHONE_CODES.slice().sort(
  (a, b) => b.code.length - a.code.length
);

function pickCountryByDialCode(value) {
  return SORTED_COUNTRY_PHONE_CODES.find((entry) =>
    value.startsWith(entry.code)
  );
}

function normalizePhoneInput(raw) {
  if (typeof raw !== "string") {
    return { error: "Please enter a valid phone number." };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return { error: "Please enter a phone number." };
  }

  const stripped = trimmed.replace(/[\s().-]/g, "");
  if (!/^\+?\d+$/.test(stripped)) {
    return { error: "Phone numbers should contain digits and an optional +." };
  }

  const digitsOnly = stripped.replace(/\D/g, "");
  const withPlus = stripped.startsWith("+") ? stripped : `+${stripped}`;
  const explicitCountry = pickCountryByDialCode(withPlus);

  let country = explicitCountry;
  let subscriberDigits =
    explicitCountry?.code !== undefined
      ? withPlus.slice(explicitCountry.code.length)
      : digitsOnly;

  if (!explicitCountry && !stripped.startsWith("+")) {
    const looksLikeIndianWithIsd =
      digitsOnly.length === 12 && digitsOnly.startsWith("91");
    const digitsWithoutIsd = looksLikeIndianWithIsd
      ? digitsOnly.slice(2)
      : digitsOnly;
    country = COUNTRY_PHONE_CODES.find((entry) => entry.code === "+91");
    subscriberDigits = digitsWithoutIsd;
  }

  if (!subscriberDigits || !/^\d+$/.test(subscriberDigits)) {
    return { error: "Please enter a valid phone number." };
  }

  if (!country) {
    return { error: "Unsupported or missing country dial code." };
  }

  if (country.code === "+91") {
    if (subscriberDigits.length !== 10) {
      return {
        error: "Indian mobile numbers must be 10 digits long.",
      };
    }
    if (!/^[6-9]/.test(subscriberDigits)) {
      return {
        error: "Indian mobile numbers must start with 6, 7, 8, or 9.",
      };
    }
  } else if (subscriberDigits.length < 4 || subscriberDigits.length > 14) {
    return {
      error: "Please enter a valid mobile number for the selected country.",
    };
  }

  return {
    value: `${country.code}${subscriberDigits}`,
    country,
    subscriber: subscriberDigits,
  };
}

function formatPhoneDisplay(result) {
  if (!result || typeof result !== "object") {
    return "";
  }

  const dialCode =
    typeof result.country?.code === "string"
      ? result.country.code.trim()
      : "";
  const subscriber =
    typeof result.subscriber === "string"
      ? result.subscriber.replace(/\s+/g, "")
      : "";

  if (!dialCode) {
    return subscriber || (typeof result.value === "string" ? result.value : "");
  }

  if (!subscriber) {
    return dialCode;
  }

  return `${dialCode} ${subscriber}`;
}

const generateId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function ChatWidget({
  apiBaseUrl,
  projectId,
  microsite,
  theme = {},
  onEvent,
  preservedState = null, // Optional preserved state from global store
}) {
  // Extract propertyInfo from theme
  const propertyInfo = theme.propertyInfo || {};
  // Use ref to preserve isOpen state across re-renders (prevents reset when theme updates)
  const isOpenRef = useRef(preservedState?.isOpen || false);
  // Initialize state from preserved state or ref (preserves state across re-renders)
  const [isOpen, setIsOpenState] = useState(() => preservedState?.isOpen || isOpenRef.current || false);
  
  // Protected setIsOpen that prevents accidental closes
  const setIsOpen = useCallback((value, force = false) => {
    // CRITICAL: When opening (value === true), always update regardless of current state
    // This ensures the widget opens even if there's a state sync issue
    if (value === true) {
      // Mark as intentionally open when opening
      isIntentionallyOpenRef.current = true;
      lastOpenTimeRef.current = Date.now();
      isOpenRef.current = true;
      setIsOpenState(true); // Always set state when opening
      console.log("HomesfyChat: Widget opened - Mount ID:", componentMountIdRef.current);
      return;
    }
    
    // For closing (value === false)
    // Check if we should block the close
    if (!force && isIntentionallyOpenRef.current) {
      const timeSinceOpen = Date.now() - lastOpenTimeRef.current;
      // Only allow close if it's been open for more than 2 seconds (gives time for state to stabilize)
      if (timeSinceOpen < 2000) {
        console.warn("HomesfyChat: ⚠️ BLOCKED close attempt - widget was intentionally open. Mount ID:", componentMountIdRef.current, "Time since open:", timeSinceOpen, "ms");
        return; // Block the close
      }
    }
    
    // Close is allowed - update state
    isIntentionallyOpenRef.current = false;
    isOpenRef.current = false;
    setIsOpenState(false);
    console.log("HomesfyChat: Widget closed - Mount ID:", componentMountIdRef.current);
  }, []); // Empty deps - use refs for current values, not state (refs are stable)
  
  // Sync ref with state (but don't override if ref says it should be open)
  // CRITICAL: This effect should NOT call setIsOpen to avoid loops
  // REMOVED: This effect was causing infinite loops - refs are updated directly in setIsOpen
  // The ref is already kept in sync in setIsOpen, so this effect is redundant
  const [messages, setMessages] = useState(preservedState?.messages || []);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedCta, setSelectedCta] = useState(preservedState?.selectedCta || null);
  const [selectedBhk, setSelectedBhk] = useState(preservedState?.selectedBhk || null);
  const [phoneSubmitted, setPhoneSubmitted] = useState(preservedState?.phoneSubmitted || false);
  const [nameSubmitted, setNameSubmitted] = useState(preservedState?.nameSubmitted || false);
  const [userName, setUserName] = useState(preservedState?.userName || "");
  const [error, setError] = useState(null);
  const [visitorContext, setVisitorContext] = useState({});
  const [showModal, setShowModal] = useState(false); // Modal state - shows after 8 seconds
  const messagesEndRef = useRef(null);
  const hasShownRef = useRef(preservedState?.hasShown || false);
  const autoOpenTimeoutRef = useRef(null);
  const autoOpenInitializedRef = useRef(false); // Track if auto-open has been set up (always start fresh)
  const isIntentionallyOpenRef = useRef(preservedState?.isIntentionallyOpen || false); // Track if widget was intentionally opened (prevents auto-close)
  const componentMountIdRef = useRef(preservedState?.componentMountId || `widget-${Date.now()}-${Math.random()}`); // Unique ID to track remounts
  const lastOpenTimeRef = useRef(preservedState?.lastOpenTime || 0); // Track when widget was last opened (to prevent immediate closes)
  
  // Update global state store when component mounts (if preserved state exists, use it)
  useEffect(() => {
    if (preservedState) {
      // Restore state from preserved state
      if (preservedState.componentMountId) {
        componentMountIdRef.current = preservedState.componentMountId;
      }
      if (preservedState.isIntentionallyOpen !== undefined) {
        isIntentionallyOpenRef.current = preservedState.isIntentionallyOpen;
      }
      if (preservedState.lastOpenTime) {
        lastOpenTimeRef.current = preservedState.lastOpenTime;
      }
      // NOTE: Don't restore hasShown or autoOpenInitialized - allow modal to show on new page loads
      // Only restore if widget was actually open
      if (preservedState.hasShown && preservedState.isOpen) {
        hasShownRef.current = true;
      }
      console.log("HomesfyChat: Restored state from preserved state store");
    }
  }, []); // Only run once on mount
  const [manualInput, setManualInput] = useState("");
  const [nameInput, setNameInput] = useState(""); // Separate state for name
  const [phoneInput, setPhoneInput] = useState(""); // Separate state for phone
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  // Simple flow state: CTA → BHK → Name + Phone (together)
  const [currentStage, setCurrentStage] = useState(preservedState?.currentStage || "cta"); // "cta" | "bhk" | "name" | "complete"

  const resolvedTheme = useMemo(
    () => ({
      agentName: theme.agentName || "Riya Agarwal",
      avatarUrl: resolveAvatarUrl(theme.avatarUrl),
      primaryColor: theme.primaryColor || DEFAULT_PRIMARY_COLOR,
      bubblePosition: theme.bubblePosition || "bottom-right",
      welcomeMessage:
        theme.welcomeMessage ||
        "Hey, I'm Riya Agarwal! How can I help you understand this project?",
      namePrompt:
        theme.namePrompt || "Please enter your name",
      ctaAcknowledgement:
        theme.followupMessage ||
        theme.ctaAcknowledgement ||
        "Sure… I'll send that across right away!",
      bhkPrompt:
        theme.bhkPrompt || "Which configuration you are looking for?",
      inventoryMessage:
        theme.inventoryMessage ||
        "That's cool… we have inventory available with us.",
      phonePrompt:
        theme.phonePrompt || "Please enter your mobile number...",
      thankYouMessage:
        theme.thankYouMessage ||
        "Thanks! Our expert will call you shortly 📞",
      autoOpenDelayMs: Number(theme.autoOpenDelayMs || 4000),
      bubbleTitle: theme.bubbleTitle || "Chat with us",
      bubbleSubtitle: theme.bubbleSubtitle || "Expert help in minutes",
      heroPoints:
        Array.isArray(theme.heroPoints) && theme.heroPoints.length > 0
          ? theme.heroPoints
          : [
              "Instant project availability",
              "Exclusive launch offers",
              "Dedicated closing support",
            ],
      trustBadges:
        Array.isArray(theme.trustBadges) && theme.trustBadges.length > 0
          ? theme.trustBadges
          : [
              "2000+ happy buyers assisted",
              "Verified listings • RERA compliant",
            ],
    }),
    [theme]
  );

  // Store latest theme in ref for use in effects (initialized after resolvedTheme is defined)
  const resolvedThemeRef = useRef(resolvedTheme);
  
  // Keep ref updated with latest theme
  useEffect(() => {
    resolvedThemeRef.current = resolvedTheme;
  }, [resolvedTheme]);

  // Store state refs for persistence
  const stateRefs = useRef({
    messages,
    selectedCta,
    selectedBhk,
    currentStage,
    userName,
    nameSubmitted,
    phoneSubmitted,
  });
  
  // Update refs when state changes
  useEffect(() => {
    stateRefs.current = {
      messages,
      selectedCta,
      selectedBhk,
      currentStage,
      userName,
      nameSubmitted,
      phoneSubmitted,
    };
  }, [messages, selectedCta, selectedBhk, currentStage, userName, nameSubmitted, phoneSubmitted]);

  // Sync state to global store for preservation across re-renders
  useEffect(() => {
    if (preservedState) {
      // Update global state store with current state
      preservedState.isOpen = isOpen;
      preservedState.isIntentionallyOpen = isIntentionallyOpenRef.current;
      preservedState.lastOpenTime = lastOpenTimeRef.current;
      preservedState.hasShown = hasShownRef.current;
      preservedState.messages = messages;
      preservedState.selectedCta = selectedCta;
      preservedState.selectedBhk = selectedBhk;
      preservedState.currentStage = currentStage;
      preservedState.userName = userName;
      preservedState.nameSubmitted = nameSubmitted;
      preservedState.phoneSubmitted = phoneSubmitted;
      preservedState.componentMountId = componentMountIdRef.current;
    }
  }, [isOpen, messages, selectedCta, selectedBhk, currentStage, userName, nameSubmitted, phoneSubmitted, preservedState]);
  
  // Detect component mount/remount - simplified to prevent conflicts
  const hasMountedRef = useRef(false);
  useEffect(() => {
    // CRITICAL: Prevent this effect from running multiple times
    if (hasMountedRef.current) {
      console.log("HomesfyChat: Component mount effect already ran, skipping to prevent duplicate initialization");
      return;
    }
    hasMountedRef.current = true;
    
    const mountId = componentMountIdRef.current;
    // projectId is used for lead submission to CRM (widget design uses shared config)
    console.log("HomesfyChat: Component mounted - Mount ID:", mountId, "Project ID (for lead submission):", projectId, "isOpen:", isOpen, "isOpenRef:", isOpenRef.current);
    
    // CRITICAL: Restore isOpen state from ref if it was open before re-render
    // This prevents the widget from closing when theme updates cause re-renders
    // But only restore if it was intentionally open (not just a ref value)
    if (isOpenRef.current && !isOpen && isIntentionallyOpenRef.current) {
      const timeSinceOpen = Date.now() - lastOpenTimeRef.current;
      // Only restore if it was recently opened (within last 5 seconds) to prevent stale restores
      if (timeSinceOpen < 5000) {
        console.log("HomesfyChat: Restoring isOpen state from ref - widget was open before re-render, time since open:", timeSinceOpen, "ms");
        setIsOpen(true); // Use protected setter
      }
    }
    
    return () => {
      console.log("HomesfyChat: Component unmounting - Mount ID:", mountId, "isOpen:", isOpen, "isOpenRef:", isOpenRef.current);
      // Preserve refs on unmount - don't clear them
      hasMountedRef.current = false; // Reset on unmount so it can run again if truly remounted
    };
  }, []); // Only run on mount/unmount

  const ctaOptions = CTA_OPTIONS;

  const bhkOptions = BHK_OPTIONS;

  const [avatarUrl, setAvatarUrl] = useState(
    resolvedTheme.avatarUrl || DEFAULT_AVATAR_URL
  );

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 960);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Staggered CTA button visibility for mobile
  const [visibleCtaCount, setVisibleCtaCount] = useState(0);
  useEffect(() => {
    if (isOpen && !selectedCta && isMobile) {
      // Reset when chat opens
      setVisibleCtaCount(0);
      // Show first CTA after 300ms (agent message appears first)
      const timer1 = setTimeout(() => setVisibleCtaCount(1), 300);
      // Then show remaining CTAs one by one with 150ms delay between each
      const timers = [];
      for (let i = 2; i <= ctaOptions.length; i++) {
        timers.push(setTimeout(() => setVisibleCtaCount(i), 300 + (i - 1) * 150));
      }
      return () => {
        clearTimeout(timer1);
        timers.forEach(t => clearTimeout(t));
      };
    } else if (!isMobile || selectedCta) {
      // On desktop or after CTA selected, show all immediately
      setVisibleCtaCount(ctaOptions.length);
    }
  }, [isOpen, selectedCta, isMobile, ctaOptions.length]);

  useEffect(() => {
    const nextUrl = resolvedTheme.avatarUrl || DEFAULT_AVATAR_URL;
    setAvatarUrl(nextUrl);
  }, [resolvedTheme.avatarUrl]);

  const handleAvatarError = useCallback((event) => {
    if (event?.currentTarget?.dataset?.fallbackApplied === "true") {
      return;
    }
    if (event?.currentTarget) {
      event.currentTarget.dataset.fallbackApplied = "true";
    }
    setAvatarUrl(DEFAULT_AVATAR_URL);
  }, []);

  const primaryRgb = useMemo(
    () =>
      extractRgbChannels(resolvedTheme.primaryColor) ?? DEFAULT_PRIMARY_RGB,
    [resolvedTheme.primaryColor]
  );

  function trackEvent(type, payload) {
    onEvent?.(type, { projectId, microsite, ...payload });

    if (!apiBaseUrl) {
      return;
    }

    fetch(`${apiBaseUrl}/api/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        projectId,
        microsite,
        payload,
      }),
      credentials: 'omit', // CRITICAL: Must be 'omit' when using wildcard CORS
      keepalive: true, // Use keepalive for better reliability
    }).catch((error) => {
      console.error("Failed to record widget event", error);
    });
  }

  function pushSystemMessage(text) {
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        type: "system",
        text,
        timestamp: Date.now(),
      },
    ]);
  }

  function pushUserMessage(text) {
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        type: "user",
        text,
        timestamp: Date.now(),
      },
    ]);
  }


  const openChatOnce = useCallback(() => {
    if (autoOpenTimeoutRef.current) {
      clearTimeout(autoOpenTimeoutRef.current);
      autoOpenTimeoutRef.current = null;
    }

    console.log("HomesfyChat: Opening widget - Mount ID:", componentMountIdRef.current);
    // CRITICAL: Set flags BEFORE opening to prevent immediate close
    isIntentionallyOpenRef.current = true;
    lastOpenTimeRef.current = Date.now();
    isOpenRef.current = true;
    setIsOpen(true); // Use protected setter

    if (!hasShownRef.current) {
      hasShownRef.current = true;
      pushSystemMessage(resolvedTheme.welcomeMessage);
      trackEvent("chat_shown");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme.welcomeMessage, setIsOpen]); // trackEvent is stable and doesn't need to be in deps

  // Auto-open effect - runs only once on mount
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    // CRITICAL: Only run once - if already initialized, don't run again
    if (autoOpenInitializedRef.current) {
      console.log("HomesfyChat: Auto-open already initialized, skipping to prevent duplicate timers");
      return undefined;
    }
    
    // CRITICAL: Also check if there's already a timeout set (prevent duplicate timers)
    if (autoOpenTimeoutRef.current) {
      console.log("HomesfyChat: Auto-open timeout already exists, clearing it to prevent duplicates");
      clearTimeout(autoOpenTimeoutRef.current);
      autoOpenTimeoutRef.current = null;
    }

    // Mark as initialized immediately to prevent re-runs
    autoOpenInitializedRef.current = true;

    // Prevent multiple auto-open attempts - if already shown, don't set up timeout
    // NOTE: We still want to show the modal even if hasShownRef is true (for new page loads)
    // Only skip if widget is currently open
    if (isOpenRef.current) {
      console.log("HomesfyChat: Skipping auto-open setup - widget already open");
      return undefined;
    }
    
    // CRITICAL: Clear any existing timeout before setting a new one
    if (autoOpenTimeoutRef.current) {
      console.log("HomesfyChat: Clearing existing auto-open timeout to prevent duplicates");
      clearTimeout(autoOpenTimeoutRef.current);
      autoOpenTimeoutRef.current = null;
    }

    // Show modal after 8 seconds (instead of auto-opening chat)
    const delay = 8000; // Always 8 seconds for modal
    
    console.log("HomesfyChat: Setting up modal display timeout - Mount ID:", componentMountIdRef.current, "Delay:", delay);
    autoOpenTimeoutRef.current = window.setTimeout(() => {
      // Double-check before showing modal (in case user already opened chat)
      // Show modal if chat is not open (regardless of hasShownRef - modal can show on new page loads)
      if (!isOpenRef.current && !isIntentionallyOpenRef.current) {
        console.log("HomesfyChat: Showing modal - Mount ID:", componentMountIdRef.current);
        setShowModal(true);
        trackEvent("modal_shown");
      } else {
        console.log("HomesfyChat: Skipping modal - chat already open - Mount ID:", componentMountIdRef.current);
      }
      autoOpenTimeoutRef.current = null;
    }, delay);

    return () => {
      if (autoOpenTimeoutRef.current) {
        clearTimeout(autoOpenTimeoutRef.current);
        autoOpenTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount, use refs for latest values

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const currentUrl = new URL(window.location.href);
    const utm = UTM_PARAMS.reduce((acc, key) => {
      const value = currentUrl.searchParams.get(key);
      if (value) {
        acc[key.replace("utm_", "")] = value;
      }
      return acc;
    }, {});

    setVisitorContext((prev) => ({
      ...prev,
      utm: Object.keys(utm).length ? utm : prev?.utm,
      landingPage: `${currentUrl.pathname}${currentUrl.search}`,
      referrer: document.referrer || prev?.referrer,
      userAgent:
        typeof navigator !== "undefined"
          ? navigator.userAgent
          : prev?.userAgent,
      firstSeenAt: prev?.firstSeenAt || new Date().toISOString(),
    }));

    let cancelled = false;

    fetch("https://ipapi.co/json/")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) {
          return;
        }

        setVisitorContext((prev) => ({
          ...prev,
          location: {
            city: data.city,
            region: data.region,
            country: data.country_name,
            countryCode: data.country,
            latitude: data.latitude,
            longitude: data.longitude,
            timezone: data.timezone,
          },
          ip: data.ip,
        }));

        if (data.country_calling_code) {
          const normalizedCode = data.country_calling_code.trim();
          const matchedCountry = COUNTRY_PHONE_CODES.find(
            (entry) => entry.code === normalizedCode
          );

          if (matchedCountry) {
            setSelectedCountry((prev) =>
              prev === DEFAULT_COUNTRY ? matchedCountry : prev
            );
          }
        }
      })
      .catch(() => {
        /* silently ignore */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleToggle = (e) => {
    // CRITICAL: Prevent event from bubbling to document (prevents click-outside conflicts)
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (isOpen) {
      console.log("HomesfyChat: User closing widget - Mount ID:", componentMountIdRef.current);
      isIntentionallyOpenRef.current = false; // User is intentionally closing
      setIsOpen(false, true); // Force close (bypass protection for user action)
      setShowModal(false); // Also close modal if open
      return;
    }

    console.log("HomesfyChat: User opening widget - Mount ID:", componentMountIdRef.current);
    setShowModal(false); // Close modal when opening chat
    openChatOnce();
  };

  // Handle modal "Let's Chat" button click
  const handleModalChatClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowModal(false);
    openChatOnce();
  };

  // Handle modal close (X button)
  const handleModalClose = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowModal(false);
  };

  const handleCtaSelect = (cta) => {
    setSelectedCta(cta);
    pushUserMessage(cta);
    trackEvent("cta_selected", { label: cta });
    setCurrentStage("bhk");
    setIsTyping(true);

    setTimeout(() => {
      pushSystemMessage(resolvedTheme.ctaAcknowledgement);
    }, 400);

    setTimeout(() => {
      pushSystemMessage(resolvedTheme.bhkPrompt);
      setIsTyping(false);
    }, 1100);
  };

  const handleBhkSelect = (bhk) => {
    setSelectedBhk(bhk);
    setManualInput("");
    setNameInput("");
    setPhoneInput("");
    pushUserMessage(bhk);
    trackEvent("chat_started", { bhkType: bhk });
    setCurrentStage("name");
    setIsTyping(true);

    setTimeout(() => {
      pushSystemMessage(resolvedTheme.inventoryMessage);
    }, 500);

    setTimeout(() => {
      console.log("HomesfyChat: BHK selected, switching to NAME + PHONE input mode");
      // Ask for both name and phone together in one message
      const combinedPrompt = resolvedTheme.namePrompt || 
        resolvedTheme.phonePrompt || 
        "Please enter your name and phone number";
      pushSystemMessage(combinedPrompt);
      setIsTyping(false);
    }, 1500);
  };

  // handleNameSubmit is no longer used - both fields are submitted together
  // Keeping for backward compatibility but it won't be called

  // Simple flow: CTA → BHK → Name + Phone (together)
  const isNameInputActive = currentStage === "name" && !nameSubmitted;
  const isPhoneInputActive = currentStage === "name" && !phoneSubmitted; // Show phone field together with name
  const isLeadCaptureActive = isNameInputActive || isPhoneInputActive;
  
  // Debug logging
  useEffect(() => {
    console.log("HomesfyChat: Current stage:", currentStage, "nameSubmitted:", nameSubmitted, "phoneSubmitted:", phoneSubmitted);
    console.log("HomesfyChat: isNameInputActive:", isNameInputActive, "isPhoneInputActive:", isPhoneInputActive);
  }, [currentStage, isNameInputActive, isPhoneInputActive, nameSubmitted, phoneSubmitted]);

  const selectedCountryKey = countryOptionKey(
    selectedCountry || DEFAULT_COUNTRY
  );

  const handleManualInputChange = (event) => {
    let nextValue = event.target.value;
    // For regular chat input (not lead capture)
    nextValue = nextValue.replace(/[^\w\s.,!?@#$%^&*()\-+=]/g, "");
    setManualInput(nextValue);
    if (error) {
      setError(null);
    }
  };

  const handleNameInputChange = (event) => {
    let nextValue = event.target.value;
    // Allow letters, spaces, and common name characters
    nextValue = nextValue.replace(/[^a-zA-Z\s'-]/g, "");
    setNameInput(nextValue);
    if (error) {
      setError(null);
    }
  };

  const handlePhoneInputChange = (event) => {
    let nextValue = event.target.value;
    // For phone input: user selects country code from dropdown, then types only digits
    // Remove everything except digits, spaces, and hyphens
    nextValue = nextValue.replace(/[^\d\s-]/g, "");
    // Remove any + signs since country code is selected from dropdown
    nextValue = nextValue.replace(/\+/g, "");
    // Clean up multiple spaces
    nextValue = nextValue.replace(/\s+/g, " ").trim();
    setPhoneInput(nextValue);
    if (error) {
      setError(null);
    }
  };
  

  async function submitLeadInput(rawInput, providedName = null) {
    setError(null);

    const rawString =
      typeof rawInput === "string" ? rawInput.trim() : String(rawInput || "");

    if (!rawString) {
      setError("Please enter a valid phone number.");
      return false;
    }
    
    // Use provided name if available, otherwise use userName from state
    const nameToUse = providedName || userName || "Guest";

    // IMPORTANT: User selects country code from dropdown, then types only digits
    // We always use the selected country code from the dropdown (not typed)
    const digitsOnly = rawString.replace(/\D/g, "");

      if (!digitsOnly) {
        setError("Please enter a valid phone number.");
        return false;
      }

    // CRITICAL: Require country code selection from dropdown
      const dialCode = selectedCountry?.code;
      if (!dialCode) {
      setError("Please select a country code from the dropdown.");
        return false;
      }

    // Always combine selected country code (from dropdown) with user's digits
    // User should NOT type the country code, they select it from dropdown
    let candidateValue = `${dialCode}${digitsOnly}`;
    
    // If user accidentally typed a country code with +, try to detect and use it instead
    // This is a fallback for users who type the full number
    if (rawString.startsWith("+")) {
      const withPlus = rawString.replace(/[\s().-]/g, "");
      const explicitCountry = pickCountryByDialCode(withPlus);
      
      if (explicitCountry) {
        const subscriberDigits = withPlus.slice(explicitCountry.code.length);
        if (subscriberDigits && /^\d+$/.test(subscriberDigits) && subscriberDigits.length >= 4) {
          // User typed full number with country code, use it and update selection
          candidateValue = `${explicitCountry.code}${subscriberDigits}`;
          setSelectedCountry(explicitCountry);
          console.log("HomesfyChat: Detected country code in input, using:", explicitCountry.code);
        }
      }
    }

    const validationResult = normalizePhoneInput(candidateValue);

    if (validationResult.error) {
      setError(validationResult.error);
      return false;
    }

    try {
      const normalizedPhone = validationResult.value;
      const displayPhone = formatPhoneDisplay(validationResult);

      if (validationResult.country) {
        setSelectedCountry(validationResult.country);
      }

      const submissionMessage = {
        id: generateId(),
        type: "user",
        text: displayPhone || normalizedPhone,
        timestamp: Date.now(),
      };

      const conversationSnapshot = messages.map((message) => ({
        id: message.id,
        type: message.type,
        text: message.text,
        timestamp: message.timestamp,
      }));

      conversationSnapshot.push(submissionMessage);

      // Extract country code and number for Homesfy CRM API
      const countryCode = validationResult.country?.code || "+91";
      // Use the subscriber digits directly from validation result
      let phoneNumber = validationResult.subscriber || "";
      
      // Ensure we have just the digits without country code
      phoneNumber = phoneNumber.replace(/\D/g, "");
      
      // Determine nationality: 1 for India (+91), 2 for others
      const nationality = countryCode === "+91" ? 1 : 2;
      
      // Validate Indian phone numbers (must be 10 digits starting with 6-9)
      if (countryCode === "+91") {
        if (phoneNumber.length !== 10 || !/^[6-9]/.test(phoneNumber)) {
          setError("Invalid phone number. For Indian numbers, enter a valid 10-digit number starting with 6-9.");
          return false;
        }
      }

      // Get project ID for lead submission - extracted from script's data-project attribute
      // This ensures each microsite's leads are sent to CRM with the correct project ID
      // Widget design is shared (same for all), but leads are project-specific
      const urlParams = new URLSearchParams(window.location.search);
      const projectIdFromUrl = urlParams.get("project_id") || urlParams.get("projectId");
      // Check for data attribute on script tag as fallback
      const scriptElement = document.currentScript || 
        document.querySelector('script[data-project]') ||
        document.querySelector('script[data-project-id]') ||
        document.querySelector('script[src*="widget.js"]');
      const projectIdFromData = scriptElement?.dataset?.project || scriptElement?.dataset?.projectId;
      // Use projectId prop FIRST (from embed script data-project attribute)
      // This is the project ID that will be sent to CRM with the lead
      const finalProjectId = projectId || projectIdFromUrl || projectIdFromData || "5796";
      
      // Project ID is used for lead submission to CRM
      // Widget design uses shared config (same for all projects)
      console.log("HomesfyChat: 📝 Submitting lead to CRM with project ID:", finalProjectId);
      console.log("HomesfyChat: 📋 Project ID source:", {
        fromProp: projectId || "Not found",
        fromUrl: projectIdFromUrl || "Not found",
        fromData: projectIdFromData || "Not found",
        final: finalProjectId
      });

      // Get magnet_id from URL if present
      const magnetId = urlParams.get("magnet_id");

      // Get UTM parameters (matching the provided API structure)
      const utmParams = {};
      UTM_PARAMS.forEach(param => {
        const value = urlParams.get(param);
        if (value) {
          // Map to the format used in the provided API: utm_source -> utmsource, etc.
          const key = param.replace("utm_", "");
          utmParams[`utm${key}`] = value;
        }
      });
      
      // Also check sessionStorage for UTM params (matching provided API behavior)
      UTM_PARAMS.forEach(param => {
        const storedValue = sessionStorage.getItem(param);
        if (storedValue && !utmParams[param.replace("utm_", "utm")]) {
          const key = param.replace("utm_", "");
          utmParams[`utm${key}`] = storedValue;
        }
      });

      // Get device and browser info
      const deviceInfo = navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i) || 
        navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/Windows Phone/i) 
        ? "Mobile" 
        : navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/iPod/i) 
        ? "Tablet" 
        : "Desktop";

      const browserInfo = navigator.userAgent.indexOf("Chrome") > -1 ? "Chrome" :
        navigator.userAgent.indexOf("Firefox") > -1 ? "Firefox" :
        navigator.userAgent.indexOf("Safari") > -1 ? "Safari" :
        navigator.userAgent.indexOf("Edge") > -1 ? "Edge" : "Other";

      // Get IP address
      let clientIp = "0.0.0.0";
      try {
        const ipResponse = await fetch("https://api.ipify.org/?format=json", { mode: "cors" });
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          clientIp = ipData.ip || "0.0.0.0";
        }
      } catch (err) {
        console.warn("Failed to fetch IP address", err);
      }

      // Prepare payload for Homesfy CRM API (matching the provided API structure)
      // Use nameToUse which comes from parameter or state
      const leadName = nameToUse || userName || "Guest";
      
      console.log("HomesfyChat: Preparing CRM payload - Name:", leadName, "Phone:", phoneNumber, "Country:", countryCode);
      
      const crmPayload = {
        name: leadName,
        email: null, // Not collected in simplified flow
        country_code: countryCode,
        number: phoneNumber,
        tracking_lead_id: magnetId || `chat-${Date.now()}`,
        nationality: nationality,
        source_id: magnetId ? 49 : 31, // 49 for magnet campaigns, 31 for regular chat widget leads
        project_id: Number(finalProjectId) || Number(projectId) || 5796, // Use project ID from embed script (data-project attribute)
        Digital: {
          user_device: deviceInfo,
          user_browser: browserInfo,
          campaing_type: utmParams.utmcampaign || urlParams.get("utm_campaign") || null, // Note: typo "campaing" matches provided API
          launch_name: "",
          client_ipaddress: clientIp,
          client_pref: null
        }
      };

      // Add UTM params if present (matching the provided API structure)
      if (Object.keys(utmParams).length > 0) {
        crmPayload.Utm = {
          utm_medium: utmParams.utmmedium || null,
          utm_source: utmParams.utmsource || null,
          utm_content: utmParams.utmcontent || null,
          utm_term: utmParams.utmterm || null,
        };
      }

      // Add magnet info if present
      if (magnetId) {
        crmPayload.is_magnet = 1;
        crmPayload.magnet_id = magnetId;
      }

      // Send to Homesfy CRM API - always use production API
      const crmBaseUrl = "https://api.homesfy.in";

      console.log("HomesfyChat: Sending lead to CRM:", JSON.stringify(crmPayload, null, 2));

      const crmResponse = await fetch(`${crmBaseUrl}/api/leads/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(crmPayload),
      });

      const responseText = await crmResponse.text();
      console.log("HomesfyChat: CRM API Response Status:", crmResponse.status);
      console.log("HomesfyChat: CRM API Response:", responseText.substring(0, 500));

      if (!crmResponse.ok) {
        let errorMessage = `Failed to save lead to CRM (${crmResponse.status})`;
        try {
          if (responseText) {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorData.error || errorMessage;
            console.error("HomesfyChat: CRM API Error:", errorData);
          }
        } catch (e) {
          console.error("HomesfyChat: CRM API Error (non-JSON):", responseText.substring(0, 200));
        }
        throw new Error(errorMessage);
      }
      
      // Parse successful response
      try {
        const responseData = JSON.parse(responseText);
        console.log("HomesfyChat: ✅ Lead saved to CRM successfully:", responseData);
      } catch (e) {
        console.log("HomesfyChat: ✅ Lead saved to CRM (response not JSON)");
      }

      // Also save to local API for dashboard tracking
      try {
        const localPayload = {
        phone: normalizedPhone,
          bhkType: selectedBhk || "Yet to decide",
        microsite: microsite || projectId,
        metadata: {
            projectId: finalProjectId,
            name: userName,
          visitor: {
            ...visitorContext,
            lastInteractionAt: new Date().toISOString(),
          },
          phoneCountry: validationResult.country?.name,
          phoneCountryCode: validationResult.country?.countryCode,
          phoneDialCode: validationResult.country?.code,
          phoneSubscriber: validationResult.subscriber,
        },
        conversation: conversationSnapshot,
      };

        await fetch(`${apiBaseUrl}/api/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
          body: JSON.stringify(localPayload),
          credentials: 'omit', // CRITICAL: Must be 'omit' when using wildcard CORS
        }).catch(() => {
          // Silently fail if local API is not available
      });
      } catch (localErr) {
        console.warn("Failed to save to local API", localErr);
      }

      pushUserMessage(displayPhone || normalizedPhone);
      setPhoneSubmitted(true);
      pushSystemMessage(resolvedTheme.thankYouMessage);
      
      // Mark as complete
      setCurrentStage("complete");
      console.log("HomesfyChat: ✅ Lead submitted successfully to CRM");
      
      trackEvent("lead_submitted", {
        name: userName,
        bhkType: selectedBhk,
        phoneCountry: validationResult.country?.countryCode,
        projectId: finalProjectId,
      });

      // Push to GTM dataLayer if available (matching the provided API)
      if (typeof window.dataLayer !== "undefined") {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: "formSubmitted",
          phone_number: `${countryCode}${phoneNumber}`,
        });
      }
      
      // Store in localStorage (matching the provided API)
      try {
        localStorage.setItem("submittedCountryCode", countryCode);
        localStorage.setItem("submittedPhone", phoneNumber);
      } catch (e) {
        // Ignore localStorage errors
      }

      return true;
    } catch (err) {
      console.error(err);
      setError("We couldn't save your details. Please try again.");
      return false;
    }
  }

  const handleManualSubmit = async (event) => {
    event.preventDefault();

    if (isTyping) {
      return;
    }

    const rawValue = manualInput;
    const trimmed = rawValue.trim();

    // Simple flow: CTA → BHK → Name → Phone
    
    // Stage 1: CTA selection
    if (!selectedCta) {
      if (!trimmed) {
        return;
      }
      
      // Check if input matches a CTA option
      const normalizedInput = trimmed.toLowerCase().replace(/[^\w\s]/g, '').trim();
      const isCtaSelection = ctaOptions.some(cta => {
        const normalizedCta = cta.toLowerCase().replace(/[^\w\s]/g, '').trim();
        return normalizedInput === normalizedCta || normalizedInput.includes(normalizedCta);
      });
      
      if (isCtaSelection) {
        setManualInput("");
        handleCtaSelect(trimmed);
        return;
      }
      
      // If not a CTA, handle as a greeting/free-form message
      // Treat it like a CTA selection - hide buttons and continue flow
      const userMessage = trimmed;
      pushUserMessage(userMessage);
      setManualInput("");
      
      // Set a default CTA to hide the buttons (use first CTA as default)
      setSelectedCta(ctaOptions[0]);
      trackEvent("cta_selected", { label: "user_message", userMessage });
      setCurrentStage("bhk");
      setIsTyping(true);

      // Show the combined response message (same format as when CTA is selected)
      setTimeout(() => {
        pushSystemMessage(resolvedTheme.ctaAcknowledgement);
      }, 400);

      // Then show BHK prompt
      setTimeout(() => {
        pushSystemMessage(resolvedTheme.bhkPrompt);
        setIsTyping(false);
      }, 1100);
      
      return;
    }

    // Stage 2: BHK selection
    if (!selectedBhk) {
      if (!trimmed) {
        return;
      }
      
      // Check if input matches a BHK option
      const normalizedInput = trimmed.toLowerCase().trim();
      const isBhkSelection = bhkOptions.some(bhk => {
        const normalizedBhk = bhk.toLowerCase().trim();
        return normalizedInput === normalizedBhk || 
               /^\s*[1-4]\s*bhk\s*$/i.test(normalizedInput) ||
               (normalizedInput.includes('bhk') && /[1-4]/.test(normalizedInput));
      });
      
      if (isBhkSelection) {
        setManualInput("");
        handleBhkSelect(trimmed);
        return;
      }
      
      // If not a BHK, ignore (user must click a button)
      return;
    }

    // Stage 3: Name + Phone collection (together)
    if (isNameInputActive) {
      // When in name stage, submit both name and phone together
      const nameTrimmed = nameInput.trim();
      const phoneTrimmed = phoneInput.trim();
      
      // Validate name
      if (!nameTrimmed || nameTrimmed.length < 2) {
        setError("Please enter your name (at least 2 characters).");
        return;
      }
      
      const namePattern = /^[a-zA-Z\s'-]{2,50}$/;
      if (!namePattern.test(nameTrimmed)) {
        setError("Please enter a valid name (letters only).");
        return;
      }
      
      // Validate phone
      if (!phoneTrimmed) {
        setError("Please enter your phone number.");
        return;
      }
      
      // Submit phone with name
      const success = await submitLeadInput(phoneTrimmed, nameTrimmed);
      if (success) {
        setNameInput("");
        setPhoneInput("");
        setUserName(nameTrimmed);
        setNameSubmitted(true);
      }
      return;
    }
  };

  // Log when widget renders and monitor state changes
  useEffect(() => {
    console.log("HomesfyChat: Widget component rendered", {
      isOpen,
      bubblePosition: resolvedTheme.bubblePosition,
      hasAvatar: !!avatarUrl,
      mountId: componentMountIdRef.current,
      intentionallyOpen: isIntentionallyOpenRef.current,
      hasShown: hasShownRef.current
    });
  }, [isOpen, resolvedTheme.bubblePosition, avatarUrl]);

  // Monitor isOpen changes to detect unexpected closes and keep refs in sync
  // CRITICAL: This effect was causing infinite loops - simplified to only log, not restore state
  useEffect(() => {
    // Keep ref in sync (defensive, but ref should already be updated in setIsOpen)
    isOpenRef.current = isOpen;
    
    if (isOpen) {
      console.log("HomesfyChat: Widget opened - Mount ID:", componentMountIdRef.current, "Intentionally open:", isIntentionallyOpenRef.current);
    } else {
      console.log("HomesfyChat: Widget closed - Mount ID:", componentMountIdRef.current, "Intentionally:", isIntentionallyOpenRef.current);
      // Log unexpected closes but don't restore (let user handle it)
      if (isIntentionallyOpenRef.current) {
        const timeSinceOpen = Date.now() - lastOpenTimeRef.current;
        if (timeSinceOpen < 2000) {
          console.warn("HomesfyChat: ⚠️ Widget closed unexpectedly within 2 seconds of opening! Time since open:", timeSinceOpen, "ms. Mount ID:", componentMountIdRef.current);
          // Don't restore automatically - this could cause loops
          // User can click to reopen if needed
        }
      }
    }
  }, [isOpen]); // Removed setIsOpen from deps to prevent loops

  return (
    <div
      className={`homesfy-widget homesfy-widget__${resolvedTheme.bubblePosition} ${
        isOpen ? "homesfy-widget--open" : ""
      }`}
      style={{
        "--homesfy-primary": resolvedTheme.primaryColor,
        "--homesfy-primary-rgb": primaryRgb,
        position: "fixed",
        zIndex: 2147483647,
        display: "block",
        visibility: "visible",
        opacity: 1,
      }}
    >
      {isOpen && (
        <div className="homesfy-widget__window">
          <span className="homesfy-widget__window-glow" aria-hidden />
          <header
            className="homesfy-widget__header"
            style={{ background: resolvedTheme.primaryColor }}
          >
            <div className="homesfy-widget__header-left">
              {avatarUrl && (
                <div className="homesfy-widget__avatar-shell">
                  <img
                    src={avatarUrl}
                    alt={resolvedTheme.agentName}
                    className="homesfy-widget__agent-avatar"
                    onError={handleAvatarError}
                  />
                  <span className="homesfy-widget__avatar-ring" aria-hidden />
                </div>
              )}
              <div className="homesfy-widget__header-copy">
                <p className="homesfy-widget__agent-name">
                  {resolvedTheme.agentName}
                </p>
                <p className="homesfy-widget__agent-status">
                  <span className="homesfy-widget__status-dot" aria-hidden />
                  Live property expert • 
                </p>
              </div>
            </div>
            <button className="homesfy-widget__close" onClick={handleToggle}>
              ×
            </button>
          </header>

          {/* Hero section removed per request */}

          <div className="homesfy-widget__messages">
            {messages.map((message) => {
              const isUser = message.type === "user";

              return (
                <div
                  key={message.id}
                  className={`homesfy-widget__message-row homesfy-widget__message-row--${message.type}`}
                >
                  {!isUser && avatarUrl && (
                    <div className="homesfy-widget__message-avatar homesfy-widget__message-avatar--agent">
                      <img
                        src={avatarUrl}
                        alt={resolvedTheme.agentName}
                        onError={handleAvatarError}
                      />
                    </div>
                  )}

                  <div
                    className={`homesfy-widget__bubble homesfy-widget__bubble--${message.type}`}
                  >
                    <div className="homesfy-widget__message-text">
                      {message.text.split("\n").map((line, idx) => {
                        // Parse **bold** markdown and convert to <strong> tags
                        const parts = line.split(/(\*\*[^*]+\*\*)/g);
                        return (
                          <span key={idx}>
                            {parts.map((part, partIdx) => {
                              if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
                              }
                              return <span key={partIdx}>{part}</span>;
                            })}
                          </span>
                        );
                      })}
                    </div>
                    <span className="homesfy-widget__message-time">
                      {formatMessageTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="homesfy-widget__message-row homesfy-widget__message-row--system">
                {avatarUrl && (
                  <div className="homesfy-widget__message-avatar homesfy-widget__message-avatar--agent">
                    <img
                      src={avatarUrl}
                      alt={resolvedTheme.agentName}
                      onError={handleAvatarError}
                    />
                  </div>
                )}
                <div className="homesfy-widget__bubble homesfy-widget__bubble--system">
                  <span className="homesfy-widget__typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                </div>
              </div>
            )}

            {/* Stage 1: CTA selection - inside scrollable area */}
            {!selectedCta && (
              <div className="homesfy-widget__cta-grid">
                {ctaOptions.map((option, index) => {
                  const isVisible = !isMobile || index < visibleCtaCount;
                  return (
                    <button
                      key={option}
                      className={`homesfy-widget__cta-button ${isVisible ? 'homesfy-widget__cta-button--visible' : 'homesfy-widget__cta-button--hidden'}`}
                      style={{
                        borderColor: resolvedTheme.primaryColor,
                        color: resolvedTheme.primaryColor,
                        animationDelay: `${300 + index * 150}ms`,
                      }}
                      onClick={() => handleCtaSelect(option)}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="homesfy-widget__input">

            {/* Stage 2: BHK selection */}
            {selectedCta && !selectedBhk && !isTyping && (
              <div className="homesfy-widget__options">
                {bhkOptions.map((option) => (
                  <button
                    key={option}
                    className="homesfy-widget__option-button"
                    style={{
                      borderColor: resolvedTheme.primaryColor,
                      color: resolvedTheme.primaryColor,
                    }}
                    onClick={() => handleBhkSelect(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {phoneSubmitted && (
              <p className="homesfy-widget__footer-note">
                You can close the chat. We'll reach out soon.
              </p>
            )}

            {error && <p className="homesfy-widget__error">{error}</p>}

            {/* Form - Show both name and phone fields together when in name stage */}
            {isLeadCaptureActive ? (
              <form 
                className="homesfy-widget__form homesfy-widget__form--lead-capture" 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleManualSubmit(e);
                }}
              >
                <div className="homesfy-widget__lead-capture-fields">
                  {/* Name Field */}
                  <div className="homesfy-widget__input-shell homesfy-widget__input-shell--name">
                    <input
                      type="text"
                      className="homesfy-widget__field homesfy-widget__field--name"
                      placeholder="Enter your name"
                      value={nameInput}
                      onChange={handleNameInputChange}
                      disabled={isTyping || phoneSubmitted}
                      inputMode="text"
                      autoComplete="name"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </div>

                  {/* Phone Field with Country Code */}
                  <div className="homesfy-widget__input-shell homesfy-widget__input-shell--phone">
                    <div className="homesfy-widget__country" title={`Selected: ${selectedCountry?.name || 'Country'}`}>
                      <label className="homesfy-widget__country-label">
                        <span className="sr-only">Country code</span>
                        <select
                          aria-label="Country code"
                          className="homesfy-widget__country-select"
                          value={selectedCountryKey}
                          onChange={(event) => {
                            const next = findCountryByKey(event.target.value);
                            if (next) {
                              setSelectedCountry(next);
                              if (error) {
                                setError(null);
                              }
                              console.log("HomesfyChat: Country code selected:", next.code, next.name);
                            }
                          }}
                          disabled={isTyping}
                        >
                          {COUNTRY_PHONE_CODES.map((country) => (
                            <option
                              key={countryOptionKey(country)}
                              value={countryOptionKey(country)}
                              title={country.name}
                            >
                              {country.code}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <input
                      type="tel"
                      className="homesfy-widget__field homesfy-widget__field--phone"
                      placeholder="Enter your number"
                      value={phoneInput}
                      onChange={handlePhoneInputChange}
                      disabled={isTyping || phoneSubmitted}
                      inputMode="tel"
                      autoComplete="tel"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  className="homesfy-widget__submit homesfy-widget__submit--lead-capture"
                  style={{ background: resolvedTheme.primaryColor }}
                  disabled={isTyping || !nameInput.trim() || !phoneInput.trim() || phoneSubmitted}
                  title="Submit name and phone number"
                >
                  Submit
                </button>
              </form>
            ) : (
              /* Regular Chat Form */
              <form 
                className="homesfy-widget__form" 
                onSubmit={handleManualSubmit}
              >
                <div className="homesfy-widget__input-shell">
                  <input
                    type="text"
                    className="homesfy-widget__field"
                    placeholder={!selectedCta ? "Write a reply.." : !selectedBhk ? "Tell us your preferred configuration" : "Write a reply.."}
                    value={manualInput}
                    onChange={handleManualInputChange}
                    disabled={isTyping || phoneSubmitted}
                    inputMode="text"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
                
                <button
                  type="submit"
                  className="homesfy-widget__submit"
                  style={{ background: resolvedTheme.primaryColor }}
                  disabled={isTyping || !manualInput.trim() || phoneSubmitted}
                  title="Send message"
                >
                  ➤
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal - appears after 8 seconds */}
      {showModal && !isOpen && (
        <div className="homesfy-widget__modal" onClick={(e) => e.stopPropagation()}>
          <div className="homesfy-widget__modal-content">
            <button 
              className="homesfy-widget__modal-close" 
              onClick={handleModalClose}
              aria-label="Close modal"
            >
              ×
            </button>
            <div className="homesfy-widget__modal-header">
              <h3 className="homesfy-widget__modal-title">
                Hey, I'm {resolvedTheme.agentName}!
              </h3>
              <p className="homesfy-widget__modal-message">
                How can I help you?
              </p>
            </div>
            <button
              className="homesfy-widget__modal-button"
              style={{ background: resolvedTheme.primaryColor }}
              onClick={handleModalChatClick}
            >
              Let's Chat
            </button>
          </div>
        </div>
      )}

      <button
        className="homesfy-widget__bubble-button"
        style={{ background: resolvedTheme.primaryColor }}
        onClick={handleToggle}
      >
        <span className="homesfy-widget__bubble-glow" aria-hidden />
        {avatarUrl && (
          <img
            src={avatarUrl}
            alt="Agent"
            className="homesfy-widget__bubble-avatar"
            onError={handleAvatarError}
          />
        )}
        <div className="homesfy-widget__bubble-text">
          <span className="homesfy-widget__bubble-title">
            {resolvedTheme.bubbleTitle}
          </span>
          <span className="homesfy-widget__bubble-subtitle">
            {resolvedTheme.bubbleSubtitle}
          </span>
        </div>
      </button>
    </div>
  );
}

