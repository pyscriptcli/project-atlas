'use client';

import React, { useState } from 'react';
import { Radar, X, ChevronRight, ChevronDown, Play, Loader2 } from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';
import { POI_CONFIG, scanTradeAreaPOIs, robustOverpassFetch } from '../../gis/tradeArea';
import { getIconKey } from '../../gis/markers';

interface TradeAreaModalProps {
  mapInstance: any;
}

export const TradeAreaModal: React.FC<TradeAreaModalProps> = ({ mapInstance }) => {
  const {
    activePanels,
    togglePanel,
    features,
    addFeature,
    customGroups,
    setCustomGroups,
    setToast,
  } = useMapStore();

  const [selectedPolyId, setSelectedPolyId] = useState<number | ''>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customPoi, setCustomPoi] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanSummary, setScanSummary] = useState<Record<string, number> | null>(null);

  // Custom Overpass Query
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customQL, setCustomQL] = useState('');
  const [customResultType, setCustomResultType] = useState<'marker' | 'polygon'>('marker');

  if (!activePanels.tradeArea) return null;

  const polyList = features.filter((f) => ['polygon', 'rectangle', 'circle'].includes(f.kind));

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleScan = async () => {
    if (!selectedPolyId) {
      setToast('Please select a target polygon first.');
      return;
    }
    const targetPoly = features.find((f) => f.id === selectedPolyId);
    if (!targetPoly) return;

    if (!selectedTags.length && !customPoi.trim()) {
      setToast('Please select at least one category or enter a custom tag.');
      return;
    }

    setIsScanning(true);
    setToast('Scanning trade area POIs with robust fetch...');

    const res = await scanTradeAreaPOIs(targetPoly, selectedTags, customPoi);
    setIsScanning(false);

    if (!res || !res.features.length) {
      setToast('No matching POIs found inside this area.');
      setScanSummary({});
      return;
    }

    // Ensure Trade Area Scan group exists
    let nextGroups = { ...customGroups };
    if (!nextGroups['Trade Area Scan']) {
      nextGroups['Trade Area Scan'] = { collapsed: false, ids: [] };
    }

    const groupIds = [...nextGroups['Trade Area Scan'].ids];

    res.features.forEach((poi) => {
      const newId = Date.now() + Math.floor(Math.random() * 1000);
      const iconKey = mapInstance ? getIconKey('pin', '#1e40af', mapInstance) : 'ico_pin_1e40af';

      addFeature({
        id: newId,
        name: poi.name,
        kind: 'marker',
        geometry: { type: 'Point', coordinates: [poi.lon, poi.lat] },
        props: {
          shape: 'pin',
          color: '#1e40af',
          iconSize: 0.85,
          iconKey,
          visible: 1,
          osmTags: poi.tags,
          attributes: { name: poi.name, ...poi.tags },
        },
      });
      groupIds.push(newId);
    });

    nextGroups['Trade Area Scan'].ids = groupIds;
    setCustomGroups(nextGroups);
    setScanSummary(res.counts);
    setToast(`Added ${res.features.length} POIs to "Trade Area Scan"!`);
  };

  const handleRunCustomQuery = async () => {
    if (!customQL.trim()) {
      setToast('Enter an Overpass QL query');
      return;
    }
    setIsScanning(true);
    setToast('Running custom Overpass query...');

    const data = await robustOverpassFetch(customQL);
    setIsScanning(false);

    if (!data || !data.elements || !data.elements.length) {
      setToast('Query returned no results');
      return;
    }

    data.elements.forEach((el: any) => {
      const newId = Date.now() + Math.floor(Math.random() * 1000);
      const name = (el.tags && (el.tags.name || el.tags.amenity || el.tags.shop)) || 'Query POI';

      if (el.type === 'node') {
        const iconKey = mapInstance ? getIconKey('pin', '#1e40af', mapInstance) : 'ico_pin_1e40af';
        addFeature({
          id: newId,
          name,
          kind: 'marker',
          geometry: { type: 'Point', coordinates: [el.lon, el.lat] },
          props: {
            shape: 'pin',
            color: '#1e40af',
            iconSize: 0.9,
            iconKey,
            visible: 1,
            osmTags: el.tags || {},
          },
        });
      } else if (el.type === 'way' && el.geometry) {
        if (customResultType === 'marker' && el.center) {
          const iconKey = mapInstance ? getIconKey('pin', '#1e40af', mapInstance) : 'ico_pin_1e40af';
          addFeature({
            id: newId,
            name,
            kind: 'marker',
            geometry: { type: 'Point', coordinates: [el.center.lon, el.center.lat] },
            props: {
              shape: 'pin',
              color: '#1e40af',
              iconSize: 0.9,
              iconKey,
              visible: 1,
              osmTags: el.tags || {},
            },
          });
        } else {
          addFeature({
            id: newId,
            name,
            kind: 'polygon',
            geometry: el.geometry,
            props: {
              color: '#e8b84a',
              fillColor: '#e8b84a',
              fillOpacity: 0.35,
              visible: 1,
            },
          });
        }
      }
    });

    setToast(`Added ${data.elements.length} elements from query`);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto bg-[rgba(9,16,24,0.98)] border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-xs text-gray-300 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <Radar className="w-5 h-5 text-sky-400" />
            <span>Trade Area Analysis</span>
          </div>
          <button
            onClick={() => togglePanel('tradeArea', false)}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Polygon Selector */}
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-200">Target Polygon / Area</span>
          <select
            value={selectedPolyId}
            onChange={(e) => setSelectedPolyId(e.target.value ? parseInt(e.target.value, 10) : '')}
            className="w-52 bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-white outline-none focus:border-sky-400"
          >
            <option value="">-- Choose Target --</option>
            {polyList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.kind})
              </option>
            ))}
          </select>
        </div>

        {/* POI Categories */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            POI Categories
          </span>
          <div className="max-h-60 overflow-y-auto pr-1 flex flex-col gap-3">
            {Object.entries(POI_CONFIG).map(([category, items]) => (
              <div key={category} className="flex flex-col gap-1.5">
                <span className="font-semibold text-white text-[11px]">{category}</span>
                <div className="flex flex-wrap gap-2">
                  {items.map(([label, tag]) => {
                    const isChecked = selectedTags.includes(tag);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] transition ${
                          isChecked
                            ? 'bg-blue-600/30 border-blue-500 text-white font-medium'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom POI Tag Search */}
        <div className="flex flex-col gap-1 border-t border-white/5 pt-3">
          <span className="text-[11px] font-bold text-gray-400 uppercase">
            Custom POI Tag (Amenity / Shop)
          </span>
          <input
            type="text"
            value={customPoi}
            onChange={(e) => setCustomPoi(e.target.value)}
            placeholder="e.g. amenity=dentist or shop=bakery"
            className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white placeholder-gray-500 outline-none focus:border-sky-400"
          />
        </div>

        {/* Scan Button */}
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition text-sm"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Scanning Trade Area...</span>
            </>
          ) : (
            <>
              <Radar className="w-4 h-4" />
              <span>Scan POIs Inside Area</span>
            </>
          )}
        </button>

        {/* Summary Results */}
        {scanSummary && (
          <div className="p-3 bg-black/40 border border-white/10 rounded-2xl flex flex-col gap-2">
            <span className="font-bold text-white">Scan Results Breakdown</span>
            {Object.keys(scanSummary).length === 0 ? (
              <span className="text-gray-500">No POIs located within this geometry.</span>
            ) : (
              <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
                {Object.entries(scanSummary).map(([name, count]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-white/5"
                  >
                    <span>{name}</span>
                    <span className="font-bold text-sky-400">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Custom Overpass QL Editor */}
        <div className="border-t border-white/10 pt-3">
          <div
            onClick={() => setIsCustomOpen(!isCustomOpen)}
            className="flex items-center justify-between cursor-pointer font-bold text-white text-[11px]"
          >
            <span>CUSTOM OVERPASS QL QUERY</span>
            {isCustomOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>

          {isCustomOpen && (
            <div className="mt-3 flex flex-col gap-2">
              <textarea
                rows={4}
                value={customQL}
                onChange={(e) => setCustomQL(e.target.value)}
                placeholder="[out:json][timeout:25]; node[...](...); out center;"
                className="w-full font-mono text-[11px] bg-black/50 border border-white/15 rounded-xl p-3 text-white placeholder-gray-500 outline-none focus:border-sky-400"
              />
              <div className="flex items-center justify-between">
                <span>Result Geometry</span>
                <select
                  value={customResultType}
                  onChange={(e) => setCustomResultType(e.target.value as any)}
                  className="bg-black/50 border border-white/15 rounded-lg px-2 py-1 text-white"
                >
                  <option value="marker">Markers</option>
                  <option value="polygon">Polygons</option>
                </select>
              </div>
              <button
                onClick={handleRunCustomQuery}
                disabled={isScanning}
                className="py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Run Query</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
