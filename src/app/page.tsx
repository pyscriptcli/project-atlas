"use client";

import dynamic from "next/dynamic";
import { TopToolbar } from "@/components/toolbar/TopToolbar";
import { DataBrowserPanel } from "@/components/panels/DataBrowserPanel";
import { MyLayersPanel } from "@/components/panels/MyLayersPanel";
import { TradeAreaModal } from "@/components/panels/TradeAreaModal";
import { AttributeTable } from "@/components/panels/AttributeTable";
import { StyleInspectorModal } from "@/components/panels/StyleInspectorModal";
import { ProjectLauncherModal } from "@/components/panels/ProjectLauncherModal";
import { SearchModal } from "@/components/panels/SearchModal";
import { Toast } from "@/components/ui/Toast";

// Dynamically import MapContainer with SSR disabled for clean WebGL loading
const MapContainer = dynamic(
  () => import("@/components/map/MapContainer").then((mod) => mod.MapContainer),
  {
    ssr: false,
    loading: () => (
      <div className="w-screen h-screen bg-[#0a1628] flex items-center justify-center text-slate-400 font-sans text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-sky-400/30 border-t-sky-400 animate-spin" />
          <span className="font-semibold text-slate-300">Initializing Project Atlas WebGL Canvas...</span>
        </div>
      </div>
    ),
  }
);

export default function HomePage() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0a1628]">
      {/* Top Floating Control Bar */}
      <TopToolbar />

      {/* Full-bleed WebGL Map Canvas */}
      <MapContainer />

      {/* Floating Modals and Panels */}
      <DataBrowserPanel />
      <MyLayersPanel />
      <TradeAreaModal />
      <AttributeTable />
      <StyleInspectorModal />
      <ProjectLauncherModal />
      <SearchModal />

      {/* Notifications */}
      <Toast />
    </main>
  );
}
