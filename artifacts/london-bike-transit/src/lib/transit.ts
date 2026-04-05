import { isJourneyViableNow, getPeakStatus } from "./bikeRules";

export interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  type: string;
}

export interface StopPoint {
  name: string;
  lat: number;
  lon: number;
}

export interface RouteLeg {
  mode: string;
  instruction: string;
  durationMinutes: number;
  distanceMeters: number;
  fromName: string;
  toName: string;
  originalMode?: string;
  isSubstituted?: boolean;
  lineId?: string;
  lineName?: string;
  stopPoints?: StopPoint[];
  polyline?: [number, number][];
}

export interface Journey {
  id: string;
  totalDurationMinutes: number;
  originalDurationMinutes: number;
  cyclingDurationMinutes: number;
  legs: RouteLeg[];
  departureTime?: string;
  arrivalTime?: string;
  summary: string;
}

export interface RouteResponse {
  journeys: Journey[];
  fromName: string;
  toName: string;
  filteredCount: number;
}

const CYCLING_SPEED_M_PER_MIN = 250; // ~15 km/h

function cycleDuration(distanceMeters: number): number {
  return Math.max(1, Math.round(distanceMeters / CYCLING_SPEED_M_PER_MIN));
}

function walkingDistanceEstimate(durationMinutes: number): number {
  return durationMinutes * 80; // ~4.8 km/h walking → ~80 m/min
}

function modeLabel(tflMode: string): string {
  const map: Record<string, string> = {
    tube: "tube",
    bus: "bus",
    "national-rail": "national-rail",
    "elizabeth-line": "elizabeth-line",
    dlr: "dlr",
    tflrail: "elizabeth-line",
    overground: "overground",
    walking: "walking",
    cycle: "cycle",
    "cable-car": "cable-car",
    "river-bus": "river-bus",
  };
  return map[tflMode.toLowerCase()] ?? tflMode.toLowerCase();
}

function decodeLineString(lineString: string): [number, number][] {
  try {
    return JSON.parse(lineString) as [number, number][];
  } catch {
    return [];
  }
}

function haversineMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ────────────────────────────────────────────────────────────────────────────
// SEARCH
// ────────────────────────────────────────────────────────────────────────────

const UK_POSTCODE_RE = /^[A-Z]{1,2}[0-9][0-9A-Z]?(\s*[0-9][A-Z]{2})?$/i;

function isUkPostcode(query: string): boolean {
  return UK_POSTCODE_RE.test(query.trim());
}

function normalisePostcode(query: string): string {
  const trimmed = query.trim().toUpperCase().replace(/\s+/g, " ");
  if (/^[A-Z]{1,2}[0-9][0-9A-Z]?[0-9][A-Z]{2}$/.test(trimmed)) {
    return trimmed.slice(0, -3) + " " + trimmed.slice(-3);
  }
  return trimmed;
}

type NominatimItem = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  category: string;
  type: string;
};

async function nominatimSearch(params: Record<string, string>): Promise<NominatimItem[]> {
  const url = new URLSearchParams({ format: "json", addressdetails: "1", ...params });
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${url.toString()}`, {
      headers: { "Accept-Language": "en" },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function toPlace(item: NominatimItem): Place {
  const parts = item.display_name.split(",").map((p) => p.trim());
  const meaningfulParts: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (["England", "United Kingdom", "UK", "Greater London"].includes(part)) break;
    meaningfulParts.push(part);
    if (meaningfulParts.length >= 3) break;
  }
  const name = meaningfulParts.join(", ") || parts[0];
  return {
    id: String(item.place_id),
    name,
    address: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    type: item.category || item.type || "place",
  };
}

function deduplicatePlaces(places: Place[]): Place[] {
  const seen = new Set<string>();
  return places.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

const LONDON_VIEWBOX = "-0.5103,51.2868,0.3340,51.6919";
const LONDON_LAT_MIN = 51.28, LONDON_LAT_MAX = 51.7;
const LONDON_LON_MIN = -0.52, LONDON_LON_MAX = 0.34;
const inLondon = (p: Place) =>
  p.lat >= LONDON_LAT_MIN && p.lat <= LONDON_LAT_MAX &&
  p.lon >= LONDON_LON_MIN && p.lon <= LONDON_LON_MAX;

export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  if (isUkPostcode(q)) {
    const postcode = normalisePostcode(q);
    const [a, b] = await Promise.all([
      nominatimSearch({ q: `${postcode}, UK`, countrycodes: "gb", limit: "6" }),
      nominatimSearch({ q: postcode, countrycodes: "gb", limit: "6" }),
    ]);
    return deduplicatePlaces([...a, ...b].map(toPlace)).slice(0, 8);
  }

  const [bounded, unbounded, postcodeHint] = await Promise.all([
    nominatimSearch({
      q: `${q}, London`,
      countrycodes: "gb",
      limit: "8",
      bounded: "1",
      viewbox: LONDON_VIEWBOX,
    }),
    nominatimSearch({ q: `${q}, London`, countrycodes: "gb", limit: "6" }),
    q.match(/[A-Z]{1,2}\d[0-9A-Z]?\s*\d[A-Z]{2}$/i)
      ? nominatimSearch({ q, countrycodes: "gb", limit: "4" })
      : Promise.resolve([] as NominatimItem[]),
  ]);

  const all = deduplicatePlaces([...bounded, ...unbounded, ...postcodeHint].map(toPlace));
  return [...all].sort((a, b) => (inLondon(a) ? 0 : 1) - (inLondon(b) ? 0 : 1)).slice(0, 8);
}

// ────────────────────────────────────────────────────────────────────────────
// ROUTE PLANNING
// ────────────────────────────────────────────────────────────────────────────

type TflLeg = {
  duration: number;
  mode: { id: string };
  instruction: { summary: string };
  departurePoint: { commonName: string; lat?: number; lon?: number };
  arrivalPoint: { commonName: string; lat?: number; lon?: number };
  distance?: number;
  routeOptions?: { lineIdentifier?: { id: string; name: string } }[];
  path?: {
    stopPoints?: { name?: string; commonName?: string; lat?: number; lon?: number }[];
    lineString?: string;
  };
};

type TflJourney = {
  duration: number;
  legs: TflLeg[];
  startDateTime?: string;
  arrivalDateTime?: string;
};

function buildJourney(journey: TflJourney, jIdx: number): Journey {
  let totalDuration = 0;
  const originalDuration = journey.duration;
  let cyclingDuration = 0;

  const legs: RouteLeg[] = journey.legs.map((leg) => {
    const mode = modeLabel(leg.mode.id);
    const isWalking = mode === "walking";
    const distanceMeters = leg.distance ?? walkingDistanceEstimate(leg.duration);

    let finalMode = mode;
    let finalDuration = leg.duration;
    let isSubstituted = false;

    if (isWalking) {
      finalMode = "cycle";
      finalDuration = cycleDuration(distanceMeters);
      isSubstituted = true;
      cyclingDuration += finalDuration;
    }

    totalDuration += finalDuration;

    const stopPoints: StopPoint[] = (leg.path?.stopPoints ?? []).map((sp) => ({
      name: sp.commonName ?? sp.name ?? "",
      lat: sp.lat ?? 0,
      lon: sp.lon ?? 0,
    }));

    const polyline: [number, number][] = leg.path?.lineString
      ? decodeLineString(leg.path.lineString)
      : [];

    const lineId = leg.routeOptions?.[0]?.lineIdentifier?.id;
    const lineName = leg.routeOptions?.[0]?.lineIdentifier?.name;

    return {
      mode: finalMode,
      instruction: isWalking
        ? `Cycle: ${leg.instruction?.summary ?? "proceed"}`
        : leg.instruction?.summary ?? `Take the ${lineName ?? mode}`,
      durationMinutes: finalDuration,
      distanceMeters,
      fromName: leg.departurePoint?.commonName ?? "Start",
      toName: leg.arrivalPoint?.commonName ?? "End",
      originalMode: isSubstituted ? "walking" : undefined,
      isSubstituted,
      lineId,
      lineName,
      stopPoints,
      polyline,
    };
  });

  const modes = [...new Set(legs.map((l) => l.mode).filter((m) => m !== "cycle"))];
  const summary = modes.length ? `Cycle + ${modes.join(" + ")}` : "Cycle only";

  return {
    id: `journey-${jIdx}`,
    totalDurationMinutes: totalDuration,
    originalDurationMinutes: originalDuration,
    cyclingDurationMinutes: cyclingDuration,
    legs,
    departureTime: journey.startDateTime,
    arrivalTime: journey.arrivalDateTime,
    summary,
  };
}

/** Stable signature for deduplication: transit legs only (cycles replace walks so we ignore them) */
function journeySignature(j: Journey): string {
  return j.legs
    .filter((l) => !l.isSubstituted && l.mode !== "cycle")
    .map((l) => `${l.mode}:${l.lineId ?? ""}:${l.fromName}→${l.toName}`)
    .join("|");
}

function deduplicateJourneys(journeys: Journey[]): Journey[] {
  const seen = new Set<string>();
  return journeys.filter((j) => {
    const sig = journeySignature(j);
    // Cycle-only journeys all share the same empty sig; keep only one
    if (!sig) {
      if (seen.has("__cycle_only__")) return false;
      seen.add("__cycle_only__");
      return true;
    }
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
}

function synthesisCycleJourney(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  fromLabel: string,
  toLabel: string
): Journey {
  const straightLine = haversineMetres(fromLat, fromLon, toLat, toLon);
  const roadEstimate = Math.round(straightLine * 1.4);
  const duration = cycleDuration(roadEstimate);
  return {
    id: "journey-cycle-only",
    totalDurationMinutes: duration,
    originalDurationMinutes: duration,
    cyclingDurationMinutes: duration,
    legs: [
      {
        mode: "cycle",
        instruction: `Cycle from ${fromLabel} to ${toLabel}`,
        durationMinutes: duration,
        distanceMeters: roadEstimate,
        fromName: fromLabel,
        toName: toLabel,
        isSubstituted: false,
      },
    ],
    summary: "Cycle only",
  };
}

function buildTflUrl(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  modes: string,
  preference: "LeastTime" | "LeastWalking" | "LeastInterchange" = "LeastTime"
): string {
  const url = new URL(
    `https://api.tfl.gov.uk/Journey/JourneyResults/${fromLat}%2C${fromLon}/to/${toLat}%2C${toLon}`
  );
  url.searchParams.set("mode", modes);
  url.searchParams.set("walkingSpeed", "fast");
  url.searchParams.set("journeyPreference", preference);
  url.searchParams.set("alternativeJourneys", "true");
  return url.toString();
}

async function fetchTflJourneys(url: string, offset: number): Promise<Journey[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.journeys ?? [] as TflJourney[]).map(
      (j: TflJourney, i: number) => buildJourney(j, offset + i)
    );
  } catch {
    return [];
  }
}

export async function planRoute(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  fromName?: string,
  toName?: string
): Promise<RouteResponse> {
  const fromLabel = fromName ?? `${fromLat}, ${fromLon}`;
  const toLabel = toName ?? `${toLat}, ${toLon}`;

  const { isPeak } = getPeakStatus();

  // All standard transit modes — may include non-viable ones (bus, deep tube)
  // These will be viability-filtered after building
  const ALL_MODES = "tube,bus,national-rail,overground,elizabeth-line,dlr,walking,river-bus";

  // Bike-friendly modes: excludes bus entirely.
  // During peak, also excludes off-peak-only services (overground, elizabeth-line, dlr)
  // so TfL routes through only currently-permitted services, then adds walking legs
  // (which we convert to cycling) for the last stretch to the destination.
  // This is the key mechanism for surfacing routes like "Overground to X, then cycle".
  const BIKE_FRIENDLY_MODES = isPeak
    ? "tube,national-rail,river-bus,walking"
    : "tube,overground,national-rail,elizabeth-line,dlr,river-bus,walking";

  // Fire all requests in parallel: 3 TfL calls (all modes, bike-friendly, cycle-only)
  const [allResults, bikeFriendlyResults, cycleResults] = await Promise.all([
    fetchTflJourneys(buildTflUrl(fromLat, fromLon, toLat, toLon, ALL_MODES, "LeastTime"), 0),
    fetchTflJourneys(buildTflUrl(fromLat, fromLon, toLat, toLon, BIKE_FRIENDLY_MODES, "LeastTime"), 100),
    fetchTflJourneys(buildTflUrl(fromLat, fromLon, toLat, toLon, "cycle,walking", "LeastTime"), 200),
  ]);

  const allRaw = [...allResults, ...bikeFriendlyResults, ...cycleResults];
  const totalCount = allRaw.length;

  // Filter to only journeys that are viable with a bike right now
  const now = new Date();
  const viable = allRaw.filter((j) => isJourneyViableNow(j.legs, now));

  // Deduplicate by transit-leg signature, then sort shortest first
  const deduped = deduplicateJourneys(viable).sort(
    (a, b) => a.totalDurationMinutes - b.totalDurationMinutes
  );

  // Always guarantee a cycle-only option as ultimate fallback
  const hasCycleOnly = deduped.some((j) => j.summary === "Cycle only");
  if (!hasCycleOnly) {
    const fallback = synthesisCycleJourney(fromLat, fromLon, toLat, toLon, fromLabel, toLabel);
    const insertAt = deduped.findIndex(
      (j) => j.totalDurationMinutes > fallback.totalDurationMinutes
    );
    if (insertAt === -1) deduped.push(fallback);
    else deduped.splice(insertAt, 0, fallback);
  }

  const journeys = deduped.slice(0, 5).map((j, i) => ({ ...j, id: `journey-${i}` }));

  return {
    journeys,
    fromName: fromLabel,
    toName: toLabel,
    filteredCount: totalCount - viable.length,
  };
}
