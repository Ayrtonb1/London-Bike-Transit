import { isJourneyViableNow, isLegViableNow, getPeakStatus } from "./bikeRules";

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

// TfL StopPoint structure
type TflStopPoint = {
  id: string;
  commonName: string;
  lat: number;
  lon: number;
  modes: string[];
  lines: { id: string; name: string }[];
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

/** Append a final cycling leg to an existing journey (transit → cycle to destination) */
function appendCycleLeg(
  journey: Journey,
  fromStopName: string,
  toLabel: string,
  distanceMeters: number
): Journey {
  const durationMinutes = cycleDuration(distanceMeters);
  const cycleLeg: RouteLeg = {
    mode: "cycle",
    instruction: `Cycle to ${toLabel}`,
    durationMinutes,
    distanceMeters,
    fromName: fromStopName,
    toName: toLabel,
    isSubstituted: false,
  };
  const allLegs = [...journey.legs, cycleLeg];
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
  return transitLegs
    .map((l) => `${l.mode}:${l.lineId ?? ""}:${l.fromName}→${l.toName}`)
    .join("|");
}

function deduplicateJourneys(journeys: Journey[]): Journey[] {
  const seen = new Map<string, number>(); // sig → best total duration seen
  return journeys.filter((j) => {
    const sig = journeySignature(j);
    const prev = seen.get(sig);
    if (prev !== undefined && prev <= j.totalDurationMinutes) return false;
    seen.set(sig, j.totalDurationMinutes);
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
  modes: string
): string {
  const url = new URL(
    `https://api.tfl.gov.uk/Journey/JourneyResults/${fromLat}%2C${fromLon}/to/${toLat}%2C${toLon}`
  );
  url.searchParams.set("mode", modes);
  url.searchParams.set("walkingSpeed", "fast");
  url.searchParams.set("journeyPreference", "LeastTime");
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

/**
 * Find transit stops near a location that currently permit non-folding bikes.
 * Uses TfL's StopPoint API to discover stations within the given radius.
 */
async function findNearbyViableStops(
  lat: number,
  lon: number,
  radiusMetres: number,
  isPeak: boolean
): Promise<TflStopPoint[]> {
  // Include all relevant modes; we'll filter by bike viability after
  const modeFilter = isPeak
    ? "tube,national-rail"
    : "tube,overground,elizabeth-line,dlr,national-rail";

  const url =
    `https://api.tfl.gov.uk/StopPoint` +
    `?lat=${lat}&lon=${lon}` +
    `&stopTypes=NaptanMetroStation,NaptanRailStation` +
    `&radius=${radiusMetres}` +
    `&modes=${modeFilter}` +
    `&returnLines=true`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const stops: TflStopPoint[] = (data.stopPoints ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any): TflStopPoint => ({
        id: s.id ?? s.naptanId,
        commonName: s.commonName,
        lat: s.lat,
        lon: s.lon,
        modes: s.modes ?? [],
        lines: s.lines ?? [],
      })
    );

    // Filter to stops that have at least one currently bike-viable line
    const now = new Date();
    return stops.filter((stop) => {
      const primaryMode =
        stop.modes.includes("overground") ? "overground" :
        stop.modes.includes("elizabeth-line") ? "elizabeth-line" :
        stop.modes.includes("dlr") ? "dlr" :
        stop.modes.includes("national-rail") ? "national-rail" :
        "tube";

      return stop.lines.some((line) =>
        isLegViableNow(primaryMode, line.id, undefined, undefined, now)
      );
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
  bikeFriendlyModes: string
): Promise<Journey[]> {
  // Find viable stops near BOTH ends simultaneously
  const isPeakNow = getPeakStatus().isPeak;
  const [originStops, destStops] = await Promise.all([
    findNearbyViableStops(fromLat, fromLon, 2500, isPeakNow),
    findNearbyViableStops(toLat, toLon, 2500, isPeakNow),
  ]);

  if (originStops.length === 0 || destStops.length === 0) return [];

  const now = new Date();

  // Build a map: lineId → origin stops that serve it
  const lineToOriginStops = new Map<string, TflStopPoint[]>();
  for (const stop of originStops) {
    for (const line of stop.lines) {
      const primaryMode =
        stop.modes.includes("overground") ? "overground" :
        stop.modes.includes("elizabeth-line") ? "elizabeth-line" :
        stop.modes.includes("dlr") ? "dlr" :
        stop.modes.includes("national-rail") ? "national-rail" : "tube";
      if (!isLegViableNow(primaryMode, line.id, undefined, undefined, now)) continue;
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

  // For each top pair, plan transit station → station and wrap with cycling legs
  const results = await Promise.all(
    uniquePairs.slice(0, 4).map(async (pair, idx) => {
      const journeysToStop = await fetchTflJourneys(
        buildTflUrl(pair.origin.lat, pair.origin.lon, pair.dest.lat, pair.dest.lon, bikeFriendlyModes),
        600 + idx * 10
      );

      // Keep only journeys that have exactly 1 transit (non-cycling) leg
      const singleLeg = journeysToStop.find((j) => {
        const transitLegs = j.legs.filter((l) => l.mode !== "cycle");
        return transitLegs.length === 1;
      });

      if (!singleLeg) return null;
      if (!isJourneyViableNow(singleLeg.legs, now)) return null;

      // Prepend cycling leg: origin → boarding stop
      const cycleToLeg: RouteLeg = {
        mode: "cycle",
        instruction: `Cycle to ${pair.origin.commonName}`,
        durationMinutes: cycleDuration(pair.cycleToDist),
        distanceMeters: pair.cycleToDist,
        fromName: fromLabel,
        toName: pair.origin.commonName,
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
        isSubstituted: false,
      };

      const allLegs = [cycleToLeg, ...singleLeg.legs, cycleFromLeg];
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

  // All transit modes — direct TfL routing, will be viability-filtered
  const ALL_MODES =
    "tube,bus,national-rail,overground,elizabeth-line,dlr,walking,river-bus";

  // Bike-friendly modes: no bus; no off-peak-only services during peak
  // Walking legs that TfL adds become cycling legs via buildJourney
  const BIKE_FRIENDLY_MODES = isPeak
    ? "tube,national-rail,river-bus,walking"
    : "tube,overground,national-rail,elizabeth-line,dlr,river-bus,walking";

  // ── Phase 1: all calls fire in parallel ───────────────────────────────────
  const [
    allResults,
    bikeFriendlyResults,
    cycleResults,
    nearbyDestStops,
    singleTransitJourneys,
  ] = await Promise.all([
    // Standard TfL routing (full mode set)
    fetchTflJourneys(buildTflUrl(fromLat, fromLon, toLat, toLon, ALL_MODES), 0),
    // Bike-friendly routing (no bus; TfL adds walks → we convert to cycling)
    fetchTflJourneys(buildTflUrl(fromLat, fromLon, toLat, toLon, BIKE_FRIENDLY_MODES), 100),
    // Cycle-only from TfL
    fetchTflJourneys(buildTflUrl(fromLat, fromLon, toLat, toLon, "cycle,walking"), 200),
    // Viable stops near destination (for "transit then cycle" appending)
    findNearbyViableStops(toLat, toLon, 2000, isPeak),
    // Best "cycle → 1 transit leg → cycle" option (maximises transit coverage)
    findMaxSingleTransitJourneys(
      fromLat, fromLon, toLat, toLon, fromLabel, toLabel, BIKE_FRIENDLY_MODES
    ),
  ]);

  // ── Phase 2: for each nearby dest stop, plan origin → stop, append cycle ──
  const viaStopJourneys = (
    await Promise.all(
      nearbyDestStops.slice(0, 5).map(async (stop, idx) => {
        const journeysToStop = await fetchTflJourneys(
          buildTflUrl(fromLat, fromLon, stop.lat, stop.lon, BIKE_FRIENDLY_MODES),
          300 + idx * 10
        );
        const cycleDist = Math.round(
          haversineMetres(stop.lat, stop.lon, toLat, toLon) * 1.4
        );
        return journeysToStop.slice(0, 2).map((j) =>
          appendCycleLeg(j, stop.commonName, toLabel, cycleDist)
        );
      })
    )
  ).flat();

  // ── Phase 3: pool, filter, deduplicate, sort ──────────────────────────────
  const allCandidates = [
    ...allResults,
    ...bikeFriendlyResults,
    ...cycleResults,
    ...viaStopJourneys,
    ...singleTransitJourneys,
  ];

  const totalCount = allCandidates.length;
  const now = new Date();
  const viable = allCandidates.filter((j) => isJourneyViableNow(j.legs, now));

  const deduped = deduplicateJourneys(viable).sort(
    (a, b) => a.totalDurationMinutes - b.totalDurationMinutes
  );

  // Always guarantee a cycle-only fallback
  const hasCycleOnly = deduped.some((j) => j.summary === "Cycle only");
  if (!hasCycleOnly) {
    const fallback = synthesisCycleJourney(
      fromLat, fromLon, toLat, toLon, fromLabel, toLabel
    );
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
