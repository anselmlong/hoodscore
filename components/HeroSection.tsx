"use client";

import { ArrowDown, ChartBar, MapTrifold, SlidersHorizontal } from "@phosphor-icons/react";

export default function HeroSection() {
  const handleExploreClick = () => {
    const el = document.getElementById("explore-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative border-b border-civic-100 bg-[linear-gradient(180deg,#f8fbfd_0%,#ffffff_100%)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(#bcccdc 1px, transparent 1px), linear-gradient(90deg, #bcccdc 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8 lg:py-12">
        <div className="flex max-w-3xl flex-col justify-center">
          <p className="mb-3 text-sm font-semibold text-emerald-700">Singapore planning area scores</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.01em] text-civic-900 sm:text-5xl">
            Compare neighborhoods with data you can adjust.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-civic-600">
            Rank all 55 planning areas by transit, food, schools, green space, safety, and affordability.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={handleExploreClick}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(4,120,87,0.18)] hover:bg-emerald-800 active:translate-y-px"
            >
              Explore map
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </button>
            <a
              href="/compare"
              className="inline-flex items-center gap-2 rounded-lg border border-civic-200 bg-white px-5 py-2.5 text-sm font-semibold text-civic-700 no-underline hover:border-civic-300 hover:bg-civic-50 active:translate-y-px"
            >
              Compare areas
            </a>
          </div>
        </div>

        <div className="grid content-center gap-3">
          {[
            { icon: MapTrifold, label: "55 areas", detail: "Planning-area coverage" },
            { icon: ChartBar, label: "6 dimensions", detail: "Comparable score breakdowns" },
            { icon: SlidersHorizontal, label: "Adjustable", detail: "Weight the factors you care about" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-4 rounded-lg border border-civic-100 bg-white/90 p-4 shadow-[0_12px_34px_rgba(16,42,67,0.06)]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                  <Icon className="h-6 w-6" weight="duotone" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-civic-900">{item.label}</p>
                  <p className="text-sm text-civic-500">{item.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
