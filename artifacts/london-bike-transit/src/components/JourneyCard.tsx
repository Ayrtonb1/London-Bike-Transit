import { Bike, Train, Bus, TrainFront, PersonStanding, Zap } from "lucide-react";
import type { Journey } from "@/lib/transit";
import { Badge } from "@/components/ui/badge";

interface JourneyCardProps {
  journey: Journey;
  isSelected: boolean;
  onClick: () => void;
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

function getModeIcon(mode: string, lineId?: string) {
  switch (mode) {
    case "cycle":
      return <Bike className="w-4 h-4" />;
    case "tube":
      return <Train className="w-4 h-4" />;
    case "bus":
      return <Bus className="w-4 h-4" />;
    case "overground":
    case "elizabeth-line":
    case "national-rail":
    case "dlr":
      return <TrainFront className="w-4 h-4" />;
    case "walking":
      return <PersonStanding className="w-4 h-4" />;
    default:
      return <PersonStanding className="w-4 h-4" />;
  }
}

function getModeColor(mode: string, lineId?: string): string {
  if (mode === "cycle") return "#16a34a"; // bright green
  if (mode === "tube" && lineId && TUBE_COLORS[lineId]) return TUBE_COLORS[lineId];
  if (mode === "bus") return "#dc2626"; // red
  if (mode === "overground") return "#ea580c"; // orange
  if (mode === "elizabeth-line") return "#9333ea"; // purple
  if (mode === "dlr") return "#0d9488"; // teal
  if (mode === "national-rail") return "#57534e"; // grey
  return "#71717a"; // fallback grey
}

export function JourneyCard({ journey, isSelected, onClick }: JourneyCardProps) {
  const timeSaved = journey.originalDurationMinutes - journey.totalDurationMinutes;

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card hover:border-primary/50 hover:shadow-sm"
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight">
            {journey.totalDurationMinutes}
          </span>
          <span className="text-muted-foreground font-medium">min</span>
        </div>
        {timeSaved > 0 && (
          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 font-bold border-0">
            <Zap className="w-3 h-3 mr-1 fill-current" />
            Saved {timeSaved} min
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {journey.legs.map((leg, i) => (
          <div key={i} className="flex items-center">
            {i > 0 && <div className="w-4 h-px bg-border mx-1" />}
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-white shadow-sm ${
                leg.isSubstituted ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
              }`}
              style={{ backgroundColor: getModeColor(leg.mode, leg.lineId) }}
              title={leg.instruction}
            >
              {getModeIcon(leg.mode, leg.lineId)}
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground font-medium leading-relaxed">
        {journey.summary}
      </p>
    </div>
  );
}
