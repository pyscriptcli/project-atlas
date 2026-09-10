'use client';

import React from 'react';
import { X, Table } from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';

export const FeaturePopup: React.FC = () => {
  const { selectedId, setSelectedId, features, togglePanel } = useMapStore();

  if (!selectedId) return null;
  const f = features.find((x) => x.id === selectedId);
  if (!f) return null;

  let primaryImage: string | null = null;
  if (f.props.attrRows && f.props.attrRows.length > 0 && f.props.attrTypes) {
    for (const row of f.props.attrRows) {
      for (const col in f.props.attrTypes) {
        if (f.props.attrTypes[col] === 'image' && row[col]?.startsWith('data:image')) {
          primaryImage = row[col];
          break;
        }
      }
      if (primaryImage) break;
    }
  }

  const handleOpenTable = () => {
    togglePanel('attributeTable', true);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[990] w-80 bg-[rgba(9,16,24,0.98)] border border-white/20 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-xs text-gray-200 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
        <div>
          <h3 className="font-bold text-sky-400 text-sm">{f.name}</h3>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">{f.kind}</span>
        </div>
        <button
          onClick={() => setSelectedId(null)}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {primaryImage && (
        <img
          src={primaryImage}
          alt={f.name}
          className="w-full h-36 object-cover rounded-xl border border-white/15 mb-3"
        />
      )}

      <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-1.5 mb-3">
        {f.props.osmTags && Object.keys(f.props.osmTags).length > 0 ? (
          Object.entries(f.props.osmTags).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2 py-0.5 border-b border-white/5">
              <span className="text-gray-400 font-mono text-[10px]">{k}</span>
              <span className="text-gray-200 text-right truncate max-w-[160px]">{String(v)}</span>
            </div>
          ))
        ) : f.props.attributes && Object.keys(f.props.attributes).length > 0 ? (
          Object.entries(f.props.attributes)
            .filter(([_, v]) => typeof v === 'string' && !v.startsWith('data:image'))
            .map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 py-0.5 border-b border-white/5">
                <span className="text-gray-400 font-mono text-[10px]">{k}</span>
                <span className="text-gray-200 text-right truncate max-w-[160px]">{String(v)}</span>
              </div>
            ))
        ) : (
          <div className="text-gray-500 py-2 text-center">No metadata available</div>
        )}
      </div>

      <div className="flex justify-end pt-2 border-t border-white/10">
        <button
          onClick={handleOpenTable}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-gray-200 text-[11px] font-semibold transition"
        >
          <Table className="w-3.5 h-3.5 text-amber-400" />
          <span>Open Full Attribute Table</span>
        </button>
      </div>
    </div>
  );
};
