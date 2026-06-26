"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AreaScore, Dimension } from "@/types";

const DIMENSIONS: Dimension[] = ["transit", "food", "schools", "green", "safety", "affordability"];

interface AreaListProps {
  areas: AreaScore[];
  onCompare?: (slug: string, checked: boolean) => void;
  compareSlugs?: string[];
}

type SortKey = "rank" | "overall" | Dimension;

function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
}

function Sparkline({ dimensions }: { dimensions: AreaScore["dimensions"] }) {
  const maxVal = 100;
  const w = 60;
  const h = 14;
  const step = w / (dimensions.length - 1);

  const points = dimensions.map((d, i) => `${i * step},${h - (d.score / maxVal) * h}`).join(" ");

  return (
    <svg width={w} height={h} className="shrink-0" viewBox={`0 0 ${w} ${h}`}>
      <polyline
        fill="none"
        stroke="#059669"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {dimensions.map((d, i) => (
        <circle
          key={d.dimension}
          cx={i * step}
          cy={h - (d.score / maxVal) * h}
          r="1.5"
          fill={d.score >= 70 ? "#059669" : d.score >= 40 ? "#d97706" : "#dc2626"}
        />
      ))}
    </svg>
  );
}

export default function AreaList({ areas, onCompare, compareSlugs }: AreaListProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("overall");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sortedAreas = useMemo(() => {
    const sorted = [...areas];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "rank") {
        cmp = a.overall - b.overall;
      } else if (sortKey === "overall") {
        cmp = a.overall - b.overall;
      } else {
        const aDim = a.dimensions.find((d) => d.dimension === sortKey);
        const bDim = b.dimensions.find((d) => d.dimension === sortKey);
        cmp = (aDim?.score ?? 0) - (bDim?.score ?? 0);
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return sorted;
  }, [areas, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir(key === "overall" ? "desc" : "desc");
    }
  };

  const sortLabel = (col: SortKey) => {
    if (sortKey !== col) return "none";
    return sortDir === "desc" ? "descending" : "ascending";
  };

  const renderSortIcon = (col: SortKey) => {
    if (sortKey !== col) return <span className="text-civic-300 ml-1">↕</span>;
    return <span className="text-civic-600 ml-1">{sortDir === "desc" ? "↓" : "↑"}</span>;
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-civic-50 border-b border-gray-200">
            {onCompare && <th className="w-8 px-2 py-2"></th>}
            <th className="px-3 py-2 text-left font-semibold text-civic-600 whitespace-nowrap" aria-sort={sortLabel("rank") as "ascending" | "descending" | "none" | "other"}>
              <button
                type="button"
                onClick={() => handleSort("rank")}
                className="inline-flex items-center font-semibold"
              >
                #{renderSortIcon("rank")}
              </button>
            </th>
            <th className="px-3 py-2 text-left font-semibold text-civic-600 whitespace-nowrap">Area</th>
            <th className="px-3 py-2 text-left font-semibold text-civic-600 whitespace-nowrap" aria-sort={sortLabel("overall") as "ascending" | "descending" | "none" | "other"}>
              <button
                type="button"
                onClick={() => handleSort("overall")}
                className="inline-flex items-center font-semibold"
              >
                Score{renderSortIcon("overall")}
              </button>
            </th>
            {DIMENSIONS.map((d) => (
              <th
                key={d}
                className="hidden md:table-cell px-2 py-2 text-left font-semibold text-civic-600 whitespace-nowrap text-xs"
                aria-sort={sortLabel(d) as "ascending" | "descending" | "none" | "other"}
              >
                <button
                  type="button"
                  onClick={() => handleSort(d)}
                  className="inline-flex items-center font-semibold"
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}{renderSortIcon(d)}
                </button>
              </th>
            ))}
            <th className="hidden lg:table-cell px-2 py-2 text-left font-semibold text-civic-600 whitespace-nowrap text-xs">
              Trend
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedAreas.map((a, idx) => {
            const rank = idx + 1;
            return (
              <tr
                key={a.area.slug}
                className="border-b border-gray-100 hover:bg-civic-50/50 cursor-pointer transition-colors"
                onClick={() => router.push(`/area/${a.area.slug}`)}
              >
                {onCompare && (
                  <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={compareSlugs?.includes(a.area.slug) ?? false}
                      onChange={(e) => onCompare?.(a.area.slug, e.target.checked)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                )}
                <td className="px-3 py-2 text-civic-400 font-mono text-xs">{rank}</td>
                <td className="px-3 py-2 font-medium text-civic-800">{a.area.name}</td>
                <td className={`px-3 py-2 font-bold ${scoreColor(a.overall)}`}>
                  {Math.round(a.overall)}
                </td>
                {DIMENSIONS.map((d) => {
                  const dim = a.dimensions.find((ds) => ds.dimension === d);
                  return (
                    <td key={d} className={`hidden md:table-cell px-2 py-2 ${scoreColor(dim?.score ?? 0)}`}>
                      {dim ? Math.round(dim.score) : "N/A"}
                    </td>
                  );
                })}
                <td className="hidden lg:table-cell px-2 py-2">
                  <Sparkline dimensions={a.dimensions} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {areas.length === 0 && (
        <div className="py-8 text-center text-sm text-civic-400">
          No planning areas found.
        </div>
      )}
    </div>
  );
}
