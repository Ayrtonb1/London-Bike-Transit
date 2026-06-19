import { isJourneyViableNow, isLegViableNow, getPeakStatus } from "./bikeRules";

/**
 * Base URL for TfL API calls.
 * Browser: proxy through /api/tfl (avoids CORS restrictions on Replit/web).
 * Capacitor iOS native: call TfL directly (no CORS restriction in WKWebView).
 */
function _getTflBase(): string {
  if (typeof window === "undefined") return "https://api.tfl.gov.uk";
  if (window.location.protocol === "capacitor:") return "https://api.tfl.gov.uk";
  return `${window.location.origin}/api/tfl`;
}
const TFL_BASE = _getTflBase();

export interface PlanningTime {
  mode: "now" | "depart" | "arrive";
  date: string; // YYYYMMDD
  time: string; // HHMM
}

/** Convert a PlanningTime to a JS Date for peak-status and viability checks. */
export function planningTimeToDate(pt?: PlanningTime): Date {
  if (!pt || pt.mode === "now" || !pt.date || !pt.time) return new Date();
  const year = parseInt(pt.date.slice(0, 4));
  const month = parseInt(pt.date.slice(4, 6)) - 1;
  const day = parseInt(pt.date.slice(6, 8));
  const hours = parseInt(pt.time.slice(0, 2));
  const mins = parseInt(pt.time.slice(2, 4));
  return new Date(year, month, day, hours, mins);
}

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
  fromLat?: number;
  fromLon?: number;
  toLat?: number;
  toLon?: number;
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
  farePence?: number; // Oyster/contactless fare in pence, if TfL returned it
}

export interface RouteResponse {
  journeys: Journey[];
  fromName: string;
  toName: string;
  filteredCount: number;
  /** Duration of cycling the whole journey — always computed as a baseline for
   *  the "X min vs cycling" badge, even if the cycle-only card is outside top 5. */
  cycleOnlyMinutes: number;
}

const CYCLING_SPEED_M_PER_MIN = 250; // ~15 km/h

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

// ── Nominatim (kept for postcode-only path) ───────────────────────────────

type NominatimItem = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  category: string;
  type: string;
};

let _nominatimLastCall = 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _nominatimQueue: Promise<any> = Promise.resolve();

async function nominatimSearch(params: Record<string, string>): Promise<NominatimItem[]> {
  const url = new URLSearchParams({ format: "json", addressdetails: "1", ...params });
  const result = await (_nominatimQueue = _nominatimQueue.then(async () => {
    const wait = Math.max(0, 350 - (Date.now() - _nominatimLastCall));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    _nominatimLastCall = Date.now();
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${url.toString()}`, {
        headers: { "Accept-Language": "en" },
      });
      if (!res.ok) return [] as NominatimItem[];
      return res.json() as Promise<NominatimItem[]>;
    } catch {
      return [] as NominatimItem[];
    }
  }));
  return result;
}

function nominatimToPlace(item: NominatimItem): Place {
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

const LONDON_LAT_MIN = 51.28, LONDON_LAT_MAX = 51.7;
const LONDON_LON_MIN = -0.52, LONDON_LON_MAX = 0.34;
const LONDON_VIEWBOX = "-0.5103,51.2868,0.3340,51.6919";

// ── TfL StopPoint search — best for tube/rail/bus station names ───────────

async function tflStopSearch(query: string): Promise<Place[]> {
  const url =
    `${TFL_BASE}/StopPoint/Search/${encodeURIComponent(query)}` +
    `?modes=tube,overground,dlr,elizabeth-line,national-rail,bus&maxResults=5`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.matches ?? [])
      .filter((s: any) =>
        typeof s.lat === "number" && typeof s.lon === "number" &&
        // Strictly restrict to the London bounding box — TfL's search
        // returns national rail stops from any UK city (e.g. "Manchester
        // Victoria") which would break routing completely.
        s.lat >= LONDON_LAT_MIN && s.lat <= LONDON_LAT_MAX &&
        s.lon >= LONDON_LON_MIN && s.lon <= LONDON_LON_MAX
      )
      .slice(0, 5)
      .map((s: any, i: number): Place => ({
        id: `tfl-${s.id}-${i}`,
        name: s.name,
        address: (s.modes as string[] ?? [])
          .map((m: string) => m.replace(/-/g, " "))
          .join(" · "),
        lat: s.lat,
        lon: s.lon,
        type: "station",
      }));
  } catch {
    return [];
  }
}

// ── Deduplication helpers ─────────────────────────────────────────────────

function deduplicatePlaces(places: Place[]): Place[] {
  const seen = new Set<string>();
  return places.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

/** Remove results whose coordinates round to the same 3-decimal cell as an already-kept result. */
function deduplicateByCoords(places: Place[]): Place[] {
  const seen = new Set<string>();
  return places.filter((p) => {
    const key = `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Public search entry point ─────────────────────────────────────────────

export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // Postcode: Nominatim is excellent here, keep it
  if (isUkPostcode(q)) {
    const postcode = normalisePostcode(q);
    const [a, b] = await Promise.all([
      nominatimSearch({ q: `${postcode}, UK`, countrycodes: "gb", limit: "6" }),
      nominatimSearch({ q: postcode, countrycodes: "gb", limit: "6" }),
    ]);
    return deduplicatePlaces([...a, ...b].map(nominatimToPlace)).slice(0, 8);
  }

  // General search: Nominatim (addresses, always London-biased) + TfL (stations) in parallel.
  // Nominatim with viewbox+bounded=1 strongly restricts results to Greater London,
  // giving the same reliable coordinates the routing was tuned against.
  const [nominatimResults, tflResults] = await Promise.all([
    nominatimSearch({
      q: `${q}, London`,
      countrycodes: "gb",
      viewbox: LONDON_VIEWBOX,
      bounded: "1",
      limit: "6",
    }),
    tflStopSearch(q),
  ]);

  // TfL station results first (exact GPS stop coordinates), then Nominatim addresses.
  // Deduplicate by coordinates so the same place doesn't appear twice.
  return deduplicateByCoords([
    ...tflResults,
    ...nominatimResults.map(nominatimToPlace),
  ]).slice(0, 8);
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fare?: { totalCost?: number; [k: string]: any };
};

// TfL StopPoint structure
type TflStopPoint = {
  id: string;
  commonName: string;
  lat: number;
  lon: number;
  modes: string[];
  lines: { id: string; name: string }[];
};

function buildJourney(
  journey: TflJourney,
  jIdx: number,
  opts: { substituteWalking?: boolean } = {},
): Journey {
  const substituteWalking = opts.substituteWalking ?? true;
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

    if (isWalking && substituteWalking) {
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
      fromLat: leg.departurePoint?.lat,
      fromLon: leg.departurePoint?.lon,
      toLat: leg.arrivalPoint?.lat,
      toLon: leg.arrivalPoint?.lon,
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
    legs: mergeConsecutiveCycleLegs(legs),
    departureTime: journey.startDateTime,
    arrivalTime: journey.arrivalDateTime,
    summary,
    farePence: journey.fare?.totalCost ?? undefined,
  };
}

/**
 * Merge adjacent cycling legs into a single leg.
 * Avoids UI clutter from short "walk converted to cycle" stubs sitting
 * immediately beside explicit cycling legs added by prependCycleLeg /
 * appendCycleLeg.
 */
function mergeConsecutiveCycleLegs(legs: RouteLeg[]): RouteLeg[] {
  const result: RouteLeg[] = [];
  for (const leg of legs) {
    const prev = result[result.length - 1];
    if (prev && prev.mode === "cycle" && leg.mode === "cycle") {
      // Merge: accumulate distance and duration, keep fromName of first leg
      // and toName of the incoming leg. Keep isSubstituted only if BOTH are.
      result[result.length - 1] = {
        ...prev,
        durationMinutes: prev.durationMinutes + leg.durationMinutes,
        distanceMeters: prev.distanceMeters + leg.distanceMeters,
        toName: leg.toName,
        toLat: leg.toLat,
        toLon: leg.toLon,
        instruction: prev.isSubstituted && leg.isSubstituted
          ? prev.instruction
          : leg.isSubstituted
          ? prev.instruction
          : leg.instruction,
        isSubstituted: prev.isSubstituted && leg.isSubstituted,
        // Concatenate polylines if available
        polyline: [...(prev.polyline ?? []), ...(leg.polyline ?? [])],
      };
    } else {
      result.push(leg);
    }
  }
  return result;
}

/** Prepend a cycling leg (cycle to boarding stop) and merge any resulting adjacent cycle legs. */
function prependCycleLeg(
  journey: Journey,
  fromLabel: string,
  toStopName: string,
  distanceMeters: number,
  fromLat?: number,
  fromLon?: number,
  toLat?: number,
  toLon?: number
): Journey {
  const durationMinutes = cycleDuration(distanceMeters);
  const cycleLeg: RouteLeg = {
    mode: "cycle",
    instruction: `Cycle to ${toStopName}`,
    durationMinutes,
    distanceMeters,
    fromName: fromLabel,
    toName: toStopName,
    fromLat,
    fromLon,
    toLat,
    toLon,
    isSubstituted: false,
  };
  const allLegs = mergeConsecutiveCycleLegs([cycleLeg, ...journey.legs]);
  const transitModes = [
    ...new Set(allLegs.map((l) => l.mode).filter((m) => m !== "cycle")),
  ];
  const summary =
    transitModes.length > 0
      ? `Cycle + ${transitModes.join(" + ")} + cycle`
      : "Cycle only";
  return {
    ...journey,
    totalDurationMinutes: journey.totalDurationMinutes + durationMinutes,
    cyclingDurationMinutes: journey.cyclingDurationMinutes + durationMinutes,
    legs: allLegs,
    summary,
  };
}

/** Append a final cycling leg (cycle from alighting stop) and merge any adjacent cycle legs. */
function appendCycleLeg(
  journey: Journey,
  fromStopName: string,
  toLabel: string,
  distanceMeters: number,
  fromLat?: number,
  fromLon?: number,
  toLat?: number,
  toLon?: number
): Journey {
  const durationMinutes = cycleDuration(distanceMeters);
  const cycleLeg: RouteLeg = {
    mode: "cycle",
    instruction: `Cycle to ${toLabel}`,
    durationMinutes,
    distanceMeters,
    fromName: fromStopName,
    toName: toLabel,
    fromLat,
    fromLon,
    toLat,
    toLon,
    isSubstituted: false,
  };
  const allLegs = mergeConsecutiveCycleLegs([...journey.legs, cycleLeg]);
  const transitModes = [
    ...new Set(allLegs.map((l) => l.mode).filter((m) => m !== "cycle")),
  ];
  const summary =
    transitModes.length > 0
      ? `Cycle + ${transitModes.join(" + ")} + cycle`
      : "Cycle only";
  return {
    ...journey,
    totalDurationMinutes: journey.totalDurationMinutes + durationMinutes,
    cyclingDurationMinutes: journey.cyclingDurationMinutes + durationMinutes,
    legs: allLegs,
    summary,
  };
}

/** Deduplication signature: only looks at transit legs (not cycling legs) */
function journeySignature(j: Journey): string {
  const transitLegs = j.legs.filter(
    (l) => l.mode !== "cycle" && l.mode !== "walking"
  );
  if (transitLegs.length === 0) return "__cycle_only__";
  // Key on the sequence of lines only — not the specific boarding/alighting stops.
  // This collapses "Windrush (board H&I, alight Shadwell)" and
  // "Windrush (board H&I, alight Whitechapel)" into one group, keeping the
  // fastest variant. Genuinely different routes (different line combinations
  // or ordering) still get distinct signatures.
  return transitLegs
    .map((l) => `${l.mode}:${l.lineId ?? l.mode}`)
    .join("|");
}

function deduplicateJourneys(journeys: Journey[]): Journey[] {
  // Sort fastest-first so the best (shortest) variant of each transit-line
  // sequence wins its slot. The final ranking by journeyScore (with change
  // penalty) happens in planRoute after dedup.
  const sorted = [...journeys].sort(
    (a, b) => a.totalDurationMinutes - b.totalDurationMinutes
  );
  const seen = new Set<string>();
  return sorted.filter((j) => {
    const sig = journeySignature(j);
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
        // Coords are required so Map.tsx can draw the leg AND so Home.tsx
        // can fetch the real road-following polyline for it. Without these
        // the cycle-only journey was rendered as nothing at all (and the
        // polyline fetch never ran).
        fromLat,
        fromLon,
        toLat,
        toLon,
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
  planningTime?: PlanningTime
): string {
  const url = new URL(
    `${TFL_BASE}/Journey/JourneyResults/${fromLat}%2C${fromLon}/to/${toLat}%2C${toLon}`
  );
  url.searchParams.set("mode", modes);
  url.searchParams.set("walkingSpeed", "fast");
  url.searchParams.set("journeyPreference", "LeastTime");
  url.searchParams.set("alternativeJourneys", "true");
  if (planningTime && planningTime.mode !== "now" && planningTime.date && planningTime.time) {
    url.searchParams.set("date", planningTime.date);
    url.searchParams.set("time", planningTime.time);
    url.searchParams.set(
      "timeIs",
      planningTime.mode === "arrive" ? "Arriving" : "Departing"
    );
  }
  return url.toString();
}

// Per-request budget for any single TfL call on the search critical path.
// Without this, one slow request stalls the entire `Promise.all` pipeline and
// drives total search time to 15s+ on cellular. 6s is generous enough that
// healthy calls always succeed while killing the long tail.
const TFL_REQUEST_TIMEOUT_MS = 6000;

async function fetchWithTimeout(
  url: string,
  timeoutMs = TFL_REQUEST_TIMEOUT_MS,
): Promise<Response | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTflJourneys(
  url: string,
  offset: number,
  opts: { substituteWalking?: boolean } = {},
): Promise<Journey[]> {
  const attempt = async (): Promise<Response | null> => {
    const res = await fetchWithTimeout(url);
    // Retry once on 429 (TfL rate limit) after a short back-off
    if (res?.status === 429) {
      await new Promise((r) => setTimeout(r, 1500));
      return fetchWithTimeout(url);
    }
    return res;
  };
  try {
    const res = await attempt();
    if (!res || !res.ok) return [];
    const data = await res.json();
    return (data.journeys ?? [] as TflJourney[]).map(
      (j: TflJourney, i: number) => buildJourney(j, offset + i, opts)
    );
  } catch {
    return [];
  }
}

/**
 * Build a stable cache key for a cycle leg's start/end coords. Rounded to 4
 * decimal places (~11m precision) so tiny floating-point noise doesn't cause
 * cache misses for what is effectively the same route.
 */
export function cyclePolylineKey(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): string {
  const r = (n: number) => n.toFixed(4);
  return `${r(fromLat)},${r(fromLon)}-${r(toLat)},${r(toLon)}`;
}

/**
 * Fetch a real road-following cycle polyline between two points using TfL's
 * Journey Planner. The cycle leg's lineString is already road-snapped along
 * the cycle network (Cycleways, Quietways, and roads with cycle facilities).
 * Returns null on failure so the caller can fall back to a straight line.
 */
export async function fetchCyclePolyline(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): Promise<[number, number][] | null> {
  try {
    const url = new URL(
      `${TFL_BASE}/Journey/JourneyResults/${fromLat}%2C${fromLon}/to/${toLat}%2C${toLon}`,
    );
    url.searchParams.set("mode", "cycle");

    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();
    const journey = (data.journeys ?? [])[0];
    if (!journey) return null;

    // Concatenate the lineString from every cycle leg into one polyline.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coords: [number, number][] = [];
    for (const leg of journey.legs ?? []) {
      const ls = leg?.path?.lineString;
      if (typeof ls === "string" && ls.length > 0) {
        coords.push(...decodeLineString(ls));
      }
    }
    return coords.length >= 2 ? coords : null;
  } catch {
    return null;
  }
}

// Tube lines that are NEVER viable for non-folding bikes at any time — deep
// single-track tunnels with a permanent ban, not just a peak restriction.
// Excluding their stops early prevents pointless via-stop journey attempts.
const NEVER_VIABLE_TUBE_LINES = new Set([
  "bakerloo", "central", "jubilee", "piccadilly", "victoria", "waterloo-city",
]);

/**
 * Find transit stops near a location that currently permit non-folding bikes.
 * Uses TfL's StopPoint API to discover stations within the given radius.
 */
async function findNearbyViableStops(
  lat: number,
  lon: number,
  radiusMetres: number,
  isPeak: boolean,
  checkDate: Date = new Date()
): Promise<TflStopPoint[]> {
  // During peak, overground/elizabeth-line/dlr/national-rail all have off-peak-only
  // bike rules, so the only tube that's ever viable at peak is the Northern line
  // outer sections. Narrow the mode filter accordingly to reduce noise.
  const modeFilter = isPeak
    ? "tube,national-rail"  // Only NR and tube (for Northern outer) during peak
    : "tube,overground,elizabeth-line,dlr,national-rail";

  const url =
    `${TFL_BASE}/StopPoint` +
    `?lat=${lat}&lon=${lon}` +
    `&stopTypes=NaptanMetroStation,NaptanRailStation` +
    `&radius=${radiusMetres}` +
    `&modes=${modeFilter}` +
    `&returnLines=true`;

  try {
    const res = await fetchWithTimeout(url);
    if (!res || !res.ok) return [];
    const data = await res.json();
    const stops: TflStopPoint[] = (data.stopPoints ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any): TflStopPoint => ({
        id: s.id ?? s.naptanId,
        commonName: s.commonName,
        lat: s.lat,
        lon: s.lon,
        modes: s.modes ?? [],
        // Strip out permanently-banned tube lines before any further processing.
        lines: (s.lines ?? []).filter(
          (l: { id: string }) => !NEVER_VIABLE_TUBE_LINES.has(l.id)
        ),
      })
    );

    // Filter to stops that have at least one bike-viable line at the planned time.
    // Check each line with its own correct mode, not just the stop's primary mode.
    return stops.filter((stop) => {
      // Discard stops whose only lines were all permanently banned (now empty).
      if (stop.lines.length === 0) return false;
      return stop.lines.some((line) => {
        // Determine the mode for this specific line by checking line ID conventions
        // TfL line IDs for overground/elizabeth/dlr/national-rail are distinct.
        const mode =
          stop.modes.includes("overground") && !stop.modes.includes("tube")
            ? "overground"
            : stop.modes.includes("elizabeth-line")
            ? "elizabeth-line"
            : stop.modes.includes("dlr")
            ? "dlr"
            : stop.modes.includes("national-rail") && !stop.modes.includes("tube")
            ? "national-rail"
            : stop.modes.includes("overground")
            ? "overground"
            : stop.modes.includes("national-rail")
            ? "national-rail"
            : "tube";
        return isLegViableNow(mode, line.id, undefined, undefined, checkDate);
      });
    });
  } catch {
    return [];
  }
}

/**
 * Finds stops near both origin and destination that share a viable transit line,
 * then plans the transit leg station-to-station and wraps it with cycling legs
 * on each side. This guarantees a "cycle → 1 transit leg → cycle" journey that
 * maximises the distance covered by transit between the two points.
 */
async function findMaxSingleTransitJourneys(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  fromLabel: string,
  toLabel: string,
  bikeFriendlyModes: string,
  planningTime?: PlanningTime,
  // Accept pre-fetched stops to avoid duplicate StopPoint API calls
  preFetchedOriginStops?: TflStopPoint[],
  preFetchedDestStops?: TflStopPoint[],
): Promise<Journey[]> {
  const checkDate = planningTimeToDate(planningTime);
  const isPeakNow = getPeakStatus(checkDate).isPeak;

  // Reuse stops fetched by Phase 1 if available; only fetch if not provided.
  // Must check .length > 0 — empty arrays are truthy, so a timed-out pre-fetch
  // that returns [] would silently skip the fallback and then return nothing.
  const [originStops, destStops] =
    preFetchedOriginStops && preFetchedOriginStops.length > 0 &&
    preFetchedDestStops   && preFetchedDestStops.length > 0
      ? [preFetchedOriginStops, preFetchedDestStops]
      : await Promise.all([
          findNearbyViableStops(fromLat, fromLon, 3000, isPeakNow, checkDate),
          findNearbyViableStops(toLat, toLon, 3000, isPeakNow, checkDate),
        ]);

  if (originStops.length === 0 || destStops.length === 0) return [];

  // Build a map: lineId → origin stops that serve it
  const lineToOriginStops = new Map<string, TflStopPoint[]>();
  for (const stop of originStops) {
    for (const line of stop.lines) {
      const primaryMode =
        stop.modes.includes("overground") ? "overground" :
        stop.modes.includes("elizabeth-line") ? "elizabeth-line" :
        stop.modes.includes("dlr") ? "dlr" :
        stop.modes.includes("national-rail") ? "national-rail" : "tube";
      if (!isLegViableNow(primaryMode, line.id, undefined, undefined, checkDate)) continue;
      if (!lineToOriginStops.has(line.id)) lineToOriginStops.set(line.id, []);
      lineToOriginStops.get(line.id)!.push(stop);
    }
  }

  // Find (originStop, destStop, sharedLineId) triples, ranked by least total cycling
  type StopPair = {
    origin: TflStopPoint;
    dest: TflStopPoint;
    lineId: string;
    cycleToDist: number;   // origin → boarding stop (metres)
    cycleFromDist: number; // alighting stop → destination (metres)
  };

  const pairs: StopPair[] = [];
  for (const dStop of destStops) {
    for (const dLine of dStop.lines) {
      const oStops = lineToOriginStops.get(dLine.id);
      if (!oStops) continue;
      for (const oStop of oStops) {
        if (oStop.id === dStop.id) continue;
        const cycleToDist = Math.round(haversineMetres(fromLat, fromLon, oStop.lat, oStop.lon) * 1.4);
        const cycleFromDist = Math.round(haversineMetres(dStop.lat, dStop.lon, toLat, toLon) * 1.4);
        pairs.push({ origin: oStop, dest: dStop, lineId: dLine.id, cycleToDist, cycleFromDist });
      }
    }
  }

  if (pairs.length === 0) return [];

  // Sort: minimise total cycling distance (= maximise transit distance)
  pairs.sort((a, b) => (a.cycleToDist + a.cycleFromDist) - (b.cycleToDist + b.cycleFromDist));

  // Deduplicate on (originStopId, destStopId) — no point trying same pair twice
  const seenPairs = new Set<string>();
  const uniquePairs = pairs.filter((p) => {
    const key = `${p.origin.id}→${p.dest.id}`;
    if (seenPairs.has(key)) return false;
    seenPairs.add(key);
    return true;
  });

  // For each top pair, plan transit station → station and wrap with cycling legs.
  // Capped at 5: pairs are sorted by shortest total cycling distance, but "nearest"
  // stops can share a line ID (e.g. all Overground services share "london-overground")
  // while actually requiring a line change — meaning the top 1–3 pairs often fail the
  // single-transit-leg filter. Extending to 5 ensures we reach pairs like
  // H&I→Whitechapel (direct East London Overground) that are ranked lower by cycling
  // distance but are genuinely single-leg services.
  const results = await Promise.all(
    uniquePairs.slice(0, 5).map(async (pair, idx) => {
      const journeysToStop = await fetchTflJourneys(
        buildTflUrl(pair.origin.lat, pair.origin.lon, pair.dest.lat, pair.dest.lon, bikeFriendlyModes, planningTime),
        600 + idx * 10
      );

      // Keep only journeys that have exactly 1 transit (non-cycling) leg
      const singleLeg = journeysToStop.find((j) => {
        const transitLegs = j.legs.filter((l) => l.mode !== "cycle");
        return transitLegs.length === 1;
      });

      if (!singleLeg) return null;
      if (!isJourneyViableNow(singleLeg.legs, checkDate)) return null;

      // Prepend cycling leg: origin → boarding stop
      const cycleToLeg: RouteLeg = {
        mode: "cycle",
        instruction: `Cycle to ${pair.origin.commonName}`,
        durationMinutes: cycleDuration(pair.cycleToDist),
        distanceMeters: pair.cycleToDist,
        fromName: fromLabel,
        toName: pair.origin.commonName,
        fromLat,
        fromLon,
        toLat: pair.origin.lat,
        toLon: pair.origin.lon,
        isSubstituted: false,
      };

      // Append cycling leg: alighting stop → destination
      const cycleFromLeg: RouteLeg = {
        mode: "cycle",
        instruction: `Cycle to ${toLabel}`,
        durationMinutes: cycleDuration(pair.cycleFromDist),
        distanceMeters: pair.cycleFromDist,
        fromName: pair.dest.commonName,
        toName: toLabel,
        fromLat: pair.dest.lat,
        fromLon: pair.dest.lon,
        toLat,
        toLon,
        isSubstituted: false,
      };

      // Merge so any walking-converted-cycle leg at the start/end of the
      // inner journey collapses with our synthesised cycle legs into one
      // continuous cycle leg, instead of being shown as two adjacent ones.
      const allLegs = mergeConsecutiveCycleLegs([cycleToLeg, ...singleLeg.legs, cycleFromLeg]);
      const cycleToMin = cycleToLeg.durationMinutes;
      const cycleFromMin = cycleFromLeg.durationMinutes;
      const totalDuration = singleLeg.totalDurationMinutes + cycleToMin + cycleFromMin;
      const cyclingDuration = singleLeg.cyclingDurationMinutes + cycleToMin + cycleFromMin;

      const transitModes = [
        ...new Set(singleLeg.legs.map((l) => l.mode).filter((m) => m !== "cycle")),
      ];
      const summary = `Cycle + ${transitModes.join(" + ")} + cycle`;

      return {
        ...singleLeg,
        id: `journey-single-${idx}`,
        legs: allLegs,
        totalDurationMinutes: totalDuration,
        cyclingDurationMinutes: cyclingDuration,
        summary,
      } as Journey;
    })
  );

  return results.filter((j): j is Journey => j !== null);
}

/**
 * Upgrade a journey's first walking leg to a cycling leg.
 * Used in lock-bike mode: the user cycles to the first stop instead of walking,
 * arriving faster. All other walking legs stay as walking (bike is locked).
 */
function upgradeInitialWalkToCycle(j: Journey): Journey {
  const first = j.legs[0];
  if (!first || first.mode !== "walking") return j;

  const dur = cycleDuration(first.distanceMeters);
  const timeSaved = first.durationMinutes - dur;

  const cycleFirstLeg: RouteLeg = {
    ...first,
    mode: "cycle",
    durationMinutes: dur,
    instruction: `Cycle to ${first.toName}`,
    isSubstituted: false,
  };

  const newLegs = mergeConsecutiveCycleLegs([cycleFirstLeg, ...j.legs.slice(1)]);
  const transitModes = [
    ...new Set(newLegs.map((l) => l.mode).filter((m) => m !== "cycle" && m !== "walking")),
  ];
  const summary =
    transitModes.length > 0
      ? `Cycle + ${transitModes.join(" + ")}`
      : "Cycle only";

  return {
    ...j,
    legs: newLegs,
    totalDurationMinutes: j.totalDurationMinutes - timeSaved,
    cyclingDurationMinutes: j.cyclingDurationMinutes + dur,
    summary,
  };
}

/**
 * Lock-bike mode: two parallel strategies merged together.
 *
 * Strategy A — Direct (always returns results):
 *   Ask TfL to plan with ALL modes from origin. Upgrade any initial walking
 *   leg to cycling (user cycles to the first stop, then locks bike and boards).
 *
 * Strategy B — Stop-based (longer cycle legs):
 *   Find transit stops 500 m–5000 m away (skip nearby stops — no benefit
 *   cycling 100 m when you could just walk). Plan ALL_MODES transit from each
 *   stop, prepend the cycle leg. This lets the user cycle past their nearest
 *   (bike-restricted) station to a deeper tube/bus stop further away.
 */
async function findLockBikeJourneys(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  fromLabel: string,
  toLabel: string,
  planningTime?: PlanningTime,
): Promise<Journey[]> {
  const ALL_MODES =
    "tube,bus,national-rail,overground,elizabeth-line,dlr,walking,river-bus";

  // Strategy A: direct TfL planning — guaranteed to return something
  const directPromise = fetchTflJourneys(
    buildTflUrl(fromLat, fromLon, toLat, toLon, ALL_MODES, planningTime),
    700,
    { substituteWalking: false },
  ).then((journeys) =>
    journeys
      .map(upgradeInitialWalkToCycle)
      // Only keep journeys that actually involve cycling (have a cycle leg)
      .filter((j) => j.legs.some((l) => l.mode === "cycle"))
  );

  // Strategy B: stop-based — targets stations 500 m–5000 m away for longer
  // initial cycling legs that unlock better (currently bike-restricted) transit.
  const stopPromise = (async (): Promise<Journey[]> => {
    const stopUrl =
      `${TFL_BASE}/StopPoint` +
      `?lat=${fromLat}&lon=${fromLon}` +
      `&stopTypes=NaptanMetroStation,NaptanRailStation` +
      `&radius=3000` +
      `&modes=tube,overground,national-rail,elizabeth-line,dlr` +
      `&returnLines=true`;

    let stops: TflStopPoint[] = [];
    try {
      const res = await fetchWithTimeout(stopUrl);
      if (res?.ok) {
        const data = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stops = (data.stopPoints ?? []).map((s: any): TflStopPoint => ({
          id: s.id ?? s.naptanId,
          commonName: s.commonName,
          lat: s.lat,
          lon: s.lon,
          modes: s.modes ?? [],
          lines: s.lines ?? [],
        }));
      }
    } catch { /* silent — Strategy A covers the fallback */ }

    if (stops.length === 0) return [];

    // Focus on stops that are meaningfully further away (≥ 500 m road-est).
    // Sorting closest-first ensures we still prefer the most reachable option.
    const candidates = stops
      .map((stop) => ({
        stop,
        dist: Math.round(haversineMetres(fromLat, fromLon, stop.lat, stop.lon) * 1.4),
      }))
      .filter((c) => c.dist >= 500)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);

    if (candidates.length === 0) return [];

    const results = await Promise.all(
      candidates.map(async ({ stop, dist }, idx) => {
        const journeys = await fetchTflJourneys(
          buildTflUrl(stop.lat, stop.lon, toLat, toLon, ALL_MODES, planningTime),
          720 + idx * 10,
          { substituteWalking: false },
        );
        // Fix summary: no "+ cycle" at end (bike is locked, no cycling at destination)
        return journeys.slice(0, 2).map((j) => {
          const withCycle = prependCycleLeg(
            j, fromLabel, stop.commonName, dist,
            fromLat, fromLon, stop.lat, stop.lon,
          );
          const transitModes = [
            ...new Set(
              withCycle.legs
                .map((l) => l.mode)
                .filter((m) => m !== "cycle" && m !== "walking"),
            ),
          ];
          return {
            ...withCycle,
            summary:
              transitModes.length > 0
                ? `Cycle + ${transitModes.join(" + ")}`
                : "Cycle only",
          };
        });
      })
    );
    return results.flat();
  })();

  const [directResults, stopResults] = await Promise.all([directPromise, stopPromise]);
  return [...directResults, ...stopResults];
}

export async function planRoute(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  fromName?: string,
  toName?: string,
  planningTime?: PlanningTime,
  lockBike = false,
): Promise<RouteResponse> {
  const fromLabel = fromName ?? `${fromLat}, ${fromLon}`;
  const toLabel = toName ?? `${toLat}, ${toLon}`;

  // ── Lock-bike fast path ─────────────────────────────────────────────────
  // Cycle to a nearby station, lock the bike, take ANY transit to destination.
  // No bike-rules filtering — the bike stays at the origin station.
  if (lockBike) {
    const lockBikeJourneys = await findLockBikeJourneys(
      fromLat, fromLon, toLat, toLon, fromLabel, toLabel, planningTime
    );
    const cycleOnly = synthesisCycleJourney(fromLat, fromLon, toLat, toLon, fromLabel, toLabel);
    const cycleOnlyMinutes = cycleOnly.totalDurationMinutes;

    function journeyScoreLock(j: Journey): number {
      if (j.summary === "Cycle only") return Infinity;
      const transitLegs = j.legs.filter((l) => l.mode !== "cycle" && l.mode !== "walking").length;
      const changesPenalty = Math.max(0, transitLegs - 1) * 8;
      return j.totalDurationMinutes + changesPenalty;
    }

    const deduped = deduplicateJourneys(lockBikeJourneys).sort(
      (a, b) => journeyScoreLock(a) - journeyScoreLock(b)
    );
    deduped.push(cycleOnly);

    const journeys = deduped.slice(0, 5).map((j, i) => ({ ...j, id: `journey-${i}` }));
    return {
      journeys,
      fromName: fromLabel,
      toName: toLabel,
      filteredCount: 0,
      cycleOnlyMinutes,
    };
  }

  // Use the planned date for peak status and viability checks
  const checkDate = planningTimeToDate(planningTime);
  const { isPeak } = getPeakStatus(checkDate);

  // All transit modes — direct TfL routing, will be viability-filtered
  const ALL_MODES =
    "tube,bus,national-rail,overground,elizabeth-line,dlr,walking,river-bus";

  // Bike-friendly modes: no bus; walking legs become cycling legs via buildJourney.
  // Includes tube so TfL can suggest Circle/District/Met routes (then viability-filtered).
  const BIKE_FRIENDLY_MODES = isPeak
    ? "tube,national-rail,river-bus,walking"
    : "tube,overground,national-rail,elizabeth-line,dlr,river-bus,walking";

  // Surface-transit modes: NO tube at all.
  // Used for via-stop sub-journeys so TfL is forced to plan on Overground /
  // National Rail / DLR — services that are actually bike-viable.
  // Without this, TfL always prefers deep tube which then fails viability checks.
  const SURFACE_BIKE_MODES = isPeak
    ? "national-rail,river-bus,walking"
    : "overground,national-rail,elizabeth-line,dlr,river-bus,walking";

  // ── Stage 1: lookups only (TfL routing + stop discovery), all in parallel.
  // findMaxSingleTransitJourneys is intentionally NOT in this batch — it needs
  // the same nearby stops that we're fetching here, and re-fetching them inside
  // it duplicates ~500ms of API latency on the critical path.
  // We synthesise a cycle-only fallback ourselves further down, so we no longer
  // ask TfL for a dedicated cycle,walking journey — that call was pure latency
  // on the critical path with no journeys we couldn't already produce.
  // 3000m radius ≈ max TfL will reliably serve; H&I at 3.7km is found instead
  // via the direct SURFACE_BIKE_MODES plan below which forces TfL to route on
  // surface-only transit (Overground/NR/DLR/Elizabeth) and naturally picks up
  // longer walking legs that buildJourney converts to cycling legs.
  const [
    allResults,
    bikeFriendlyResults,
    surfaceResults,
    nearbyDestStops,
    nearbyOriginStops,
  ] = await Promise.all([
    // Standard TfL routing (full mode set)
    fetchTflJourneys(buildTflUrl(fromLat, fromLon, toLat, toLon, ALL_MODES, planningTime), 0),
    // Bike-friendly routing (no bus; TfL adds walks → we convert to cycling)
    fetchTflJourneys(buildTflUrl(fromLat, fromLon, toLat, toLon, BIKE_FRIENDLY_MODES, planningTime), 100),
    // Surface-only routing (no tube): forces TfL to use Overground / NR / DLR.
    // Picks up routes like cycle→Overground→cycle that require a longer initial
    // cycling leg (e.g. N19 → H&I for the Windrush line) that the radius-capped
    // StopPoint search would never discover.
    fetchTflJourneys(buildTflUrl(fromLat, fromLon, toLat, toLon, SURFACE_BIKE_MODES, planningTime), 0),
    // Viable stops near DESTINATION (for "transit then final-cycle" appending).
    // Radius capped at 3000m — TfL's StopPoint API reliably fails above this.
    findNearbyViableStops(toLat, toLon, 3000, isPeak, checkDate),
    // Viable stops near ORIGIN (for "initial-cycle then transit" prepending).
    findNearbyViableStops(fromLat, fromLon, 3000, isPeak, checkDate),
  ]);

  // ── Stage 2: all stop-dependent journey building, in one parallel batch.
  // findMaxSingleTransitJourneys, Phase 2a, and Phase 2b all need the stops
  // from Stage 1 but don't depend on each other, so they run together. This
  // eliminates the previous sequential gap between findMaxSingle and Phase 2.
  // Phase 2 uses SURFACE_BIKE_MODES (no tube) so TfL returns Overground/NR/DLR
  // routes that will actually pass viability checks rather than deep-tube routes.

  // Phase 2b stop ordering: TfL's StopPoint radius search sorts by distance,
  // so dense tube stations crowd out surface-transit stops that are further
  // away but uniquely useful (e.g. H&I Windrush line at ~3 km from N19 sits at
  // position 21/23). Re-sort so Overground / DLR / Elizabeth stops come first,
  // then NR/tube, and raise the cap to 10 so all surface-transit stops are
  // always covered.
  const surfaceFirstOriginStops = [
    ...nearbyOriginStops.filter(s =>
      s.modes.some(m => ["overground", "elizabeth-line", "dlr"].includes(m))
    ),
    ...nearbyOriginStops.filter(s =>
      !s.modes.some(m => ["overground", "elizabeth-line", "dlr"].includes(m))
    ),
  ];

  const [singleTransitJourneys, viaDestStopJourneys, viaOriginStopJourneys] = await Promise.all([
    // Best "cycle → 1 transit leg → cycle" (passes pre-fetched stops to skip
    // the duplicate StopPoint API calls it would otherwise make).
    findMaxSingleTransitJourneys(
      fromLat, fromLon, toLat, toLon, fromLabel, toLabel, BIKE_FRIENDLY_MODES, planningTime,
      nearbyOriginStops, nearbyDestStops
    ),

    // 2a: transit to a stop near destination, then cycle the last mile.
    Promise.all(
      nearbyDestStops.slice(0, 3).map(async (stop, idx) => {
        const journeysToStop = await fetchTflJourneys(
          buildTflUrl(fromLat, fromLon, stop.lat, stop.lon, SURFACE_BIKE_MODES, planningTime),
          300 + idx * 10
        );
        const cycleDist = Math.round(
          haversineMetres(stop.lat, stop.lon, toLat, toLon) * 1.4
        );
        return journeysToStop.slice(0, 2).map((j) =>
          appendCycleLeg(j, stop.commonName, toLabel, cycleDist, stop.lat, stop.lon, toLat, toLon)
        );
      })
    ).then((r) => r.flat()),

    // 2b: cycle to a stop near origin (surface-transit stops first), then transit.
    Promise.all(
      surfaceFirstOriginStops.slice(0, 5).map(async (stop, idx) => {
        const journeysFromStop = await fetchTflJourneys(
          buildTflUrl(stop.lat, stop.lon, toLat, toLon, SURFACE_BIKE_MODES, planningTime),
          400 + idx * 10
        );
        const cycleDist = Math.round(
          haversineMetres(fromLat, fromLon, stop.lat, stop.lon) * 1.4
        );
        return journeysFromStop.slice(0, 2).map((j) =>
          prependCycleLeg(j, fromLabel, stop.commonName, cycleDist, fromLat, fromLon, stop.lat, stop.lon)
        );
      })
    ).then((r) => r.flat()),
  ]);

  // ── Phase 3: pool, filter, deduplicate, sort ──────────────────────────────
  const allCandidates = [
    ...allResults,
    ...bikeFriendlyResults,
    ...surfaceResults,
    ...viaDestStopJourneys,
    ...viaOriginStopJourneys,
    ...singleTransitJourneys,
  ];

  const totalCount = allCandidates.length;
  const viable = allCandidates.filter((j) => isJourneyViableNow(j.legs, checkDate));

  // ── Cap at 2 transit legs: routes with 3+ changes are complex enough that
  // users are better off just cycling. Fall back to the full viable set only
  // if the cap would leave nothing but cycle-only (so there's always at least
  // one transit option when any exists).
  const transitLegCount = (j: Journey) =>
    j.legs.filter((l) => l.mode !== "cycle" && l.mode !== "walking").length;
  const withinCap = viable.filter((j) => transitLegCount(j) <= 2);
  const cappedViable = withinCap.some((j) => transitLegCount(j) > 0)
    ? withinCap
    : viable;

  // ── Scoring: penalise extra transit changes so simpler routes rank higher
  // when journey times are close. Each change above 1 costs ~8 minutes of
  // convenience penalty — enough to prefer a direct service over a 1-change
  // option that's only a couple of minutes faster.
  function journeyScore(j: Journey): number {
    if (j.summary === "Cycle only") return Infinity; // always push to end before slice
    const transitLegs = j.legs.filter((l) => l.mode !== "cycle").length;
    const changesPenalty = Math.max(0, transitLegs - 1) * 8;
    return j.totalDurationMinutes + changesPenalty;
  }

  const deduped = deduplicateJourneys(cappedViable).sort(
    (a, b) => journeyScore(a) - journeyScore(b)
  );

  // Always guarantee a cycle-only fallback — computed separately so we can
  // return cycleOnlyMinutes even if the cycle-only card falls outside top 5.
  const existingCycleOnly = deduped.find((j) => j.summary === "Cycle only");
  const cycleOnlyJourney =
    existingCycleOnly ??
    synthesisCycleJourney(fromLat, fromLon, toLat, toLon, fromLabel, toLabel);
  const cycleOnlyMinutes = cycleOnlyJourney.totalDurationMinutes;

  if (!existingCycleOnly) {
    deduped.push(cycleOnlyJourney);
  }

  const journeys = deduped.slice(0, 5).map((j, i) => ({ ...j, id: `journey-${i}` }));

  return {
    journeys,
    fromName: fromLabel,
    toName: toLabel,
    filteredCount: totalCount - viable.length,
    cycleOnlyMinutes,
  };
}
