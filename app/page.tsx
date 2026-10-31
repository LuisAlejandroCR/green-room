// page.tsx: one state machine (useGreenRoom), two layouts: DesktopApp at >=1024px, MobileApp (Android-first) below.
"use client";

import { useSyncExternalStore } from "react";
import { DesktopApp } from "@/components/desktop";
import { MobileApp } from "@/components/mobile";
import { useGreenRoom } from "@/components/use-green-room";

const DESKTOP = "(min-width: 1024px)";
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(DESKTOP); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
}

export default function Home() {
  const g = useGreenRoom();
  return useIsDesktop() ? <DesktopApp g={g} /> : <MobileApp g={g} />;
}
