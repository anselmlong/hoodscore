"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HouseLine, List, X } from "@phosphor-icons/react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const navLinks = [
    { href: "/explore", label: "Explore" },
    { href: "/compare", label: "Compare" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-civic-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 text-civic-800 font-semibold text-lg no-underline">
            <HouseLine className="h-6 w-6" weight="duotone" aria-hidden="true" />
            Hood Score
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1" aria-label="Primary navigation">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium no-underline transition-colors ${
                    active
                      ? "bg-civic-50 text-civic-900"
                      : "text-civic-600 hover:bg-civic-50 hover:text-civic-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 text-civic-600 hover:text-civic-900 rounded-md hover:bg-gray-100"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-primary-navigation"
          >
            {menuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <List className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <nav id="mobile-primary-navigation" className="sm:hidden pb-3 border-t border-gray-100 pt-2" aria-label="Primary navigation">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded-md px-2 py-2 text-sm no-underline ${
                    active
                      ? "bg-civic-50 text-civic-900"
                      : "text-civic-600 hover:text-civic-900"
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
