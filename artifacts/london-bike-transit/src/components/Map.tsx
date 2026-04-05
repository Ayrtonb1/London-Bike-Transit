import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import type { Journey, Place } from "@/lib/transit";

// Fix leaflet default icon
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
  fromPlace: Place | null;
  toPlace: Place | null;
  selectedJourney: Journey | null;
}

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
  if (mode === "cycle") return "#16a34a"; // bright green
  if (mode === "tube" && lineId && TUBE_COLORS[lineId]) return TUBE_COLORS[lineId];
  if (mode === "bus") return "#dc2626"; // red
  if (mode === "overground") return "#ea580c"; // orange
  if (mode === "elizabeth-line") return "#9333ea"; // purple
  if (mode === "dlr") return "#0d9488"; // teal
  if (mode === "national-rail") return "#57534e"; // grey
  return "#71717a"; // fallback grey
}

function MapUpdater({
  fromPlace,
  toPlace,
  selectedJourney,
}: {
  fromPlace: Place | null;
  toPlace: Place | null;
  selectedJourney: Journey | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedJourney && selectedJourney.legs.length > 0) {
      const bounds = L.latLngBounds([]);
      selectedJourney.legs.forEach((leg) => {
        if (leg.polyline) {
          leg.polyline.forEach((coord) => bounds.extend([coord[0], coord[1]]));
        }
      });
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } else if (fromPlace && toPlace) {
      const bounds = L.latLngBounds([
        [fromPlace.lat, fromPlace.lon],
        [toPlace.lat, toPlace.lon],
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (fromPlace) {
      map.setView([fromPlace.lat, fromPlace.lon], 15);
    } else if (toPlace) {
      map.setView([toPlace.lat, toPlace.lon], 15);
    }
  }, [map, fromPlace, toPlace, selectedJourney]);

  return null;
}

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
      <MapUpdater
        fromPlace={fromPlace}
        toPlace={toPlace}
        selectedJourney={selectedJourney}
      />
      {fromPlace && <Marker position={[fromPlace.lat, fromPlace.lon]} />}
      {toPlace && <Marker position={[toPlace.lat, toPlace.lon]} />}

      {selectedJourney &&
        selectedJourney.legs.map((leg, i) => {
          if (!leg.polyline || leg.polyline.length === 0) return null;
          const positions: [number, number][] = leg.polyline.map((p) => [p[0], p[1]]);
          const color = getLegColor(leg.mode, leg.lineId);
          const isCycleSubstituted = leg.mode === "cycle" && leg.isSubstituted;

          return (
            <Polyline
              key={i}
              positions={positions}
              pathOptions={{
                color,
                weight: isCycleSubstituted ? 6 : 5,
                opacity: 0.8,
                dashArray: isCycleSubstituted ? "10, 10" : undefined,
                lineCap: "round",
                lineJoin: "round"
              }}
            />
          );
        })}
    </MapContainer>
  );
}
