import { Router } from "express";
import type { Request, Response } from "express";
import { PlanRouteQueryParams } from "@workspace/api-zod";

const router = Router();

const CYCLING_SPEED_M_PER_MIN = 250;

interface TflJourney {
  duration: number;
  legs: TflLeg[];
  startDateTime?: string;
  arrivalDateTime?: string;
}

interface TflLeg {
  duration: number;
  mode: { id: string; name: string };
  instruction: { summary: string; detailed: string };
  departurePoint: { commonName: string; lat?: number; lon?: number; placeType?: string };
  arrivalPoint: { commonName: string; lat?: number; lon?: number; placeType?: string };
  distance?: number;
  routeOptions?: Array<{
    lineIdentifier?: { id: string; name: string };
  }>;
  path?: {
    stopPoints?: Array<{
      name?: string;
      commonName?: string;
      lat?: number;
      lon?: number;
    }>;
    lineString?: string;
  };
}

interface TflResponse {
  journeys?: TflJourney[];
  httpStatusCode?: number;
}

function modeLabel(tflMode: string): string {
  const map: Record<string, string> = {
    tube: "tube",
    bus: "bus",
    "national-rail": "national-rail",
    "elizabeth-line": "elizabeth-line",
    dlr: "dlr",
    "tflrail": "elizabeth-line",
    overground: "overground",
    walking: "walking",
    cycle: "cycle",
    "cable-car": "cable-car",
    "river-bus": "river-bus",
  };
  return map[tflMode.toLowerCase()] ?? tflMode.toLowerCase();
}

function decodeLineString(lineString: string): Array<[number, number]> {
  try {
    const coords: Array<[number, number]> = JSON.parse(lineString);
    return coords;
  } catch {
    return [];
  }
}

function cycleDuration(distanceMeters: number): number {
  return Math.max(1, Math.round(distanceMeters / CYCLING_SPEED_M_PER_MIN));
}

function walkingDistanceEstimate(durationMinutes: number): number {
  const WALK_SPEED_M_PER_MIN = 80;
  return durationMinutes * WALK_SPEED_M_PER_MIN;
}

router.get("/routes/plan", async (req: Request, res: Response) => {
  const parse = PlanRouteQueryParams.safeParse(req.query);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid query parameters", details: parse.error.message });
    return;
  }

  const { fromLat, fromLon, toLat, toLon, fromName, toName } = parse.data;

  try {
    const tflUrl = new URL("https://api.tfl.gov.uk/Journey/JourneyResults/" +
      `${fromLat}%2C${fromLon}/to/${toLat}%2C${toLon}`);
    tflUrl.searchParams.set("mode", "tube,bus,national-rail,overground,elizabeth-line,dlr,walking,river-bus");
    tflUrl.searchParams.set("walkingSpeed", "fast");
    tflUrl.searchParams.set("journeyPreference", "LeastTime");
    tflUrl.searchParams.set("alternativeJourneys", "true");

    req.log.info({ url: tflUrl.toString() }, "Calling TfL API");

    const tflRes = await fetch(tflUrl.toString(), {
      headers: {
        "Cache-Control": "no-cache",
      },
    });

    if (!tflRes.ok) {
      const errorText = await tflRes.text();
      req.log.error({ status: tflRes.status, errorText }, "TfL API error");
      res.status(502).json({ error: "TfL API unavailable", details: `Status ${tflRes.status}` });
      return;
    }

    const tflData: TflResponse = await tflRes.json();

    if (!tflData.journeys || tflData.journeys.length === 0) {
      res.json({
        journeys: [],
        fromName: fromName ?? `${fromLat}, ${fromLon}`,
        toName: toName ?? `${toLat}, ${toLon}`,
      });
      return;
    }

    const journeys = tflData.journeys.slice(0, 4).map((journey, jIdx) => {
      let totalDuration = 0;
      let originalDuration = journey.duration;
      let cyclingDuration = 0;

      const legs = journey.legs.map((leg) => {
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

        const stopPoints = (leg.path?.stopPoints ?? []).map((sp) => ({
          name: sp.commonName ?? sp.name ?? "",
          lat: sp.lat ?? 0,
          lon: sp.lon ?? 0,
        }));

        const polyline = leg.path?.lineString
          ? decodeLineString(leg.path.lineString)
          : [];

        const lineId = leg.routeOptions?.[0]?.lineIdentifier?.id;
        const lineName = leg.routeOptions?.[0]?.lineIdentifier?.name;

        return {
          mode: finalMode,
          instruction: isWalking
            ? `Cycle instead of walk: ${leg.instruction?.summary ?? "proceed"}`
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

      const modes = [...new Set(legs.map((l) => l.mode).filter(m => m !== "cycle"))];
      const summary = modes.length
        ? `Cycle + ${modes.join(" + ")}`
        : "Cycle only";

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
    });

    res.json({
      journeys,
      fromName: fromName ?? `${fromLat}, ${fromLon}`,
      toName: toName ?? `${toLat}, ${toLon}`,
    });
  } catch (err) {
    req.log.error({ err }, "Route planning error");
    res.status(500).json({ error: "Route planning failed" });
  }
});

export default router;
