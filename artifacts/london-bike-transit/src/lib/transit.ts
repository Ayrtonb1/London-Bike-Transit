import { isJourneyViableNow } from "./bikeRules";

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

const CYCLING_SPEED_M_PER_MIN = 250;

function cycleDuration(distanceMeters: number): number {
  return Math.max(1, Math.round(distanceMeters / CYCLING_SPEED_M_PER_MIN));
}

function walkingDistanceEstimate(durationMinutes: number): number {
  return durationMinutes * 80;
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
    const raw = JSON.parse(lineString) as [number, number][];
    return raw;
  } catch {
    return [];
  }
}

// UK postcode detection (full or partial outward code)
// Matches: E1, E1W, SW1A, EC1V, E1W 1AB, SW1A 2AA, etc.
const UK_POSTCODE_RE = /^[A-Z]{1,2}[0-9][0-9A-Z]?(\s*[0-9][A-Z]{2})?$/i;

function isUkPostcode(query: string): boolean {
  return UK_POSTCODE_RE.test(query.trim());
}

function normalisePostcode(query: string): string {
  const trimmed = query.trim().toUpperCase().replace(/\s+/g, " ");
  // Insert space if full postcode has no space (e.g. "E1W1AB" → "E1W 1AB")
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
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${url.toString()}`, {
    headers: { "Accept-Language": "en" },
  });
  if (!res.ok) return [];
  return res.json();
}

function toPlace(item: NominatimItem): Place {
  const parts = item.display_name.split(",").map((p) => p.trim());

  // Build a human-readable name: skip lone numbers, combine meaningful parts
  const meaningfulParts: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    // Stop at country-level terms
    if (["England", "United Kingdom", "UK", "Greater London"].includes(part)) break;
    meaningfulParts.push(part);
    // After collecting up to 3 good segments, stop
    if (meaningfulParts.length >= 3) break;
  }

  // If first part is just a number (house number), prefix next part
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

export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const LONDON_VIEWBOX = "-0.5103,51.2868,0.3340,51.6919";

  if (isUkPostcode(q)) {
    const postcode = normalisePostcode(q);
    // Postcodes: search without London suffix or bounding — postcodes are precise
    const [postcodeResults, addressResults] = await Promise.all([
      nominatimSearch({ q: `${postcode}, UK`, countrycodes: "gb", limit: "6" }),
      // Also try as address to catch specific street addresses with this postcode
      nominatimSearch({ q: postcode, countrycodes: "gb", limit: "6" }),
    ]);
    const combined = deduplicatePlaces([...postcodeResults, ...addressResults].map(toPlace));
    return combined.slice(0, 8);
  }

  // Regular query: run three searches in parallel for best coverage
  const [boundedResults, unboundedResults, postcodeHintResults] = await Promise.all([
    // 1. Standard London-bounded search
    nominatimSearch({
      q: `${q}, London`,
      countrycodes: "gb",
      limit: "8",
      bounded: "1",
      viewbox: LONDON_VIEWBOX,
    }),
    // 2. Unbounded UK search (catches addresses that fall just outside viewbox)
    nominatimSearch({
      q: `${q}, London`,
      countrycodes: "gb",
      limit: "6",
    }),
    // 3. If query ends with a London postcode area, try a postcode search too
    q.match(/[A-Z]{1,2}\d[0-9A-Z]?\s*\d[A-Z]{2}$/i)
      ? nominatimSearch({ q, countrycodes: "gb", limit: "4" })
      : Promise.resolve([] as NominatimItem[]),
  ]);

  const all = deduplicatePlaces(
    [...boundedResults, ...unboundedResults, ...postcodeHintResults].map(toPlace)
  );

  // Score: prefer results within or near London bounds
  const LONDON_LAT_MIN = 51.28, LONDON_LAT_MAX = 51.7;
  const LONDON_LON_MIN = -0.52, LONDON_LON_MAX = 0.34;
  const inLondon = (p: Place) =>
    p.lat >= LONDON_LAT_MIN && p.lat <= LONDON_LAT_MAX &&
    p.lon >= LONDON_LON_MIN && p.lon <= LONDON_LON_MAX;

  const sorted = [...all].sort((a, b) => {
    const aIn = inLondon(a) ? 0 : 1;
    const bIn = inLondon(b) ? 0 : 1;
    return aIn - bIn;
  });

  return sorted.slice(0, 8);
}

type TflLeg = {
  duration: number;
  mode: { id: string };
  instruction: { summary: string };
  departurePoint: { commonName: string };
  arrivalPoint: { commonName: string };
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

export async function planRoute(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  fromName?: string,
  toName?: string
): Promise<RouteResponse> {
  const url = new URL(
    `https://api.tfl.gov.uk/Journey/JourneyResults/${fromLat}%2C${fromLon}/to/${toLat}%2C${toLon}`
  );
  url.searchParams.set(
    "mode",
    "tube,bus,national-rail,overground,elizabeth-line,dlr,walking,river-bus"
  );
  url.searchParams.set("walkingSpeed", "fast");
  url.searchParams.set("journeyPreference", "LeastTime");
  url.searchParams.set("alternativeJourneys", "true");

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`TfL API error: ${response.status}`);
  }

  const tflData = await response.json();
  const tflJourneys: TflJourney[] = tflData.journeys ?? [];

  // Build all journeys first
  const allJourneys = tflJourneys.map((j, i) => buildJourney(j, i));

  const totalCount = allJourneys.length;

  // Filter to only viable journeys given current time + bike rules
  const now = new Date();
  const viableJourneys = allJourneys.filter((j) =>
    isJourneyViableNow(j.legs, now)
  );

  // Re-index IDs after filtering so they're sequential
  const journeys = viableJourneys.slice(0, 4).map((j, i) => ({
    ...j,
    id: `journey-${i}`,
  }));

  return {
    journeys,
    fromName: fromName ?? `${fromLat}, ${fromLon}`,
    toName: toName ?? `${toLat}, ${toLon}`,
    filteredCount: totalCount - viableJourneys.length,
  };
}
