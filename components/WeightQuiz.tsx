"use client";

import { useEffect, useId, useRef, useState, useCallback } from "react";
import {
  Bus,
  ForkKnife,
  GraduationCap,
  House,
  Park,
  ShieldCheck,
  X,
} from "@phosphor-icons/react";
import type { Dimension } from "@/types";

const DIMENSIONS = [
  { key: "transit", icon: Bus, label: "Transit" },
  { key: "food", icon: ForkKnife, label: "Food" },
  { key: "schools", icon: GraduationCap, label: "Schools" },
  { key: "green", icon: Park, label: "Green space" },
  { key: "safety", icon: ShieldCheck, label: "Safety" },
  { key: "affordability", icon: House, label: "Affordability" },
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
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const focusableSelector = [
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "a[href]",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const focusFirst = () => {
      const first = dialogRef.current?.querySelector<HTMLElement>(focusableSelector);
      first?.focus();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    window.setTimeout(focusFirst, 0);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  const handleReset = useCallback(() => {
    setWeights({ ...DEFAULT_WEIGHTS });
  }, []);

  const handleApply = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-civic-900/45 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-lg shadow-[0_24px_80px_rgba(16,42,67,0.22)] max-w-md w-full max-h-[85vh] overflow-y-auto border border-civic-100"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 id={titleId} className="text-lg font-semibold text-civic-800">Customise weights</h2>
          <button
            onClick={onClose}
            className="p-1 text-civic-400 hover:text-civic-600 rounded-md hover:bg-gray-100"
            aria-label="Close"
          >
              <X className="h-5 w-5" aria-hidden="true" />
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
            const Icon = dim.icon;
            const val = weights[dim.key] ?? 1.0;
            return (
              <div key={dim.key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="flex items-center gap-2 text-sm text-civic-700">
                    <Icon className="h-4 w-4 text-emerald-700" weight="duotone" aria-hidden="true" />
                    {dim.label}
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
