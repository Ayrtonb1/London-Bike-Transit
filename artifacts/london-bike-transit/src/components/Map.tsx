import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import type { Journey, Place } from "@/lib/transit";

// ── Custom DivIcon markers ────────────────────────────────────────────────────

function makeDotIcon(label: string, bg: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:30px;height:30px;
      background:${bg};
      border-radius:50%;
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      color:white;font-weight:800;font-size:13px;font-family:sans-serif;
      line-height:1;
    ">${label}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

const originIcon = makeDotIcon("A", "#16a34a");
const destIcon = makeDotIcon("B", "#dc2626");

// ── Mode colours ─────────────────────────────────────────────────────────────

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

// ── Props ─────────────────────────────────────────────────────────────────────

interface MapProps {
  fromPlace: Place | null;
  toPlace: Place | null;
  selectedJourney: Journey | null;
}

// ── Map bounds auto-fitter ────────────────────────────────────────────────────

function MapUpdater({ fromPlace, toPlace, selectedJourney }: MapProps) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds([]);

    if (fromPlace) bounds.extend([fromPlace.lat, fromPlace.lon]);
    if (toPlace) bounds.extend([toPlace.lat, toPlace.lon]);

    if (selectedJourney) {
      for (const leg of selectedJourney.legs) {
        if (leg.polyline?.length) {
          leg.polyline.forEach((p) => bounds.extend([p[0], p[1]]));
        }
        if (leg.fromLat != null) bounds.extend([leg.fromLat, leg.fromLon!]);
        if (leg.toLat != null) bounds.extend([leg.toLat, leg.toLon!]);
      }
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [60, 60] });
    } else if (fromPlace) {
      map.setView([fromPlace.lat, fromPlace.lon], 14);
    }
  }, [map, fromPlace, toPlace, selectedJourney]);

  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

export function Map({ fromPlace, toPlace, selectedJourney }: MapProps) {
  return (
    <MapContainer
      center={[51.505, -0.09]}
      zoom={12}
      className="w-full h-full"
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />

      <MapUpdater fromPlace={fromPlace} toPlace={toPlace} selectedJourney={selectedJourney} />

      {/* ── Route lines ──────────────────────────────────────────────────── */}
      {selectedJourney?.legs.map((leg, i) => {
        const color = getLegColor(leg.mode, leg.lineId);
        const isCycle = leg.mode === "cycle";

        // Use TfL polyline if present; otherwise draw a straight line from
        // the stored coordinates (always available on manually-added legs).
        const positions: [number, number][] | null =
          leg.polyline?.length
            ? leg.polyline.map((p) => [p[0], p[1]])
            : leg.fromLat != null && leg.toLat != null
            ? [
                [leg.fromLat, leg.fromLon!],
                [leg.toLat, leg.toLon!],
              ]
            : null;

        if (!positions) return null;

        return (
          <Polyline
            key={`line-${i}`}
            positions={positions}
            pathOptions={{
              color,
              weight: isCycle ? 4 : 5,
              opacity: 0.85,
              dashArray: isCycle ? "8 7" : undefined,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        );
      })}

      {/* ── Transit stop markers at the START of each transit leg ─────────── */}
      {selectedJourney?.legs.map((leg, i) => {
        if (leg.mode === "cycle" || leg.fromLat == null) return null;
        const color = getLegColor(leg.mode, leg.lineId);
        return (
          <CircleMarker
            key={`from-${i}`}
            center={[leg.fromLat, leg.fromLon!]}
            radius={6}
            pathOptions={{
              color: "white",
              fillColor: color,
              fillOpacity: 1,
              weight: 2,
            }}
          />
        );
      })}

      {/* ── Transit stop marker at the END of the last transit leg ────────── */}
      {(() => {
        if (!selectedJourney) return null;
        const lastTransit = [...selectedJourney.legs]
          .reverse()
          .find((l) => l.mode !== "cycle");
        if (!lastTransit?.toLat) return null;
        const color = getLegColor(lastTransit.mode, lastTransit.lineId);
        return (
          <CircleMarker
            center={[lastTransit.toLat, lastTransit.toLon!]}
            radius={6}
            pathOptions={{
              color: "white",
              fillColor: color,
              fillOpacity: 1,
              weight: 2,
            }}
          />
        );
      })()}

      {/* ── Origin (A) and destination (B) markers — on top of everything ─── */}
      {fromPlace && (
        <Marker position={[fromPlace.lat, fromPlace.lon]} icon={originIcon} />
      )}
      {toPlace && (
        <Marker position={[toPlace.lat, toPlace.lon]} icon={destIcon} />
      )}
    </MapContainer>
  );
}
