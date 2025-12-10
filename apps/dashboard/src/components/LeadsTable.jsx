export function resolveSource(lead) {
  const utm = lead.metadata?.visitor?.utm;
  if (utm?.source) {
    const parts = [utm.source];
    if (utm.medium) parts.push(utm.medium);
    if (utm.campaign) parts.push(`#${utm.campaign}`);
    return parts.join(" · ");
  }

  if (lead.metadata?.visitor?.referrer) {
    try {
      return new URL(lead.metadata.visitor.referrer).hostname;
    } catch {
      return lead.metadata.visitor.referrer;
    }
  }

  return "Direct / Organic";
}

export function resolveLocation(lead) {
  const location = lead.metadata?.visitor?.location;
  if (!location) {
    return "Unknown";
  }

  const label = [location.city, location.region, location.country]
    .filter(Boolean)
    .join(", ");

  return label || "Unknown";
}

export function resolveWebsiteInfo(lead) {
  const microsite = lead.microsite || lead.metadata?.projectId || "—";
  const landingPage = lead.metadata?.visitor?.landingPage || "";
  const referrer = lead.metadata?.visitor?.referrer || "";

  let hostname = "";
  if (referrer) {
    try {
      hostname = new URL(referrer, referrer.startsWith("http") ? undefined : "https://placeholder.test").hostname;
    } catch {
      hostname = referrer;
    }
  }

  const hint = `${microsite} ${hostname} ${referrer}`.toLowerCase();
  let environment = "";
  if (/localhost|127\.0\.0\.1|local|dev/.test(hint)) {
    environment = "Local Preview";
  } else if (/staging|qa|test|preview/.test(hint)) {
    environment = "Staging";
  } else if (microsite && microsite !== "—") {
    environment = "Live Website";
  }

  const label =
    hostname && hostname !== "placeholder.test" ? hostname : microsite;

  return {
    label,
    environment,
    landingPage,
  };
}

export function LeadsTable({ leads }) {
  if (!leads.length) {
    return (
      <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-12 text-center text-slate-200 backdrop-blur">
        No leads yet. Embed the widget on your microsite to capture the first
        one.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 shadow-[0_35px_120px_rgba(8,47,73,0.35)] backdrop-blur">
      <div className="overflow-x-auto rounded-3xl">
        <table className="w-full min-w-[1100px] divide-y divide-white/10 text-left text-sm text-slate-100">
        <thead className="bg-white/8 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">
          <tr>
            <th className="px-4 py-4">#</th>
            <th className="px-5 py-4">Lead</th>
              <th className="px-5 py-4">Website</th>
            <th className="px-5 py-4">Interest</th>
            <th className="px-5 py-4">Source</th>
            <th className="px-5 py-4">Location</th>
            <th className="px-5 py-4">Captured</th>
            <th className="px-5 py-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {leads.map((lead, index) => {
            const rawId =
              (typeof lead.id === "string" && lead.id) ||
              (typeof lead._id === "string" && lead._id) ||
              String(index);
            const source = resolveSource(lead);
            const location = resolveLocation(lead);
            const website = resolveWebsiteInfo(lead);
            const websiteLabel = lead.metadata?.website
              ? String(lead.metadata.website)
              : website.label;
            const micrositeLabel = lead.microsite
              ? String(lead.microsite)
              : "";
            const showMicrositeLabel =
              micrositeLabel &&
              (!websiteLabel ||
                micrositeLabel.trim().toLowerCase() !==
                  websiteLabel.trim().toLowerCase());
            const campaign = lead.metadata?.visitor?.utm?.campaign;
            const medium = lead.metadata?.visitor?.utm?.medium;
            const landingPage = lead.metadata?.visitor?.landingPage;
            const referrer = lead.metadata?.visitor?.referrer;
            const timezone = lead.metadata?.visitor?.location?.timezone;
            const ip = lead.metadata?.visitor?.ip;
            const normalizedPhone =
              typeof lead.phone === "string" ? lead.phone.trim() : "";
            const phoneDialCode = lead.metadata?.phoneDialCode;
            const phoneSubscriber = lead.metadata?.phoneSubscriber;
            const formattedPhone = (() => {
              if (phoneDialCode && phoneSubscriber) {
                return `${phoneDialCode} ${phoneSubscriber}`;
              }
              if (normalizedPhone && /^\+\d{4,}$/.test(normalizedPhone)) {
                const dialCodeMatch = normalizedPhone.match(/^\+\d{1,4}/);
                if (dialCodeMatch) {
                  const dialCode = dialCodeMatch[0];
                  const subscriberPart = normalizedPhone.slice(dialCode.length);
                  return subscriberPart
                    ? `${dialCode} ${subscriberPart}`
                    : normalizedPhone;
                }
              }
              return normalizedPhone || "";
            })();
            const hasPhone = Boolean(formattedPhone);
            const telTarget =
              normalizedPhone ||
              (formattedPhone ? formattedPhone.replace(/\s+/g, "") : "");

            return (
              <tr
                key={rawId}
                className="transition hover:bg-white/5"
              >
                <td className="px-4 py-4 align-top text-center text-slate-300">
                  {index + 1}
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {hasPhone ? (
                        <a
                          href={`tel:${telTarget}`}
                          className="text-base font-semibold text-white hover:text-sky-300"
                        >
                          {formattedPhone}
                        </a>
                      ) : (
                        <span className="text-base font-semibold text-slate-200/80">
                          No phone provided
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300/80">
                      Lead ID: {rawId.slice(0, 8)}
                    </p>
                    {!hasPhone && (
                      <p className="text-xs text-slate-400/90">
                        No contact number submitted
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-slate-100">
                      {websiteLabel}
                    </span>
                    {website.environment && (
                      <span className="text-xs text-slate-400">
                        {website.environment}
                      </span>
                    )}
                    {showMicrositeLabel && (
                      <span className="font-medium text-slate-100">
                        {micrositeLabel}
                      </span>
                    )}
                    {website.landingPage && (
                      <span className="text-xs text-slate-500">
                        Page: {website.landingPage}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-slate-100">
                      {lead.bhkType}
                    </span>
                    {lead.metadata?.projectId && (
                      <span className="text-xs text-slate-300">
                        Project: {lead.metadata.projectId}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-slate-100">{source}</span>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                      {medium && (
                        <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[11px] uppercase tracking-[0.2em] text-slate-200">
                          {medium}
                        </span>
                      )}
                      {campaign && (
                        <span className="w-fit rounded-full border border-sky-400/40 bg-sky-400/15 px-2.5 py-0.5 text-xs font-semibold text-sky-100">
                          Campaign · {campaign}
                        </span>
                      )}
                      {referrer && (
                        <span className="max-w-[220px] truncate text-xs text-slate-400">
                          Referrer: {referrer}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-100">{location}</span>
                    {timezone && (
                      <p className="text-xs text-slate-400">{timezone}</p>
                    )}
                    {ip && (
                      <p className="text-xs text-slate-500">IP: {ip}</p>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 align-top text-slate-300">
                  {lead.createdAt
                    ? new Date(lead.createdAt).toLocaleString()
                    : "—"}
                </td>
                <td className="px-5 py-4 align-top">
                  <span className="rounded-full border border-sky-400/40 bg-sky-400/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">
                    {lead.status || "new"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        </table>
      </div>
    </div>
  );
}


