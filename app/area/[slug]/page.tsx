"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { CaretLeft } from "@phosphor-icons/react";
import ScoreCard from "@/components/ScoreCard";
import WeightQuiz from "@/components/WeightQuiz";
import type { AreaScore, Dimension } from "@/types";

function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
}

function scoreBg(score: number): string {
  if (score >= 70) return "bg-emerald-50 border-emerald-200";
  if (score >= 40) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

export default function AreaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [area, setArea] = useState<AreaScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchArea = useCallback(async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(window.location.search);
      const weightsRaw = params.get("weights");
      let url = `/api/areas?slug=${encodeURIComponent(slug)}`;
      if (weightsRaw) {
        // Convert "transit:1.5,food:0.8" to JSON
        const wObj: Record<string, number> = {};
        weightsRaw.split(",").forEach((part) => {
          const [k, v] = part.split(":");
          if (k && v) wObj[k.trim()] = parseFloat(v);
        });
        url += `&weights=${encodeURIComponent(JSON.stringify(wObj))}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Area not found");
      const json = await res.json();
      setArea(json?.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load area");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (slug) fetchArea(slug);
  }, [slug, fetchArea]);

  // Listen for weight changes
  useEffect(() => {
    const handler = () => {
      if (slug) fetchArea(slug);
    };
    window.addEventListener("weights-changed", handler);
    return () => window.removeEventListener("weights-changed", handler);
  }, [slug, fetchArea]);

  const handleCompare = useCallback(() => {
    if (!area) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const existing = params.get("areas");
      const slugs = existing ? existing.split(",") : [];
      if (!slugs.includes(area.area.slug)) {
        slugs.push(area.area.slug);
      }
      params.set("areas", slugs.join(","));
      const url = `/compare?${params.toString()}`;
      setToastMsg(`Added ${area.area.name} to comparison`);
      setTimeout(() => setToastMsg(null), 2500);

      // Navigate after brief delay
      setTimeout(() => {
        router.push(url);
      }, 800);
    } catch {
      // silent
    }
  }, [area, router]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-civic-100 rounded w-1/3" />
          <div className="h-4 bg-civic-100 rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-civic-50 rounded-lg border border-gray-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !area) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
          <p className="text-red-600 font-medium">{error ?? "Planning area not found"}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-3 px-4 py-2 text-sm text-civic-600 border border-gray-200 rounded-lg hover:bg-civic-50"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back button */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1 text-sm text-civic-500 hover:text-civic-700 mb-4"
        >
          <CaretLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>

        {/* Header: big score + name */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-civic-900">{area.area.name}</h1>
            <p className="text-sm text-civic-500">{area.area.region}</p>
            {area.area.population && (
              <p className="text-xs text-civic-400 mt-0.5">
                Population: {area.area.population.toLocaleString()}
              </p>
            )}
          </div>

          <div className={`flex items-center gap-3 px-5 py-3 rounded-lg border ${scoreBg(area.overall)}`}>
            <span className={`text-4xl sm:text-5xl font-bold ${scoreColor(area.overall)}`}>
              {Math.round(area.overall)}
            </span>
            <div>
              <p className="text-xs font-medium text-civic-500 uppercase tracking-wide">Overall</p>
              <p className="text-xs text-civic-400">
                {area.overall >= 70 ? "High livability" : area.overall >= 40 ? "Moderate" : "Low"}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setWeightsOpen(true)}
            className="px-4 py-2 text-sm font-medium text-civic-600 border border-gray-200 rounded-lg hover:bg-civic-50 transition-colors"
          >
            Customise your weights
          </button>
          <button
            onClick={handleCompare}
            className="px-4 py-2 text-sm font-medium text-white bg-civic-600 rounded-lg hover:bg-civic-700 transition-colors"
          >
            Compare this area
          </button>
        </div>

        {/* Dimension breakdown */}
        <h2 className="text-lg font-semibold text-civic-800 mb-3">Dimension Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {area.dimensions.map((dim) => (
            <ScoreCard
              key={dim.dimension}
              dimension={dim.dimension as Dimension}
              score={dim.score}
              rawValue={dim.rawValue}
              unit={dim.unit}
              label={dim.label}
            />
          ))}
        </div>
      </div>

      {/* Toast notification */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-civic-800 text-white text-sm rounded-lg shadow-lg animate-[fadeIn_0.2s_ease-out]">
          {toastMsg}
        </div>
      )}

      <WeightQuiz
        isOpen={weightsOpen}
        onClose={() => setWeightsOpen(false)}
      />
    </>
  );
}
