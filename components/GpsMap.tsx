"use client";

import Map, { Marker, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

type GpsMapProps = {
  lat: number | null;
  lon: number | null;
  trail: [number, number][];
};

const FALLBACK = { lat: 13.3465, lon: 74.7935 };

// uses maplibre's free demo style, no api key, needs internet for tiles
export const GpsMap = ({ lat, lon, trail }: GpsMapProps) => {
  const centerLat = lat ?? FALLBACK.lat;
  const centerLon = lon ?? FALLBACK.lon;

  const trailGeoJson = {
    type: "Feature" as const,
    geometry: {
      type: "LineString" as const,
      coordinates: trail,
    },
    properties: {},
  };

  return (
    <div className="panel h-[320px] overflow-hidden">
      <Map
        initialViewState={{ longitude: centerLon, latitude: centerLat, zoom: 15 }}
        mapStyle="https://demotiles.maplibre.org/style.json"
        style={{ width: "100%", height: "100%" }}
      >
        {trail.length > 1 && (
          <Source id="trail" type="geojson" data={trailGeoJson}>
            <Layer
              id="trail-line"
              type="line"
              paint={{ "line-color": "#08548A", "line-width": 2 }}
            />
          </Source>
        )}
        {lat !== null && lon !== null && (
          <Marker longitude={lon} latitude={lat} color="#FF3B21" />
        )}
      </Map>
    </div>
  );
};
