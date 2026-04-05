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

export async function searchPlaces(query: string): Promise<Place[]> {
  if (!query || query.length < 2) return [];

  const params = new URLSearchParams({
    q: `${query}, London, UK`,
    format: "json",
    limit: "8",
    addressdetails: "1",
    bounded: "1",
    viewbox: "-0.5103,51.2868,0.3340,51.6919",
    countrycodes: "gb",
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        "Accept-Language": "en",
      },
    }
  );

  if (!response.ok) throw new Error("Place search failed");

  const data = await response.json();
  return data.map((item: { place_id: number; display_name: string; lat: string; lon: string; category: string; type: string }) => ({
    id: String(item.place_id),
    name: item.display_name.split(",")[0].trim(),
    address: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    type: item.category || item.type || "place",
  }));
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
  const tflJourneys = tflData.journeys ?? [];

  const journeys: Journey[] = tflJourneys.slice(0, 4).map(
    (journey: { duration: number; legs: { duration: number; mode: { id: string }; instruction: { summary: string }; departurePoint: { commonName: string }; arrivalPoint: { commonName: string }; distance?: number; routeOptions?: { lineIdentifier?: { id: string; name: string } }[]; path?: { stopPoints?: { name?: string; commonName?: string; lat?: number; lon?: number }[]; lineString?: string } }[]; startDateTime?: string; arrivalDateTime?: string }, jIdx: number) => {
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
  );

  return {
    journeys,
    fromName: fromName ?? `${fromLat}, ${fromLon}`,
    toName: toName ?? `${toLat}, ${toLon}`,
  };
}
