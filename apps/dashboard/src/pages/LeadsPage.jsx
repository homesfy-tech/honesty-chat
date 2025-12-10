import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api.js";
import {
  LeadsTable,
  resolveLocation,
  resolveSource,
  resolveWebsiteInfo,
} from "../components/LeadsTable.jsx";

export function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [datePreset, setDatePreset] = useState("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => {
    async function loadLeads() {
      setLoading(true);
      try {
        const params = {};

        if (searchTerm) {
          params.search = searchTerm;
        }

        const { startDate, endDate } = resolveDateRange({
          datePreset,
          customStart,
          customEnd,
        });

        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const response = await api.get("/leads", {
          params,
        });
        setLeads(response.data.items ?? []);
      } catch (error) {
        console.error("Failed to fetch leads", error);
      } finally {
        setLoading(false);
      }
    }

    loadLeads();
  }, [searchTerm, datePreset, customStart, customEnd]);

  const stats = useMemo(() => {
    if (!leads.length) {
      return {
        total: 0,
        microsites: 0,
        topSource: "—",
        topLocation: "—",
      };
    }

    const micrositeSet = new Set();
    const sourceCount = new Map();
    const locationCount = new Map();

    leads.forEach((lead) => {
      if (lead.microsite) {
        micrositeSet.add(lead.microsite);
      }

      let source = "Direct / Organic";

      const utmSource = lead.metadata?.visitor?.utm?.source;
      if (utmSource) {
        const utmMedium = lead.metadata?.visitor?.utm?.medium;
        source = utmMedium ? `${utmSource} • ${utmMedium}` : utmSource;
      } else if (lead.metadata?.visitor?.referrer) {
        try {
          source = new URL(lead.metadata.visitor.referrer).hostname;
        } catch {
          source = lead.metadata.visitor.referrer;
        }
      }

      const locationObj = lead.metadata?.visitor?.location;
      const location = locationObj
        ? [locationObj.city, locationObj.region, locationObj.country]
            .filter(Boolean)
            .join(", ")
        : "Unknown";

      sourceCount.set(source, (sourceCount.get(source) || 0) + 1);
      locationCount.set(location, (locationCount.get(location) || 0) + 1);
    });

    const topSource = Array.from(sourceCount.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0][0];

    const topLocation = Array.from(locationCount.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0][0];

    return {
      total: leads.length,
      microsites: micrositeSet.size,
      topSource,
      topLocation,
    };
  }, [leads]);

  const handleExport = () => {
    if (!leads.length) {
      return;
    }

    const escapeCell = (value) => {
      if (value === null || value === undefined) {
        return "";
      }
      const stringValue = String(value);
      if (/[",\n]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const headers = [
      "Lead ID",
      "Captured At",
      "Phone",
      "Microsite",
      "Website",
      "Environment",
      "Landing Page",
      "Interest",
      "Source (Display)",
      "UTM Source",
      "UTM Medium",
      "UTM Campaign",
      "Location",
      "Timezone",
      "IP Address",
      "Status",
    ];

    const rows = leads.map((lead, index) => {
      const rawId =
        (typeof lead.id === "string" && lead.id) ||
        (typeof lead._id === "string" && lead._id) ||
        String(index + 1);
      const website = resolveWebsiteInfo(lead);
      const websiteLabel = lead.metadata?.website
        ? String(lead.metadata.website)
        : website.label;
      const micrositeLabel = lead.microsite ? String(lead.microsite) : "";
      const utm = lead.metadata?.visitor?.utm || {};
      const locationLabel = resolveLocation(lead);
      const timezone = lead.metadata?.visitor?.location?.timezone || "";
      const ip = lead.metadata?.visitor?.ip || "";
      const formattedPhone = formatPhoneForExport(lead);

      return [
        rawId,
        lead.createdAt ? new Date(lead.createdAt).toISOString() : "",
        formattedPhone,
        micrositeLabel,
        websiteLabel,
        website.environment || "",
        website.landingPage || "",
        lead.bhkType || "",
        resolveSource(lead),
        utm.source || "",
        utm.medium || "",
        utm.campaign || "",
        locationLabel,
        timezone,
        ip,
        lead.status || "new",
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-");

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `leads-${timestamp}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_40px_120px_rgba(8,47,73,0.25)] backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-300">
              Funnel Overview
            </p>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-white">Leads Intelligence</h2>
              <p className="max-w-xl text-sm text-slate-200/80">
                Monitor captured leads, campaign performance, and channel
                attribution in one command center—filter down to the cohort you
                need in seconds.
              </p>
            </div>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-4">
            <StatCard label="Total leads" value={stats.total} variant="primary" />
            <StatCard
              label="Active microsites"
              value={stats.microsites}
              variant="emerald"
            />
            <StatCard label="Top source" value={stats.topSource} variant="amber" />
            <StatCard
              label="Top location"
              value={stats.topLocation}
              variant="violet"
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.25)] backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full max-w-sm">
              <input
                type="search"
                placeholder="Search by phone, microsite, or campaign"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-3 pl-11 text-sm text-white shadow-inner shadow-white/10 placeholder:text-slate-300 focus:border-sky-400 focus:outline-none"
              />
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sky-300/90">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M10.5 3a7.5 7.5 0 0 1 5.93 12.131l3.72 3.72a.75.75 0 1 1-1.06 1.06l-3.72-3.72A7.5 7.5 0 1 1 10.5 3Zm0 1.5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z" />
                </svg>
              </span>
            </div>

            <DateFilters
              preset={datePreset}
              onPresetChange={(value) => {
                setDatePreset(value);
                if (value !== "custom") {
                  setCustomStart("");
                  setCustomEnd("");
                }
              }}
              customStart={customStart}
              customEnd={customEnd}
              onCustomChange={({ start, end }) => {
                setCustomStart(start);
                setCustomEnd(end);
              }}
            />
          </div>

          <div className="flex flex-col gap-2 self-start sm:flex-row">
            <button
              type="button"
              onClick={handleExport}
              disabled={loading || !leads.length}
              className="rounded-full border border-emerald-400/40 bg-emerald-400/20 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-[0_12px_30px_rgba(16,185,129,0.35)] transition hover:border-emerald-300/60 hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-400"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setDatePreset("30d");
                setCustomStart("");
                setCustomEnd("");
              }}
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-sky-300 transition hover:border-sky-400/40 hover:text-sky-200"
            >
              Clear filters
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center text-slate-200 shadow-[0_25px_80px_rgba(15,23,42,0.25)] backdrop-blur">
          Loading leads...
        </div>
      ) : (
        <LeadsTable leads={leads} />
      )}
    </div>
  );
}

const STAT_VARIANTS = {
  primary: {
    gradient: "from-sky-500/90 via-sky-400/80 to-blue-500/90",
    glow: "shadow-[0_20px_45px_rgba(14,165,233,0.45)]",
    icon: "📈",
  },
  emerald: {
    gradient: "from-emerald-500/90 via-emerald-400/80 to-lime-500/90",
    glow: "shadow-[0_20px_45px_rgba(16,185,129,0.45)]",
    icon: "🏙️",
  },
  amber: {
    gradient: "from-amber-500/90 via-orange-400/80 to-pink-500/90",
    glow: "shadow-[0_20px_45px_rgba(249,115,22,0.4)]",
    icon: "🚀",
  },
  violet: {
    gradient: "from-violet-500/90 via-indigo-400/80 to-purple-500/90",
    glow: "shadow-[0_20px_45px_rgba(124,58,237,0.45)]",
    icon: "📍",
  },
};

function StatCard({ label, value, variant = "primary" }) {
  const { gradient, glow, icon } = STAT_VARIANTS[variant] || STAT_VARIANTS.primary;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br ${gradient} px-5 py-4 text-left text-white backdrop-blur ${glow}`}
    >
      <span className="text-2xl">{icon}</span>
      <p className="mt-3 text-xs uppercase tracking-[0.3em] text-white/70">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />
    </div>
  );
}

function formatPhoneForExport(lead) {
  const normalizedPhone = typeof lead.phone === "string" ? lead.phone.trim() : "";
  const phoneDialCode = lead.metadata?.phoneDialCode;
  const phoneSubscriber = lead.metadata?.phoneSubscriber;

  if (phoneDialCode && phoneSubscriber) {
    return `${phoneDialCode} ${phoneSubscriber}`;
  }

  if (normalizedPhone && /^\+\d{4,}$/.test(normalizedPhone)) {
    const dialCodeMatch = normalizedPhone.match(/^\+\d{1,4}/);
    if (dialCodeMatch) {
      const dialCode = dialCodeMatch[0];
      const subscriberPart = normalizedPhone.slice(dialCode.length);
      return subscriberPart ? `${dialCode} ${subscriberPart}` : normalizedPhone;
    }
  }

  return normalizedPhone;
}

function resolveDateRange({ datePreset, customStart, customEnd }) {
  const now = new Date();

  if (datePreset === "custom") {
    const start = customStart ? new Date(customStart) : null;
    const end = customEnd ? new Date(customEnd) : null;

    return {
      startDate: start && !Number.isNaN(start.getTime()) ? start.toISOString() : undefined,
      endDate: end && !Number.isNaN(end.getTime()) ? end.toISOString() : undefined,
    };
  }

  const offsets = {
    "7d": 6,
    "30d": 29,
  };

  if (!offsets[datePreset]) {
    return { startDate: undefined, endDate: undefined };
  }

  const start = new Date(now.getTime() - offsets[datePreset] * 24 * 60 * 60 * 1000);

  return {
    startDate: start.toISOString(),
    endDate: now.toISOString(),
  };
}

function DateFilters({
  preset,
  onPresetChange,
  customStart,
  customEnd,
  onCustomChange,
}) {
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);
  const presets = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "custom", label: "Custom" },
  ];

  const customButtonRef = useRef(null);
  const pickerRef = useRef(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });

  const updatePickerPosition = () => {
    const trigger = customButtonRef.current;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const preferredLeft = rect.left + window.scrollX;
    const preferredTop = rect.bottom + window.scrollY + 12;
    const viewportWidth = window.innerWidth;
    const popoverWidth = 260;
    const maxLeft = viewportWidth - popoverWidth - 16;

    setPickerPosition({
      top: preferredTop,
      left: Math.max(16, Math.min(preferredLeft, maxLeft)),
    });
  };

  useEffect(() => {
    if (preset !== "custom") {
      setIsPickerOpen(false);
    }
  }, [preset]);

  useEffect(() => {
    if (isPickerOpen) {
      updatePickerPosition();
      requestAnimationFrame(() => {
        startInputRef.current?.focus();
        startInputRef.current?.showPicker?.();
      });
    }
  }, [isPickerOpen]);

  useEffect(() => {
    if (!isPickerOpen) return undefined;

    function handleClick(event) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target) &&
        !customButtonRef.current?.contains(event.target)
      ) {
        setIsPickerOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsPickerOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updatePickerPosition);
    window.addEventListener("scroll", updatePickerPosition, true);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updatePickerPosition);
      window.removeEventListener("scroll", updatePickerPosition, true);
    };
  }, [isPickerOpen]);

  return (
    <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex flex-wrap gap-2">
        {presets.map((option) => (
          <button
            key={option.value}
            type="button"
            ref={option.value === "custom" ? customButtonRef : undefined}
            onClick={() => {
              if (option.value === "custom") {
                if (preset === "custom" && isPickerOpen) {
                  setIsPickerOpen(false);
                } else {
                  onPresetChange(option.value);
                  updatePickerPosition();
                  setIsPickerOpen(true);
                }
                return;
              }

              onPresetChange(option.value);
              setIsPickerOpen(false);
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
              preset === option.value
                ? "border-sky-400/60 bg-sky-400/20 text-sky-200 shadow-[0_8px_20px_rgba(56,189,248,0.25)]"
                : "border-white/10 bg-white/5 text-slate-200 hover:border-sky-200/30 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isPickerOpen && (
        <div
          ref={pickerRef}
          style={{ top: pickerPosition.top, left: pickerPosition.left }}
          className="fixed z-50 w-[260px] rounded-2xl border border-white/15 bg-slate-900/95 p-4 text-slate-100 shadow-[0_20px_60px_rgba(8,47,73,0.4)] backdrop-blur"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
              Custom Range
            </p>
            <button
              className="text-xs text-sky-300 hover:text-sky-200"
              onClick={() => setIsPickerOpen(false)}
            >
              Close
            </button>
          </div>

          <div className="mt-4 space-y-3 text-xs">
            <label className="flex flex-col gap-1 text-slate-300">
              From
              <input
                type="date"
                value={customStart}
                ref={startInputRef}
                onChange={(event) =>
                  onCustomChange({ start: event.target.value, end: customEnd })
                }
                className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white shadow-inner focus:border-sky-400 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-slate-300">
              To
              <input
                type="date"
                value={customEnd}
                ref={endInputRef}
                onChange={(event) =>
                  onCustomChange({ start: customStart, end: event.target.value })
                }
                className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white shadow-inner focus:border-sky-400 focus:outline-none"
              />
            </label>
          </div>

          <button
            className="mt-4 w-full rounded-lg border border-sky-400/40 bg-sky-400/20 px-3 py-2 text-sm font-semibold text-sky-100 hover:border-sky-300/60 hover:text-white"
            onClick={() => setIsPickerOpen(false)}
          >
            Apply range
          </button>
        </div>
      )}
    </div>
  );
}


