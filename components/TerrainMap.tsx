"use client";

import { useEffect, useRef, useState } from "react";
import Map, { Marker, Source, Layer, type MapRef } from "react-map-gl/maplibre";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { LoadingGrain } from "./LoadingGrain";
import { useIsDark } from "@/lib/theme/useIsDark";

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

// carto's free no-key basemaps, dark and light variants so the map
// actually follows the app's own theme toggle instead of always
// showing the same light osm tiles regardless of theme
const buildStyle = (isDark: boolean): StyleSpecification => ({
  version: 8,
  sources: {
    basemap: {
      type: "raster",
      tiles: [
        isDark
          ? "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
          : "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© CARTO, © OpenStreetMap contributors",
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
    { id: "basemap", type: "raster", source: "basemap" },
    {
      id: "hillshade",
      type: "hillshade",
      source: "terrain",
      paint: {
        "hillshade-shadow-color": isDark ? "#0A0A0A" : "#9A9A9A",
        "hillshade-highlight-color": isDark ? "#B6B6B6" : "#FFFFFF",
      },
    },
  ],
  terrain: { source: "terrain", exaggeration: 1.5 },
});

// tilted globe projection map, spins its own bearing, eases its zoom
// out as altitude climbs, and keeps itself correctly sized via its
// own resize observer so it never gets stuck at a stale size when a
// sidebar is dragged or a panel is expanded
export const TerrainMap = ({
  lat,
  lon,
  trail,
  altitudeFt = null,
  maxAltitudeFt = DEFAULT_MAX_ALTITUDE_FT,
}: TerrainMapProps) => {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const lastZoomAltRef = useRef<number | null>(null);
  const isDark = useIsDark();
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

  // maplibre does not automatically notice a css driven container
  // resize, this keeps the canvas correctly sized whenever its parent
  // box changes, whatever caused that change
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      mapRef.current?.getMap()?.resize();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
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
    <div ref={containerRef} className="relative w-full h-full">
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
        mapStyle={buildStyle(isDark)}
        style={{ width: "100%", height: "100%" }}
      >
        {trail.length > 1 && (
          <Source id="flight-trail" type="geojson" data={trailGeoJson}>
            <Layer
              id="flight-trail-glow"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{
                "line-color": "#FC3D21",
                "line-width": 11,
                "line-blur": 6,
                "line-opacity": 0.35,
              }}
            />
            <Layer
              id="flight-trail-line"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{
                "line-color": "#FC3D21",
                "line-width": 3.5,
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
