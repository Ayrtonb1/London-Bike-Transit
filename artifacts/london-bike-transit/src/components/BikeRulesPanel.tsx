import { useState } from "react";
import { ChevronDown, ChevronUp, Info, Clock } from "lucide-react";
import { ALL_MODE_RULES, PEAK_HOURS_TEXT, getPeakStatus } from "@/lib/bikeRules";

const RESTRICTION_COLORS: Record<string, string> = {
  yes: "bg-green-100 text-green-800 border-green-200",
  "off-peak": "bg-amber-100 text-amber-800 border-amber-200",
  no: "bg-red-100 text-red-800 border-red-200",
  partial: "bg-orange-100 text-orange-800 border-orange-200",
};

const RESTRICTION_LABELS: Record<string, string> = {
  yes: "Allowed",
  "off-peak": "Off-peak only",
  no: "Not allowed",
  partial: "Partial",
};

export function BikeRulesPanel() {
  const [open, setOpen] = useState(false);
  const peakStatus = getPeakStatus();

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
        data-testid="button-bike-rules-toggle"
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Info className="w-4 h-4 text-primary" />
          Bike rules on TfL
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              <strong>Peak hours:</strong> {PEAK_HOURS_TEXT}. Off-peak and weekends: non-folding bikes allowed on eligible services.
            </span>
          </div>

          <div className="space-y-2">
            {ALL_MODE_RULES.map((rule) => (
              <div key={rule.mode} className="flex items-start gap-2">
                <span
                  className={`mt-0.5 shrink-0 text-xs font-semibold px-2 py-0.5 rounded border ${RESTRICTION_COLORS[rule.restriction]}`}
                >
                  {RESTRICTION_LABELS[rule.restriction]}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-medium leading-snug">{rule.label}</div>
                  <div className="text-xs text-muted-foreground leading-snug">{rule.summary}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-xs text-muted-foreground border-t border-border pt-3">
            Non-folding e-bikes banned on Tube, Overground, Elizabeth line, and DLR since 31 March 2025. Folding bikes (fully folded) allowed on all services at all times.{" "}
            <a
              href="https://tfl.gov.uk/modes/cycling/cycles-on-public-transport"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Official TfL guidance
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
