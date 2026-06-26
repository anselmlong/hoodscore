"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AreaScore, Dimension } from "@/types";

const DIMENSION_FILTERS: { key: Dimension; label: string }[] = [
  { key: "transit", label: "Best Transit" },
  { key: "food", label: "Best Food" },
  { key: "schools", label: "Best Schools" },
  { key: "green", label: "Greenest" },
  { key: "safety", label: "Safest" },
  { key: "affordability", label: "Most Affordable" },
];

interface SearchBarProps {
  areas: AreaScore[];
  onFilterChange?: (filteredSlugs: string[]) => void;
  showPills?: boolean;
  placeholder?: string;
}

export default function SearchBar({ areas, onFilterChange, showPills = true, placeholder }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeDimension, setActiveDimension] = useState<Dimension | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredAreas = query.trim()
    ? areas.filter((a) =>
        a.area.name.toLowerCase().includes(query.toLowerCase())
      )
    : activeDimension
    ? areas
    : [];

  const displayedAreas = activeDimension
    ? [...areas].sort((a, b) => {
        const aDim = a.dimensions.find((d) => d.dimension === activeDimension);
        const bDim = b.dimensions.find((d) => d.dimension === activeDimension);
        return (bDim?.score ?? 0) - (aDim?.score ?? 0);
      }).slice(0, 10)
    : filteredAreas.slice(0, 8);

  const applyFilters = useCallback(() => {
    if (activeDimension && onFilterChange) {
      const topSlugs = [...areas]
        .sort((a, b) => {
          const aDim = a.dimensions.find((d) => d.dimension === activeDimension);
          const bDim = b.dimensions.find((d) => d.dimension === activeDimension);
          return (bDim?.score ?? 0) - (aDim?.score ?? 0);
        })
        .slice(0, 10)
        .map((a) => a.area.slug);
      onFilterChange(topSlugs);
    } else if (onFilterChange) {
      onFilterChange([]);
    }
  }, [activeDimension, areas, onFilterChange]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (slug: string) => {
    setShowDropdown(false);
    setQuery("");
    router.push(`/area/${slug}`);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-civic-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
              if (activeDimension) setActiveDimension(null);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder={placeholder ?? "Search planning areas…"}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-civic-800 placeholder:text-civic-400"
          />
        </div>

        {/* Autocomplete dropdown */}
        {showDropdown && displayedAreas.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-sm max-h-60 overflow-y-auto"
          >
            {displayedAreas.map((a) => (
              <button
                key={a.area.slug}
                onClick={() => handleSelect(a.area.slug)}
                className="w-full text-left px-3 py-2 text-sm text-civic-700 hover:bg-civic-50 transition-colors flex items-center justify-between"
              >
                <span>{a.area.name}</span>
                <span className="text-xs text-civic-400">{a.area.region}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dimension filter pills */}
      {showPills && (
        <div className="flex flex-wrap gap-2">
          {DIMENSION_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setActiveDimension(activeDimension === f.key ? null : f.key);
                setQuery("");
                setShowDropdown(false);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                activeDimension === f.key
                  ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                  : "bg-white text-civic-600 border-gray-200 hover:border-civic-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}