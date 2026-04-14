import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { trackScrollDepth, trackTimeOnPage } from "@/lib/tracking";

const SCROLL_THRESHOLDS = [25, 50, 75, 100];
const TIME_MILESTONES = [15, 30, 60, 120, 300];

export function usePageTracking() {
  const location = useLocation();
  const pagePath = location.pathname;
  const scrollFired = useRef<Set<number>>(new Set());
  const timeFired = useRef<Set<number>>(new Set());
  const elapsed = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    scrollFired.current.clear();
    timeFired.current.clear();
    elapsed.current = 0;

    // --- Scroll depth ---
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight <= 0) { ticking.current = false; return; }
        const percent = Math.round((scrollTop / docHeight) * 100);
        for (const t of SCROLL_THRESHOLDS) {
          if (percent >= t && !scrollFired.current.has(t)) {
            scrollFired.current.add(t);
            trackScrollDepth(t, pagePath);
          }
        }
        ticking.current = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // --- Time on page ---
    let paused = document.hidden;
    const interval = setInterval(() => {
      if (paused) return;
      elapsed.current += 1;
      for (const m of TIME_MILESTONES) {
        if (elapsed.current === m && !timeFired.current.has(m)) {
          timeFired.current.add(m);
          trackTimeOnPage(m, pagePath);
        }
      }
    }, 1000);

    const onVisibility = () => { paused = document.hidden; };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("scroll", onScroll);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pagePath]);
}
