"use client";

import { useEffect, useRef, useState } from "react";
import Map, { Marker, Source, Layer, type MapRef } from "react-map-gl/maplibre";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { LoadingGrain } from "./LoadingGrain";

type TerrainMapProps = {
  lat: number | null;
  lon: number | null;
  trail: [number, number][];
  altitudeFt?: number | null;
  maxAltitudeFt?: number;
};

const FALLBACK = { lat: 13.3465, lon: 74.7935 };
const GROUND_ZOOM = 17;
const APOGEE_ZOOM = 12;
const DEFAULT_MAX_ALTITUDE_FT = 29432;

const TERRAIN_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
    terrain: {
      type: "raster-dem",
      tiles: [
        "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      encoding: "terrarium",
      maxzoom: 15,
    },
  },
  layers: [
    { id: "osm", type: "raster", source: "osm" },
    { id: "hillshade", type: "hillshade", source: "terrain" },
  ],
  terrain: { source: "terrain", exaggeration: 1.5 },
};

// tilted globe projection map, spins its own bearing, eases its zoom
// out as altitude climbs so the reveal feels like an actual liftoff,
// and draws the trajectory as a colour graded streak, not a flat line
export const TerrainMap = ({
  lat,
  lon,
  trail,
  altitudeFt = null,
  maxAltitudeFt = DEFAULT_MAX_ALTITUDE_FT,
}: TerrainMapProps) => {
  const mapRef = useRef<MapRef>(null);
  const [loaded, setLoaded] = useState(false);
  const lastZoomAltRef = useRef<number | null>(null);
  const centerLat = lat ?? FALLBACK.lat;
  const centerLon = lon ?? FALLBACK.lon;

  useEffect(() => {
    let frame: number;
    const spin = () => {
      const map = mapRef.current?.getMap();
      if (map) map.setBearing((map.getBearing() + 0.05) % 360);
      frame = requestAnimationFrame(spin);
    };
    frame = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !loaded || altitudeFt === null) return;
    const prev = lastZoomAltRef.current;
    if (prev !== null && Math.abs(altitudeFt - prev) < 400) return;
    lastZoomAltRef.current = altitudeFt;
    const t = Math.min(1, altitudeFt / maxAltitudeFt);
    const zoom = GROUND_ZOOM - t * (GROUND_ZOOM - APOGEE_ZOOM);
    map.easeTo({ zoom, duration: 900 });
  }, [altitudeFt, loaded]);

  const handleLoad = () => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.scrollZoom.setWheelZoomRate(1 / 150);
    map.scrollZoom.setZoomRate(1 / 60);
    setLoaded(true);
  };

  const trailGeoJson = {
    type: "Feature" as const,
    geometry: { type: "LineString" as const, coordinates: trail },
    properties: {},
  };

  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 z-10">
          <LoadingGrain label="loading terrain" />
        </div>
      )}
      <Map
        ref={mapRef}
        onLoad={handleLoad}
        initialViewState={{
          longitude: centerLon,
          latitude: centerLat,
          zoom: GROUND_ZOOM,
          pitch: 60,
        }}
        projection="globe"
        mapStyle={TERRAIN_STYLE}
        style={{ width: "100%", height: "100%" }}
      >
        {trail.length > 1 && (
          <Source id="flight-trail" type="geojson" data={trailGeoJson} lineMetrics={true}>
            <Layer
              id="flight-trail-glow"
              type="line"
              paint={{
                "line-color": "#FC3D21",
                "line-width": 10,
                "line-blur": 6,
                "line-opacity": 0.25,
              }}
            />
            <Layer
              id="flight-trail-line"
              type="line"
              paint={{
                "line-width": 3,
                "line-gradient": [
                  "interpolate",
                  ["linear"],
                  ["line-progress"],
                  0,
                  "#FC3D21",
                  0.2,
                  "#D1480F",
                  0.4,
                  "#A2673F",
                  0.65,
                  "#1D7373",
                  1,
                  "#005288",
                ],
              }}
            />
          </Source>
        )}
        {lat !== null && lon !== null && (
          <Marker longitude={lon} latitude={lat}>
            <div className="relative">
              <div className="absolute -inset-2 rounded-full bg-[#FC3D21]/40 animate-ping" />
              <div className="relative h-3 w-3 rounded-full bg-[#FC3D21] border border-console-text/60" />
            </div>
          </Marker>
        )}
      </Map>
    </div>
  );
};
