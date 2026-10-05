"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

/**
 * Runs a GSAP setup scoped to a container and reverts it on unmount.
 * Skipped entirely for reduced-motion users; the static layout is the fallback.
 */
export function useGsap<T extends HTMLElement>(setup: (root: T, g: typeof gsap) => void, deps: unknown[] = []) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => setup(root, gsap), root);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

export { ScrollTrigger };
