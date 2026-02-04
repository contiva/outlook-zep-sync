"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const lastVisible = useRef(false);

  useEffect(() => {
    let rafId: number | null = null;

    const toggleVisibility = () => {
      if (rafId) return; // Skip if already scheduled

      rafId = requestAnimationFrame(() => {
        rafId = null;
        const shouldBeVisible = window.scrollY > 300;
        // Only update state if changed
        if (shouldBeVisible !== lastVisible.current) {
          lastVisible.current = shouldBeVisible;
          setIsVisible(shouldBeVisible);
        }
      });
    };

    window.addEventListener("scroll", toggleVisibility, { passive: true });
    return () => {
      window.removeEventListener("scroll", toggleVisibility);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-6 right-6 p-3 bg-white text-gray-600 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 hover:text-gray-900 hover:shadow-xl transition-all z-50 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      aria-label="Nach oben scrollen"
      title="Nach oben"
    >
      <ArrowUp size={20} />
    </button>
  );
}
