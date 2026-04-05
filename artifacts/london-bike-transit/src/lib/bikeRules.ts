export interface BikeRestriction {
  allowed: "yes" | "off-peak" | "no" | "partial";
  label: string;
  detail: string;
  officialNote?: string;
}

export interface PeakStatus {
  isPeak: boolean;
  label: string;
  detail: string;
  nextChange: string;
}

const PEAK_HOURS = [
  { start: 7 * 60 + 30, end: 9 * 60 + 30 },
  { start: 16 * 60, end: 19 * 60 },
];

export function getPeakStatus(date: Date = new Date()): PeakStatus {
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;

  if (isWeekend) {
    return {
      isPeak: false,
      label: "Weekend — bikes allowed",
      detail: "Non-folding bikes permitted on all eligible services all day on weekends.",
      nextChange: "Monday 07:30",
    };
  }

  const minutesSinceMidnight = date.getHours() * 60 + date.getMinutes();

  for (const { start, end } of PEAK_HOURS) {
    if (minutesSinceMidnight >= start && minutesSinceMidnight < end) {
      const endH = Math.floor(end / 60);
      const endM = end % 60;
      const endStr = `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
      return {
        isPeak: true,
        label: `Peak hours — bike restrictions apply`,
        detail: "Non-folding bikes are not permitted on most TfL services during peak hours (07:30–09:30 and 16:00–19:00, Mon–Fri).",
        nextChange: endStr,
      };
    }
  }

  return {
    isPeak: false,
    label: "Off-peak — bikes allowed",
    detail: "Non-folding bikes are currently permitted on eligible TfL services.",
    nextChange: minutesSinceMidnight < PEAK_HOURS[0].start ? "07:30" : minutesSinceMidnight < PEAK_HOURS[1].start ? "16:00" : "Monday 07:30",
  };
}

export function isOffPeakNow(date: Date = new Date()): boolean {
  return !getPeakStatus(date).isPeak;
}

const TUBE_PERMITTED_LINES = new Set([
  "circle",
  "district",
  "hammersmith-city",
  "metropolitan",
]);

const NORTHERN_LINE_PERMITTED_SECTIONS = [
  "High Barnet — East Finchley",
  "Edgware — Colindale",
  "Hendon Central — Golders Green",
];

export function getBikeRestriction(
  mode: string,
  lineId?: string,
  fromName?: string,
  toName?: string
): BikeRestriction {
  switch (mode) {
    case "cycle":
      return {
        allowed: "yes",
        label: "Cycling",
        detail: "Cycling leg — no restrictions.",
      };

    case "bus":
      return {
        allowed: "no",
        label: "Bikes not allowed",
        detail: "Non-folding bikes are never permitted on TfL buses. Folding bikes must be fully folded and stowed as luggage, with no space guaranteed.",
        officialNote: "TfL bus policy: non-folding bikes not permitted at any time.",
      };

    case "tube": {
      const line = (lineId ?? "").toLowerCase();
      if (TUBE_PERMITTED_LINES.has(line)) {
        return {
          allowed: "off-peak",
          label: "Off-peak only (weekdays)",
          detail: `The ${lineId ?? "tube"} line permits non-folding bikes off-peak: before 07:30, between 09:30–16:00, and after 19:00 Mon–Fri. Bikes are allowed all day on weekends and bank holidays.`,
          officialNote: "Permitted on Circle, District, Hammersmith & City, and Metropolitan lines off-peak.",
        };
      }
      if (line === "northern") {
        return {
          allowed: "partial",
          label: "Restricted — outer sections only",
          detail: `Non-folding bikes are only allowed on the Northern line at specific above-ground sections: ${NORTHERN_LINE_PERMITTED_SECTIONS.join("; ")}. The deep-tunnel sections through central London are banned at all times, including weekends.`,
          officialNote: "Northern line: bikes only permitted on above-ground outer sections.",
        };
      }
      return {
        allowed: "no",
        label: "Bikes not allowed on this section",
        detail: `Non-folding bikes are not permitted on the ${lineId ?? "tube"} line. This line runs through deep single-track tunnels where bikes cannot be carried safely. Only folding bikes (fully folded) are allowed.`,
        officialNote: "Deep-tunnel tube lines: non-folding bikes not permitted at any time.",
      };
    }

    case "overground":
      return {
        allowed: "off-peak",
        label: "Off-peak only",
        detail: "Non-folding bikes are allowed on London Overground off-peak only: not during 07:30–09:30 or 16:00–19:00 Mon–Fri. Exception: bikes are allowed on trains leaving Liverpool Street 07:30–09:30, and arriving Liverpool Street 16:00–19:00.",
        officialNote: "London Overground: non-folding bikes off-peak only.",
      };

    case "elizabeth-line":
      return {
        allowed: "off-peak",
        label: "Off-peak only",
        detail: "Non-folding bikes are permitted on many Elizabeth line off-peak services. Not allowed during peak hours (07:30–09:30 or 16:00–19:00, Mon–Fri). As of 31 March 2025, non-folding e-bikes are banned at all times.",
        officialNote: "Elizabeth line: non-folding bikes off-peak only; non-folding e-bikes banned since 31 March 2025.",
      };

    case "dlr":
      return {
        allowed: "off-peak",
        label: "Off-peak only (not Bank)",
        detail: "Non-folding bikes are allowed on the DLR off-peak, except to or from Bank station. Peak hours are 07:30–09:30 and 16:00–19:00, Mon–Fri. Non-folding e-bikes banned since 31 March 2025.",
        officialNote: "DLR: bikes off-peak only; not permitted at Bank station.",
      };

    case "national-rail":
      return {
        allowed: "off-peak",
        label: "Off-peak (reservation may be needed)",
        detail: "Non-folding bikes are generally allowed on National Rail off-peak services in SE England. Some operators require advance reservation of a bike space. Check your specific train operator's policy. Non-folding e-bikes are still allowed off-peak on National Rail (unlike TfL services).",
        officialNote: "National Rail: bikes off-peak; reservation may be required. E-bikes still permitted off-peak.",
      };

    case "river-bus":
    case "cable-car":
      return {
        allowed: "yes",
        label: "Bikes allowed",
        detail: "Non-folding bikes are permitted on river bus and boat services at all times.",
        officialNote: "TfL river services: bikes permitted at all times.",
      };

    case "walking":
      return {
        allowed: "yes",
        label: "Walking (replaced with cycling)",
        detail: "This walking leg has been replaced with a cycling time estimate.",
      };

    default:
      return {
        allowed: "yes",
        label: "Check operator",
        detail: "Please check the specific operator's bike policy for this service.",
      };
  }
}

export const ALL_MODE_RULES: Array<{
  mode: string;
  label: string;
  restriction: "yes" | "off-peak" | "no" | "partial";
  summary: string;
}> = [
  { mode: "bus", label: "Bus", restriction: "no", summary: "Non-folding bikes never permitted" },
  { mode: "tube-permitted", label: "Tube (Circle / District / Met / H&C)", restriction: "off-peak", summary: "Off-peak weekdays; all day weekends" },
  { mode: "tube-deep", label: "Tube (Central / Victoria / Jubilee / Piccadilly / Bakerloo)", restriction: "no", summary: "Non-folding bikes never permitted — deep tunnels" },
  { mode: "tube-northern", label: "Tube (Northern line)", restriction: "partial", summary: "Above-ground outer sections only (High Barnet–E. Finchley, Edgware–Colindale, Hendon Central–Golders Green)" },
  { mode: "overground", label: "Overground", restriction: "off-peak", summary: "Off-peak weekdays; all day weekends" },
  { mode: "elizabeth-line", label: "Elizabeth Line", restriction: "off-peak", summary: "Off-peak weekdays; all day weekends. E-bikes banned since March 2025" },
  { mode: "dlr", label: "DLR", restriction: "off-peak", summary: "Off-peak only; not at Bank station. E-bikes banned since March 2025" },
  { mode: "national-rail", label: "National Rail", restriction: "off-peak", summary: "Off-peak; may require advance reservation. E-bikes still permitted off-peak" },
  { mode: "river", label: "River / Boat", restriction: "yes", summary: "Bikes permitted at all times" },
];

export const PEAK_HOURS_TEXT = "07:30–09:30 and 16:00–19:00, Monday–Friday (excluding bank holidays)";

export function isLegViableNow(
  mode: string,
  lineId?: string,
  date: Date = new Date()
): boolean {
  const restriction = getBikeRestriction(mode, lineId);
  if (restriction.allowed === "yes" || restriction.allowed === "partial") return true;
  if (restriction.allowed === "no") return false;
  // off-peak: viable only if not currently peak
  return !getPeakStatus(date).isPeak;
}

export function isJourneyViableNow(
  legs: Array<{ mode: string; lineId?: string }>,
  date: Date = new Date()
): boolean {
  return legs.every((leg) => isLegViableNow(leg.mode, leg.lineId, date));
}
