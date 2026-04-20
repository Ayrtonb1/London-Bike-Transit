import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Journey, Place } from "@/lib/transit";

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

function getLegColor(mode: string, lineId?: string): string {
  if (mode === "cycle") return "#16a34a";
  if (mode === "tube" && lineId && TUBE_COLORS[lineId]) return TUBE_COLORS[lineId];
  if (mode === "bus") return "#dc2626";
  if (mode === "overground") return "#ea580c";
  if (mode === "elizabeth-line") return "#9333ea";
  if (mode === "dlr") return "#0d9488";
  if (mode === "national-rail") return "#57534e";
  if (mode === "river-bus") return "#0369a1";
  return "#71717a";
}

function makeAbMarkerEl(label: string, bg: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width:30px;height:30px;background:${bg};border-radius:50%;
    border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);
    display:flex;align-items:center;justify-content:center;
    color:white;font-weight:800;font-size:13px;font-family:sans-serif;
    line-height:1;cursor:default;
  `;
  el.textContent = label;
  return el;
}

function makeStopMarkerEl(color: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width:14px;height:14px;background:${color};border-radius:50%;
    border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);
    cursor:default;
  `;
  return el;
}

interface MapProps {
  fromPlace: Place | null;
  toPlace: Place | null;
  selectedJourney: Journey | null;
  /** Pass true whenever the map panel becomes visible on screen so MapLibre
   *  can recalculate dimensions after being hidden (e.g. mobile tab swap). */
  isVisible?: boolean;
}

export function Map({ fromPlace, toPlace, selectedJourney, isVisible = true }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const routeLayerIdsRef = useRef<string[]>([]);
  const styleLoadedRef = useRef(false);

  // ── Initialise map once ─────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // MapLibre needs WebGL. Detect failure and show a friendly fallback so
    // the whole app doesn't crash on environments without GPU support
    // (very old browsers, headless screenshotting tools, etc.).
    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        // OpenMapTiles "Basic" (Klokantech) style, served locally with all
        // tile/glyph/sprite sources rewritten to OpenFreeMap. Free, no API
        // key, no rate limits — same vector data as Google Maps' style of
        // crisp labels and smooth zoom, in the minimal Basic styling.
        style: `${import.meta.env.BASE_URL}basic-style.json`,
        center: [-0.09, 51.505],
        zoom: 11,
        attributionControl: { compact: true },
      });

      map.on("load", () => {
        styleLoadedRef.current = true;
      });

      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
        styleLoadedRef.current = false;
      };
    } catch (err) {
      console.warn("MapLibre init failed (likely no WebGL support):", err);
      if (fallbackRef.current) {
        fallbackRef.current.style.display = "flex";
      }
      return;
    }
  }, []);

  // ── Resize when becoming visible (mobile tab swap) ──────────────────────
  useEffect(() => {
    if (!isVisible || !mapRef.current) return;
    const t = setTimeout(() => mapRef.current?.resize(), 50);
    return () => clearTimeout(t);
  }, [isVisible]);

  // ── Render markers + route lines whenever the journey changes ───────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Wait for style to finish loading before adding sources/layers
    const apply = () => {
      // Clear previous markers
      for (const m of markersRef.current) m.remove();
      markersRef.current = [];

      // Clear previous route layers + sources
      for (const id of routeLayerIdsRef.current) {
        if (map.getLayer(id)) map.removeLayer(id);
        const sourceId = id.replace(/-casing$|-line$/, "-src");
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
      routeLayerIdsRef.current = [];

      // ── Polylines for route legs ──────────────────────────────────────
      if (selectedJourney) {
        selectedJourney.legs.forEach((leg, i) => {
          if (leg.fromLat == null || leg.toLat == null) return;
          const color = getLegColor(leg.mode, leg.lineId);
          const isCycle = leg.mode === "cycle";
          const sourceId = `route-${i}-src`;
          const casingId = `route-${i}-casing`;
          const lineId = `route-${i}-line`;

          map.addSource(sourceId, {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: [
                  [leg.fromLon!, leg.fromLat],
                  [leg.toLon!, leg.toLat],
                ],
              },
            },
          });

          // White casing layer (sits behind)
          map.addLayer({
            id: casingId,
            type: "line",
            source: sourceId,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#ffffff",
              "line-width": isCycle ? 8 : 10,
              "line-opacity": 0.9,
            },
          });

          // Coloured line on top (dashed for cycle legs)
          map.addLayer({
            id: lineId,
            type: "line",
            source: sourceId,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": color,
              "line-width": isCycle ? 5 : 6,
              "line-opacity": 1,
              ...(isCycle ? { "line-dasharray": [2, 1.5] } : {}),
            },
          });

          routeLayerIdsRef.current.push(casingId, lineId);
        });

        // ── Transit stop circles at the start of each transit leg ─────
        selectedJourney.legs.forEach((leg) => {
          if (leg.mode === "cycle" || leg.fromLat == null) return;
          const color = getLegColor(leg.mode, leg.lineId);
          const m = new maplibregl.Marker({ element: makeStopMarkerEl(color) })
            .setLngLat([leg.fromLon!, leg.fromLat])
            .addTo(map);
          markersRef.current.push(m);
        });

        // Stop circle at end of last transit leg
        const lastTransit = [...selectedJourney.legs]
          .reverse()
          .find((l) => l.mode !== "cycle");
        if (lastTransit?.toLat != null) {
          const color = getLegColor(lastTransit.mode, lastTransit.lineId);
          const m = new maplibregl.Marker({ element: makeStopMarkerEl(color) })
            .setLngLat([lastTransit.toLon!, lastTransit.toLat])
            .addTo(map);
          markersRef.current.push(m);
        }
      }

      // ── Origin (A) and destination (B) markers ────────────────────────
      if (fromPlace) {
        const m = new maplibregl.Marker({
          element: makeAbMarkerEl("A", "#16a34a"),
        })
          .setLngLat([fromPlace.lon, fromPlace.lat])
          .addTo(map);
        markersRef.current.push(m);
      }
      if (toPlace) {
        const m = new maplibregl.Marker({
          element: makeAbMarkerEl("B", "#dc2626"),
        })
          .setLngLat([toPlace.lon, toPlace.lat])
          .addTo(map);
        markersRef.current.push(m);
      }

      // ── Auto-fit bounds ───────────────────────────────────────────────
      const coords: [number, number][] = [];
      if (fromPlace) coords.push([fromPlace.lon, fromPlace.lat]);
      if (toPlace) coords.push([toPlace.lon, toPlace.lat]);
      if (selectedJourney) {
        for (const leg of selectedJourney.legs) {
          if (leg.fromLat != null) coords.push([leg.fromLon!, leg.fromLat]);
          if (leg.toLat != null) coords.push([leg.toLon!, leg.toLat]);
        }
      }
      if (coords.length >= 2) {
        const bounds = coords.reduce(
          (b, c) => b.extend(c),
          new maplibregl.LngLatBounds(coords[0], coords[0])
        );
        map.fitBounds(bounds, { padding: 60, duration: 600, maxZoom: 16 });
      } else if (coords.length === 1) {
        map.flyTo({ center: coords[0], zoom: 14, duration: 600 });
      }
    };

    if (styleLoadedRef.current) {
      apply();
    } else {
      map.once("load", apply);
    }
  }, [fromPlace, toPlace, selectedJourney]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      <div
        ref={fallbackRef}
        className="absolute inset-0 items-center justify-center bg-muted text-muted-foreground text-sm p-6 text-center"
        style={{ display: "none" }}
      >
        Map preview unavailable in this environment (WebGL not supported).
        Routes still work — open this app in any modern browser to see the map.
      </div>
    </div>
  );
}
