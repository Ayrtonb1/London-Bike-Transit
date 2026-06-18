import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

/**
 * Transparent proxy for the TfL Unified API.
 *
 * All GET requests to /api/tfl/<path>?<query> are forwarded to
 * https://api.tfl.gov.uk/<path>?<query>.
 *
 * This avoids browser CORS restrictions when the web app is served from a
 * Replit (or any non-TfL) origin. The Capacitor iOS build calls TfL directly;
 * this proxy is only used by the browser build.
 *
 * StopPoint lat/lon responses have `additionalProperties` and `children`
 * stripped to keep response sizes manageable for large radii.
 */
router.use("/tfl", async (req: Request, res: Response) => {
  // Use req.originalUrl so path encoding (%2C in lat,lon) and query string
  // commas (mode=tube,overground) are forwarded verbatim to TfL.
  const subPath = req.originalUrl.replace(/^\/api\/tfl/, "");
  const tflUrl = `https://api.tfl.gov.uk${subPath}`;

  try {
    const upstream = await fetch(tflUrl, {
      headers: { "User-Agent": "Navelo/1.0" },
      signal: AbortSignal.timeout(20_000),
    });

    if (!upstream.ok) {
      req.log.warn({ subPath, status: upstream.status }, "TfL upstream error");
      res.status(upstream.status).json({ error: "TfL API error" });
      return;
    }

    const data = await upstream.json() as Record<string, unknown>;

    // For StopPoint lat/lon queries strip heavy fields so large-radius
    // responses stay small. We only need commonName/lat/lon/modes/lines.
    if (Array.isArray((data as { stopPoints?: unknown[] }).stopPoints)) {
      const stops = (data as { stopPoints: Record<string, unknown>[] }).stopPoints;
      data.stopPoints = stops.map((s) => ({
        naptanId: s.naptanId,
        id: s.id,
        commonName: s.commonName,
        lat: s.lat,
        lon: s.lon,
        distance: s.distance,
        modes: s.modes,
        lines: (s.lines as { id: string; name: string }[] | undefined)?.map(
          (l) => ({ id: l.id, name: l.name })
        ) ?? [],
        placeType: s.placeType,
        stationNaptan: s.stationNaptan,
      }));
    }

    res.json(data);
  } catch (err) {
    req.log.error({ err, subPath }, "TfL proxy fetch failed");
    res.status(502).json({ error: "TfL API unreachable" });
  }
});

export default router;
