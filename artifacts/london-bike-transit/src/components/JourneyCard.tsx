import { Bike, Train, Bus, TrainFront, Zap, AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";
import type { Journey } from "@/lib/transit";
import { getBikeRestriction } from "@/lib/bikeRules";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface JourneyCardProps {
  journey: Journey;
  isSelected: boolean;
  onClick: () => void;
  /** Duration of the cycle-only fallback journey — used as the consistent
   *  baseline for the "X min faster" badge so all cards compare against the
   *  same reference rather than each journey's own original TfL estimate. */
  cycleOnlyMinutes?: number;
}

const TUBE_COLORS: Record<string, string> = {
  bakerloo: "#B36305",
  central: "#E32017",
  circle: "#FFD300",
  district: "#00782A",
  "hammersmith-city": "#F3A9BB",
  jubilee: "#A0A5A9",
  metropolitan: "#9B0056",
  northern: "#000000",
  piccadilly: "#003688",
  victoria: "#0098D4",
  "waterloo-city": "#95CDBA",
};

function getModeIcon(mode: string) {
  switch (mode) {
    case "cycle": return <Bike className="w-3.5 h-3.5" />;
    case "tube":
    case "overground":
    case "elizabeth-line":
    case "dlr":
    case "national-rail": return <Train className="w-3.5 h-3.5" />;
    case "bus": return <Bus className="w-3.5 h-3.5" />;
    default: return <TrainFront className="w-3.5 h-3.5" />;
  }
}

function getModeColor(mode: string, lineId?: string): string {
  if (mode === "cycle") return "#16a34a";
  if (mode === "tube" && lineId && TUBE_COLORS[lineId]) return TUBE_COLORS[lineId];
  if (mode === "bus") return "#dc2626";
  if (mode === "overground") return "#ea580c";
  if (mode === "elizabeth-line") return "#9333ea";
  if (mode === "dlr") return "#0d9488";
  if (mode === "national-rail") return "#57534e";
  return "#71717a";
}

function RestrictionBadge({ allowed, label }: { allowed: string; label: string }) {
  if (allowed === "yes") return null;
  if (allowed === "no") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
        <XCircle className="w-3 h-3" />
        {label}
      </span>
    );
  }
  if (allowed === "partial") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">
        <AlertTriangle className="w-3 h-3" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
      <AlertTriangle className="w-3 h-3" />
      {label}
    </span>
  );
}

function formatTime(iso?: string): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return null;
  }
}

export function JourneyCard({ journey, isSelected, onClick, cycleOnlyMinutes }: JourneyCardProps) {
  const [expandedLeg, setExpandedLeg] = useState<number | null>(null);
  // "Faster than cycling the whole way" — consistent baseline for all cards.
  // Only show on non-cycle-only journeys where transit actually saves time.
  const timeSaved =
    journey.summary !== "Cycle only" && cycleOnlyMinutes != null
      ? cycleOnlyMinutes - journey.totalDurationMinutes
      : 0;
  const depTime = formatTime(journey.departureTime);
  const arrTime = formatTime(journey.arrivalTime);

  const restrictions = journey.legs.map((leg) =>
    getBikeRestriction(leg.mode, leg.lineId, leg.fromName, leg.toName)
  );

  const hasRestrictions = restrictions.some((r) => r.allowed !== "yes");
  const hasBan = restrictions.some((r) => r.allowed === "no");

  return (
    <div
      className={`rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? "border-primary bg-primary/5 shadow-md"
          : hasBan
          ? "border-red-200 bg-red-50/30 hover:border-red-300"
          : hasRestrictions
          ? "border-amber-200 bg-amber-50/20 hover:border-amber-300"
          : "border-border bg-card hover:border-primary/50 hover:shadow-sm"
      }`}
      data-testid={`card-journey-${journey.id}`}
    >
      <div className="p-4" onClick={onClick}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">
                {journey.totalDurationMinutes}
              </span>
              <span className="text-muted-foreground font-medium">min</span>
            </div>
            {depTime && arrTime && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-semibold text-foreground">{depTime}</span>
                <span className="text-xs text-muted-foreground">→</span>
                <span className="text-xs font-semibold text-foreground">{arrTime}</span>
              </div>
            )}
            {(journey.summary === "Cycle only" || journey.farePence !== undefined) && (
              <div className="mt-1">
                <span className="inline-block text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {journey.summary === "Cycle only"
                    ? "Free"
                    : `~£${(journey.farePence! / 100).toFixed(2)} Oyster`}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            {timeSaved > 0 && (
              <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 font-bold border-0 text-xs">
                <Zap className="w-3 h-3 mr-1 fill-current" />
                {timeSaved} min vs cycling
              </Badge>
            )}
            {hasBan && (
              <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200 font-semibold text-xs">
                <XCircle className="w-3 h-3 mr-1" />
                Bike restrictions
              </Badge>
            )}
            {!hasBan && hasRestrictions && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 font-semibold text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Off-peak only
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          {journey.legs.map((leg, i) => (
            <div key={i} className="flex items-center">
              {i > 0 && <div className="w-3 h-px bg-border mx-1" />}
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-white shadow-sm ${
                  leg.isSubstituted ? "ring-2 ring-green-500 ring-offset-1 ring-offset-background" : ""
                }`}
                style={{ backgroundColor: getModeColor(leg.mode, leg.lineId) }}
                title={leg.instruction}
              >
                {getModeIcon(leg.mode)}
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-muted-foreground font-medium">{journey.summary}</p>
      </div>

      {isSelected && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Journey breakdown</p>
          {journey.legs.map((leg, i) => {
            const restriction = restrictions[i];
            const isExpanded = expandedLeg === i;
            const showDetail = restriction.allowed !== "yes";

            return (
              <div key={i} className="text-sm">
                <div
                  className={`flex items-start gap-3 p-2 rounded-lg ${showDetail ? "cursor-pointer hover:bg-muted/40" : ""}`}
                  onClick={(e) => {
                    if (showDetail) {
                      e.stopPropagation();
                      setExpandedLeg(isExpanded ? null : i);
                    }
                  }}
                >
                  <div
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white mt-0.5"
                    style={{ backgroundColor: getModeColor(leg.mode, leg.lineId) }}
                  >
                    {getModeIcon(leg.mode)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-xs leading-snug">{leg.instruction}</span>
                      {leg.lineName && (
                        <span className="text-xs text-muted-foreground">({leg.lineName})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {leg.durationMinutes} min
                        {leg.isSubstituted && (
                          <span className="ml-1 text-green-700 font-medium">· cycling replaces walk</span>
                        )}
                      </span>
                      <RestrictionBadge allowed={restriction.allowed} label={restriction.label} />
                      {showDetail && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Info className="w-3 h-3" />
                          {isExpanded ? "Less" : "Details"}
                        </span>
                      )}
                    </div>
                    {isExpanded && showDetail && (
                      <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5 leading-relaxed">
                        {restriction.detail}
                        {restriction.officialNote && (
                          <div className="mt-1.5 font-medium text-foreground/80">{restriction.officialNote}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {i < journey.legs.length - 1 && (
                  <div className="ml-5 pl-3 border-l border-dashed border-border/60 py-0.5">
                    <span className="text-xs text-muted-foreground">{leg.toName}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
