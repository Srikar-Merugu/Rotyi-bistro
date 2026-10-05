"use client";

import { useEffect, useState } from "react";

// Re-mounts on every navigation. Plays CRAV's plum curtain wipe between pages;
// skipped on the very first load, where the loader already covers the screen.
let firstLoad = true;

export default function Template({ children }: { children: React.ReactNode }) {
  const [animate] = useState(() => !firstLoad);
  useEffect(() => {
    firstLoad = false;
    if (animate) window.scrollTo(0, 0);
  }, [animate]);

  return (
    <>
      {animate && <div className="curtain pointer-events-none fixed inset-0 z-[80] bg-plum" aria-hidden />}
      <div className={animate ? "page-in" : undefined}>{children}</div>
    </>
  );
}
