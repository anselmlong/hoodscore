"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import CompareTable from "@/components/CompareTable";
import SearchBar from "@/components/SearchBar";
import WeightQuiz from "@/components/WeightQuiz";
import type { AreaScore } from "@/types";

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [areas, setAreas] = useState<AreaScore[]>([]);
  const [allAreas, setAllAreas] = useState<AreaScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const slugs = searchParams.get("areas")?.split(",").filter(Boolean) ?? [];

  const fetchComparison = useCallback(async (slugs: string[], weightsParam?: string) => {
    setLoading(true);
    setError(null);
    try {
      let weights: Record<string, number> | undefined;

      if (weightsParam) {
        // Parse "transit:1.5,food:0.8" format
        const wObj: Record<string, number> = {};
        weightsParam.split(",").forEach((part) => {
          const [k, v] = part.split(":");
          if (k && v) wObj[k.trim()] = parseFloat(v);
        });
        if (Object.keys(wObj).length > 0) weights = wObj;
      }

      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs, weights }),
      });
      if (!res.ok) throw new Error("Failed to compare areas");
      const json = await res.json();
      setAreas(json?.data?.comparison ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all areas for the search bar
  useEffect(() => {
    fetch("/api/scores")
      .then((r) => r.json())
      .then((json) => setAllAreas(json?.data?.areas ?? []))
      .catch(() => {}); // non-critical
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const weightsRaw = params.get("weights");

    if (slugs.length > 0) {
      fetchComparison(slugs, weightsRaw ?? undefined);
    } else {
      setLoading(false);
    }
  }, [slugs, fetchComparison]);

  // Listen for weight changes
  useEffect(() => {
    const handler = () => {
      const params = new URLSearchParams(window.location.search);
      const weightsRaw = params.get("weights");
      if (slugs.length > 0) {
        fetchComparison(slugs, weightsRaw ?? undefined);
      }
    };
    window.addEventListener("weights-changed", handler);
    return () => window.removeEventListener("weights-changed", handler);
  }, [slugs, fetchComparison]);

  const handleSelectArea = useCallback(
    (slug: string) => {
      const current = new Set(slugs);
      if (current.has(slug)) return;
      current.add(slug);
      const newSlugs = Array.from(current);
      router.push(`/compare?areas=${newSlugs.join(",")}`);
    },
    [slugs, router]
  );

  const handleRemoveArea = useCallback(
    (slug: string) => {
      const current = slugs.filter((s) => s !== slug);
      if (current.length > 0) {
        router.push(`/compare?areas=${current.join(",")}`);
      } else {
        router.push("/compare");
      }
    },
    [slugs, router]
  );

  const handleShare = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const handleFilterChange = useCallback((_slugs: string[]) => {
    // No-op for compare page — we use SearchBar just for suggesting areas
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-civic-800">Compare Areas</h1>
          <p className="text-sm text-civic-500 mt-0.5">
            Side-by-side comparison of {slugs.length > 0 ? `${slugs.length} area${slugs.length > 1 ? "s" : ""}` : "planning areas"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleShare}
            className="px-3 py-1.5 text-xs font-medium text-civic-600 border border-gray-200 rounded-lg hover:bg-civic-50 transition-colors flex items-center gap-1.5"
          >
            {copied ? (
              <>✅ Copied</>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share
              </>
            )}
          </button>
          <button
            onClick={() => setWeightsOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-civic-600 border border-gray-200 rounded-lg hover:bg-civic-50 transition-colors"
          >
            Customise weights
          </button>
        </div>
      </div>

      {/* Add areas via search */}
      <div className="mb-4">
        <SearchBar
          areas={allAreas}
          onFilterChange={handleFilterChange}
          showPills={false}
          placeholder="Add an area to compare…"
        />
      </div>

      {/* Selected areas pills */}
      {slugs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {slugs.map((slug) => {
            const area = allAreas.find((a) => a.area.slug === slug);
            return (
              <span
                key={slug}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-civic-50 text-civic-700 border border-civic-200 rounded-full"
              >
                {area?.area.name ?? slug}
                <button
                  onClick={() => handleRemoveArea(slug)}
                  className="text-civic-400 hover:text-red-500 ml-0.5"
                  aria-label={`Remove ${area?.area.name ?? slug}`}
                >
                  ✕
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Compare table */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-12 bg-civic-50 rounded-lg" />
          <div className="h-12 bg-civic-50 rounded-lg" />
          <div className="h-12 bg-civic-50 rounded-lg" />
          <div className="h-12 bg-civic-50 rounded-lg" />
          <div className="h-12 bg-civic-50 rounded-lg" />
          <div className="h-12 bg-civic-50 rounded-lg" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      ) : (
        <CompareTable areas={areas} />
      )}

      <WeightQuiz
        isOpen={weightsOpen}
        onClose={() => setWeightsOpen(false)}
      />
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-6"><div className="animate-pulse space-y-3"><div className="h-12 bg-civic-50 rounded-lg" /><div className="h-12 bg-civic-50 rounded-lg" /><div className="h-12 bg-civic-50 rounded-lg" /></div></div>}>
      <CompareContent />
    </Suspense>
  );
}