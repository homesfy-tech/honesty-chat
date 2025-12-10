import { useMemo } from "react";

const DEFAULT_SCRIPT_SRC = "https://cdn.homesfy.com/widget.js";

export function InstallPage() {
  const snippet = useMemo(
    () =>
      `<script
  src="${DEFAULT_SCRIPT_SRC}"
  data-project="default"
  data-api-base-url="https://api.homesfy.com"
  async
></script>`,
    []
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">
          Install Script
        </h2>
        <p className="text-sm text-slate-500">
          Paste this snippet before the closing <code>&lt;/body&gt;</code> tag on
          any microsite or landing page.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-slate-100 shadow-lg">
        <pre className="text-sm leading-relaxed">{snippet}</pre>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">
          Installation Checklist
        </h3>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">
          <li>Verify the `data-project` attribute matches your widget config ID.</li>
          <li>Update `data-api-base-url` if you deploy the API to production.</li>
          <li>Ensure the script loads on every page where you want the chat bubble.</li>
          <li>Confirm the domain is added to allowed origins on the API.</li>
        </ul>
      </div>
    </div>
  );
}


