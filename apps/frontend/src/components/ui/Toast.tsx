"use client";

import React from "react";
import { useMapStore } from "@/lib/store/useMapStore";

export function Toast() {
  const toastMessage = useMapStore((state) => state.toastMessage);

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="bg-[#091018]/95 backdrop-blur-md text-slate-100 border border-white/15 px-5 py-2 rounded-full shadow-2xl text-xs font-semibold tracking-wide flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
        {toastMessage}
      </div>
    </div>
  );
}
