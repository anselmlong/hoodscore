"use client";

import { useState, useCallback } from "react";
import type { Dimension } from "@/types";

const DIMENSIONS: { key: Dimension; emoji: string; label: string }[] = [
  { key: "transit", emoji: "🚇", label: "Transit" },
  { key: "food", emoji: "🍜", label: "Food" },
  { key: "schools", emoji: "📚", label: "Schools" },
  { key: "green", emoji: "🌳", label: "Green Space" },
  { key: "safety", emoji: "🛡️", label: "Safety" },
  { key: "affordability", emoji: "🏠", label: "Affordability" },
];

const DEFAULT_WEIGHTS: Record<string, number> = {
  transit: 1.0,
  food: 1.0,
  schools: 1.0,
  green: 1.0,
  safety: 1.0,
  affordability: 1.0,
};

interface WeightQuizProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeights?: Record<string, number>;
}

export default function WeightQuiz({ isOpen, onClose, currentWeights }: WeightQuizProps) {
  const [weights, setWeights] = useState<Record<string, number>>(currentWeights ?? { ...DEFAULT_WEIGHTS });
  const [mode, setMode] = useState<"quick" | "expert">("quick");

  const handleReset = useCallback(() => {
    setWeights({ ...DEFAULT_WEIGHTS });
  }, []);

  const handleApply = useCallback(() => {
    const params = new URLSearchParams();
    const weightStr = Object.entries(weights)
      .map(([k, v]) => `${k}:${v.toFixed(1)}`)
      .join(",");
    params.set("weights", weightStr);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
    // Dispatch a custom event so other components can react
    window.dispatchEvent(new CustomEvent("weights-changed", { detail: weights }));
    onClose();
  }, [weights, onClose]);

  const updateWeight = (key: string, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: Math.round(value * 10) / 10 }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-civic-800">Customise Weights</h2>
          <button
            onClick={onClose}
            className="p-1 text-civic-400 hover:text-civic-600 rounded-md hover:bg-gray-100"
            aria-label="Close"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 px-4 pt-3">
          <button
            onClick={() => setMode("quick")}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              mode === "quick"
                ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                : "bg-white text-civic-600 border border-gray-200"
            }`}
          >
            Quick Quiz
          </button>
          <button
            onClick={() => setMode("expert")}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              mode === "expert"
                ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                : "bg-white text-civic-600 border border-gray-200"
            }`}
          >
            Expert
          </button>
        </div>

        {/* Sliders */}
        <div className="p-4 space-y-4">
          {DIMENSIONS.map((dim) => {
            const val = weights[dim.key] ?? 1.0;
            return (
              <div key={dim.key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-civic-700">
                    {dim.emoji} {dim.label}
                  </label>
                  <span className="text-sm font-mono text-civic-500">{val.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  value={val}
                  onChange={(e) => updateWeight(dim.key, parseFloat(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none bg-gray-100 accent-emerald-600 cursor-pointer"
                />
                {mode === "expert" && (
                  <div className="flex justify-between text-xs text-civic-400 mt-0.5">
                    <span>Ignore</span>
                    <span>Normal</span>
                    <span>Very important</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-200">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-civic-600 border border-gray-200 rounded-lg hover:bg-civic-50 transition-colors"
          >
            Reset to equal
          </button>
          <button
            onClick={handleApply}
            className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Apply weights
          </button>
        </div>
      </div>
    </div>
  );
}