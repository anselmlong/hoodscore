"use client";

import { useEffect, useState, useCallback } from "react";
import HeroSection from "@/components/HeroSection";
import SearchBar from "@/components/SearchBar";
import dynamic from "next/dynamic";
import AreaList from "@/components/AreaList";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });
import WeightQuiz from "@/components/WeightQuiz";
import type { AreaScore } from "@/types";

export default function HomePage() {
  const [areas, setAreas] = useState<AreaScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredSlugs, setFilteredSlugs] = useState<string[]>([]);
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [compareSlugs, setCompareSlugs] = useState<string[]>([]);
  const [weightsQuery, setWeightsQuery] = useState<string | null>(null);

  const fetchScores = useCallback(async (weights?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = weights
        ? `/api/scores?weights=${encodeURIComponent(weights)}`
        : "/api/scores";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch scores");
      const json = await res.json();
      setAreas(json?.data?.areas ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + listen for weight changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const weightsRaw = params.get("weights");
    setWeightsQuery(weightsRaw);

    if (weightsRaw) {
      // Convert "transit:1.5,food:0.8" to JSON for the API
      const wObj: Record<string, number> = {};
      weightsRaw.split(",").forEach((part) => {
        const [k, v] = part.split(":");
        if (k && v) wObj[k.trim()] = parseFloat(v);
      });
      fetchScores(JSON.stringify(wObj));
    } else {
      fetchScores();
    }

    const handleWeightsChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail as Record<string, number>;
      const nextWeights = Object.entries(detail)
        .map(([k, v]) => `${k}:${v.toFixed(1)}`)
        .join(",");
      setWeightsQuery(nextWeights);
      fetchScores(JSON.stringify(detail));
    };

    window.addEventListener("weights-changed", handleWeightsChanged);
    return () => window.removeEventListener("weights-changed", handleWeightsChanged);
  }, [fetchScores]);

  const handleFilterChange = useCallback((slugs: string[]) => {
    setFilteredSlugs(slugs);
  }, []);

  const handleCompare = useCallback((slug: string, checked: boolean) => {
    setCompareSlugs((prev) =>
      checked ? Array.from(new Set([...prev, slug])) : prev.filter((s) => s !== slug)
    );
  }, []);

  const displayAreas = filteredSlugs.length > 0
    ? areas.filter((a) => filteredSlugs.includes(a.area.slug))
    : areas;

  return (
    <>
      <HeroSection />

      <section id="explore-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-civic-800">Explore Planning Areas</h2>
          <div className="flex items-center gap-3">
            {compareSlugs.length > 0 && (
              <a
                href={`/compare?areas=${compareSlugs.join(",")}${weightsQuery ? `&weights=${encodeURIComponent(weightsQuery)}` : ""}`}
                className="px-3 py-1.5 text-xs font-medium text-white bg-civic-600 rounded-lg hover:bg-civic-700 transition-colors no-underline"
              >
                Compare ({compareSlugs.length})
              </a>
            )}
            <button
              onClick={() => setWeightsOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-civic-600 border border-gray-200 rounded-lg hover:bg-civic-50 transition-colors"
            >
              Customise weights
            </button>
          </div>
        </div>

        <SearchBar areas={areas} onFilterChange={handleFilterChange} />

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <Map areas={displayAreas} loading={loading} />
          </div>
          <div className="lg:col-span-2">
            <AreaList
              areas={displayAreas}
              onCompare={handleCompare}
              compareSlugs={compareSlugs}
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}
      </section>

      <WeightQuiz
        isOpen={weightsOpen}
        onClose={() => setWeightsOpen(false)}
      />
    </>
  );
}
