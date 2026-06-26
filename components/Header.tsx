"use client";

import { useState } from "react";
import Link from "next/link";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 text-civic-800 font-semibold text-lg no-underline">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Hood Score
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-6">
            <Link href="/explore" className="text-sm text-civic-600 hover:text-civic-900 transition-colors no-underline">
              Explore
            </Link>
            <Link href="/compare" className="text-sm text-civic-600 hover:text-civic-900 transition-colors no-underline">
              Compare
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 text-civic-600 hover:text-civic-900 rounded-md hover:bg-gray-100"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <nav className="sm:hidden pb-3 border-t border-gray-100 pt-2">
            <Link
              href="/explore"
              className="block py-2 text-sm text-civic-600 hover:text-civic-900 no-underline"
              onClick={() => setMenuOpen(false)}
            >
              Explore
            </Link>
            <Link
              href="/compare"
              className="block py-2 text-sm text-civic-600 hover:text-civic-900 no-underline"
              onClick={() => setMenuOpen(false)}
            >
              Compare
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}