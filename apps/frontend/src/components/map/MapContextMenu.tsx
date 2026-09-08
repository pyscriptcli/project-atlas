"use client";

import React from "react";
import { MapPin, Target, Route, ExternalLink, Trash2, TableProperties, ArrowUpToLine, ArrowDownToLine } from "lucide-react";
import { useMapStore } from "@/lib/store/useMapStore";
import type { MapFeature } from "@/types/map";

interface MapContextMenuProps {
  x: number;
  y: number;
  lngLat: [number, number];
  onClose: () => void;
  featureId?: string;
}

export function MapContextMenu({ x, y, lngLat, featureId, onClose }: MapContextMenuProps) {
  const { addFeature, removeFeature, reorderFeature, setSelectedFeatureId, setActivePanel, showToast } = useMapStore();

  const handleDropPin = () => {
    const newMarker: MapFeature = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: lngLat,
      },
      properties: {
        id: `pin-${Date.now()}`,
        name: `Marker (${lngLat[1].toFixed(4)}, ${lngLat[0].toFixed(4)})`,
        category: "Marker Pin",
        color: "#ef4444",
        fillColor: "#ef4444",
        strokeColor: "#ffffff",
        strokeWidth: 2,
        source: "user-draw",
        createdAt: new Date().toISOString(),
      },
    };
    addFeature(newMarker);
    showToast("Dropped marker pin.");
    onClose();
  };

  const handleTradeAreaHere = () => {
    useMapStore.getState().setCamera(lngLat, 14, 45, 0);
    setActivePanel("trade-area");
    onClose();
  };

  return (
    <div
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-[3000] w-52 bg-[#091018]/98 backdrop-blur-xl border border-white/15 rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.8)] p-1.5 text-xs text-slate-200"
    >
      <div className="px-3 py-1.5 border-b border-white/10 text-[10px] font-mono text-slate-400">
        {lngLat[1].toFixed(6)}° N, {lngLat[0].toFixed(6)}° E
      </div>

      <div className="py-1 space-y-0.5">
        <button
          onClick={handleDropPin}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left transition-colors"
        >
          <MapPin className="w-3.5 h-3.5 text-rose-400" />
          <span>Drop Pin Here</span>
        </button>

        <button
          onClick={handleTradeAreaHere}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left transition-colors"
        >
          <Target className="w-3.5 h-3.5 text-sky-400" />
          <span>Analyze Trade Area Here</span>
        </button>

        <button
          onClick={() => {
            navigator.clipboard.writeText(`${lngLat[1]}, ${lngLat[0]}`);
            showToast("Copied coordinates to clipboard.");
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left transition-colors"
        >
          <Route className="w-3.5 h-3.5 text-emerald-400" />
          <span>Copy Coordinates</span>
        </button>
        <button onClick={()=>window.open(`https://www.google.com/maps?q=${lngLat[1]},${lngLat[0]}`,"_blank","noopener,noreferrer")} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left"><ExternalLink className="w-3.5 h-3.5"/><span>Open in Maps</span></button>
        <button onClick={()=>window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lngLat[1]},${lngLat[0]}`,"_blank","noopener,noreferrer")} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left"><ExternalLink className="w-3.5 h-3.5"/><span>Open Street View</span></button>
        {featureId&&<><div className="my-1 border-t border-white/10"/><button onClick={()=>{setSelectedFeatureId(featureId);onClose()}} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left"><Target className="w-3.5 h-3.5"/><span>Edit feature</span></button><button onClick={()=>{reorderFeature(featureId,"front");onClose()}} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left"><ArrowUpToLine className="w-3.5 h-3.5"/><span>Bring to front</span></button><button onClick={()=>{reorderFeature(featureId,"back");onClose()}} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left"><ArrowDownToLine className="w-3.5 h-3.5"/><span>Send to back</span></button><button onClick={()=>{setSelectedFeatureId(featureId);setActivePanel("attributes");onClose()}} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-left"><TableProperties className="w-3.5 h-3.5"/><span>Edit attributes</span></button><button onClick={()=>{if(confirm("Delete this feature?"))removeFeature(featureId);onClose()}} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-rose-500/10 text-left text-rose-300"><Trash2 className="w-3.5 h-3.5"/><span>Delete feature</span></button></>}
      </div>
    </div>
  );
}
