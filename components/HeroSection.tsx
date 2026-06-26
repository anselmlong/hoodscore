"use client";

export default function HeroSection() {
  const handleExploreClick = () => {
    const el = document.getElementById("explore-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative flex items-center justify-center min-h-[33vh] bg-gradient-to-br from-civic-50 via-white to-emerald-50 border-b border-gray-200 overflow-hidden">
      {/* Subtle decorative elements */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-100/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-civic-100/20 blur-3xl" />
      </div>

      <div className="relative z-10 text-center px-4 py-10 max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-civic-900 leading-tight mb-3">
          Where should you live in Singapore?
        </h1>
        <p className="text-base sm:text-lg text-civic-600 mb-6 max-w-lg mx-auto">
          A data-driven livability score for every planning area.
        </p>
        <button
          onClick={handleExploreClick}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          Explore the map
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
          </svg>
        </button>
      </div>
    </section>
  );
}