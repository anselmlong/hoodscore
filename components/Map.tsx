"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import { useRouter } from "next/navigation";
import L from "leaflet";
import type { AreaScore } from "@/types";

interface MapProps {
  areas: AreaScore[];
  loading?: boolean;
}

function scoreColor(score: number): string {
  if (score >= 70) return "#059669";
  if (score >= 40) return "#d97706";
  return "#dc2626";
}

function scoreFillOpacity(score: number): number {
  if (score >= 70) return 0.65;
  if (score >= 40) return 0.6;
  return 0.55;
}

interface GeoFeature {
  type: "Feature";
  properties: { name: string; slug: string; region: string };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

function MapContent({ areas, geoData }: { areas: AreaScore[]; geoData: GeoFeature[]; loading?: boolean }) {
  const router = useRouter();
  const map = useMap();

  const scoreLookup: Record<string, number> = {};
  areas.forEach((a) => { scoreLookup[a.area.slug] = a.overall; });
  const visibleSlugs = new Set(areas.map((a) => a.area.slug));
  const visibleGeoData = geoData.filter((feature) => visibleSlugs.has(feature.properties.slug));
  const layerKey = areas
    .map((a) => `${a.area.slug}:${a.overall.toFixed(2)}`)
    .join("|");

  const geoJson = {
    type: "FeatureCollection" as const,
    features: visibleGeoData,
  };

  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <GeoJSON
        key={layerKey}
        data={geoJson}
        style={(feature) => {
          const slug = feature?.properties?.slug;
          const overall = slug ? scoreLookup[slug] : undefined;
          const score = overall ?? 0;
          return {
            fillColor: scoreColor(score),
            weight: 1,
            opacity: 0.8,
            color: "#374151",
            fillOpacity: scoreFillOpacity(score),
          };
        }}
        onEachFeature={(feature, layer) => {
          const name = feature.properties?.name ?? "";
          const slug = feature.properties?.slug ?? "";

          layer.bindTooltip(name, {
            sticky: true,
            direction: "top",
            offset: L.point(0, -8),
            className: "bg-white text-civic-800 border border-gray-200 shadow-sm rounded-md px-2 py-1 text-sm font-medium",
          });

          layer.on({
            click: () => {
              if (slug) router.push(`/area/${slug}`);
            },
            mouseover: (e) => {
              const target = e.target;
              target.setStyle({ weight: 2, color: "#1f2937", fillOpacity: 0.8 });
              target.bringToFront();
            },
            mouseout: (e) => {
              const target = e.target;
              target.setStyle({ weight: 1, color: "#374151", fillOpacity: scoreFillOpacity(scoreLookup[slug] ?? 50) });
            },
          });
        }}
      />

      {/* Legend */}
      <div className="leaflet-bottom leaflet-left">
        <div className="leaflet-control leaflet-bar bg-white/90 rounded-md p-2 shadow-sm text-xs border border-gray-200 ml-3 mb-3">
          <p className="font-semibold text-civic-700 mb-1">Score</p>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#dc2626" }} />
            <span className="text-civic-500">0-39</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#d97706" }} />
            <span className="text-civic-500">40-69</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#059669" }} />
            <span className="text-civic-500">70-100</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Map({ areas, loading }: MapProps) {
  const [geoData, setGeoData] = useState<GeoFeature[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/planning-areas.geojson")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load boundary data");
        return r.json();
      })
      .then((data) => {
        if (data?.features) setGeoData(data.features);
        else throw new Error("Invalid GeoJSON format");
      })
      .catch((err) => setError(err.message));
  }, []);

  if (loading) {
    return (
      <div className="h-[70vh] bg-civic-50 rounded-lg border border-gray-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-civic-300 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-sm text-civic-400">Loading map</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[70vh] bg-civic-50 rounded-lg border border-gray-200 flex items-center justify-center">
        <p className="text-sm text-red-500">Could not load map data: {error}</p>
      </div>
    );
  }

  if (geoData.length === 0) {
    return (
      <div className="h-[70vh] bg-civic-50 rounded-lg border border-gray-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-civic-300 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-sm text-civic-400">Loading boundaries</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[70vh] rounded-lg border border-gray-200 overflow-hidden">
      <MapContainer
        center={[1.3521, 103.8198]}
        zoom={11}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <MapContent areas={areas} geoData={geoData} />
      </MapContainer>
    </div>
  );
}
