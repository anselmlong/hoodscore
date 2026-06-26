"use client";

import type { AreaScore, Dimension } from "@/types";

const DIMENSIONS: Dimension[] = ["transit", "food", "schools", "green", "safety", "affordability"];

interface CompareTableProps {
  areas: AreaScore[];
}

function scoreColor(score: number): string {
  if (score >= 70) return "#059669";
  if (score >= 40) return "#d97706";
  return "#dc2626";
}

function ScoreBar({ score, isWinner }: { score: number; isWinner: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${score}%`,
            backgroundColor: scoreColor(score),
          }}
        />
      </div>
      <span
        className={`text-sm font-bold ${isWinner ? "text-civic-900" : "text-civic-400"}`}
        style={{ color: isWinner ? scoreColor(score) : undefined }}
      >
        {Math.round(score)}
      </span>
    </div>
  );
}

export default function CompareTable({ areas }: CompareTableProps) {
  if (areas.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-civic-400">
        No areas selected for comparison.
      </div>
    );
  }

  // Find winner per dimension
  const winners = new Map<string, number>();
  const dimScores = DIMENSIONS.map((d) => {
    const scores = areas.map((a) => {
      const dim = a.dimensions.find((ds) => ds.dimension === d);
      return { slug: a.area.slug, score: dim?.score ?? 0 };
    });
    const maxScore = Math.max(...scores.map((s) => s.score));
    return { dimension: d, maxScore };
  });

  dimScores.forEach((ds) => {
    areas.forEach((a) => {
      const dim = a.dimensions.find((d) => d.dimension === ds.dimension);
      if (dim && dim.score === ds.maxScore && ds.maxScore > 0) {
        winners.set(`${a.area.slug}-${ds.dimension}`, 1);
      }
    });
  });

  // Overall winner
  const overallMax = Math.max(...areas.map((a) => a.overall));

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-civic-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left font-semibold text-civic-600 whitespace-nowrap w-40">Dimension</th>
            {areas.map((a) => (
              <th key={a.area.slug} className="px-4 py-3 text-left font-semibold text-civic-800 whitespace-nowrap">
                {a.area.name}
                {a.area.region && (
                  <span className="block text-xs font-normal text-civic-400">{a.area.region}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Overall row */}
          <tr className="border-b border-gray-200 bg-civic-50/50">
            <td className="px-4 py-3 font-semibold text-civic-700">Overall</td>
            {areas.map((a) => (
              <td key={a.area.slug} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${a.overall}%`,
                        backgroundColor: scoreColor(a.overall),
                      }}
                    />
                  </div>
                  <span
                    className="text-base font-bold"
                    style={{ color: scoreColor(a.overall) }}
                  >
                    {Math.round(a.overall)}
                  </span>
                  {a.overall === overallMax && (
                    <span className="text-xs text-emerald-600 font-medium">🥇</span>
                  )}
                </div>
              </td>
            ))}
          </tr>

          {/* Dimension rows */}
          {DIMENSIONS.map((d) => {
            const label = areas[0]?.dimensions.find((ds) => ds.dimension === d)?.label ?? d;
            return (
              <tr key={d} className="border-b border-gray-100 hover:bg-civic-50/30">
                <td className="px-4 py-3 text-civic-700 font-medium">{label}</td>
                {areas.map((a) => {
                  const dim = a.dimensions.find((ds) => ds.dimension === d);
                  const isWinner = !!winners.get(`${a.area.slug}-${d}`);
                  return (
                    <td key={a.area.slug} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ScoreBar score={dim?.score ?? 0} isWinner={isWinner} />
                        {isWinner && <span className="text-xs text-emerald-600 shrink-0">✓</span>}
                      </div>
                      {dim?.rawValue !== null && dim?.rawValue !== undefined && (
                        <p className="text-xs text-civic-400 mt-0.5">
                          {dim!.rawValue!.toLocaleString()} {dim!.unit}
                        </p>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}