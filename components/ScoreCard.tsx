"use client";

import type { Dimension } from "@/types";

interface ScoreCardProps {
  dimension: Dimension;
  score: number;
  rawValue: number | null;
  unit: string;
  label: string;
}

function scoreColor(score: number): string {
  if (score >= 70) return "#059669";
  if (score >= 40) return "#d97706";
  return "#dc2626";
}

function scoreBgClass(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

export default function ScoreCard({ dimension, score, rawValue, unit, label }: ScoreCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-civic-500 uppercase tracking-wide">{label}</span>
        <span
          className="text-lg font-bold"
          style={{ color: scoreColor(score) }}
        >
          {Math.round(score)}
        </span>
      </div>

      {/* Colour bar */}
      <div
        className="w-full h-2 rounded-full bg-gray-100 overflow-hidden"
        role="meter"
        aria-label={`${label} score`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(score)}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${scoreBgClass(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Raw value context */}
      {rawValue !== null && rawValue !== undefined && (
        <p className="text-xs text-civic-400 mt-1 leading-tight">
          {rawValue.toLocaleString()} {unit}
        </p>
      )}
    </div>
  );
}
