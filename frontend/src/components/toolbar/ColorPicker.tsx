'use client';

import React, { useState } from 'react';
import { Pipette } from 'lucide-react';
import { COLOR_PALETTES } from '../../gis/map';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, label }) => {
  const [hexInput, setHexInput] = useState(color);

  const handleUpdate = (newColor: string) => {
    setHexInput(newColor);
    onChange(newColor);
  };

  const handleEyeDropper = async () => {
    if (typeof window !== 'undefined' && (window as any).EyeDropper) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const res = await eyeDropper.open();
        if (res && res.sRGBHex) {
          handleUpdate(res.sRGBHex);
        }
      } catch (e) {}
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {label && <span className="text-[11px] text-gray-400 font-medium">{label}</span>}

      {/* Palette rows */}
      <div className="flex flex-col gap-1.5">
        {COLOR_PALETTES.map((p) => (
          <div key={p.name} className="flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500">
              {p.name}
            </span>
            <div className="flex gap-1.5 flex-wrap items-center">
              {p.colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleUpdate(c)}
                  className={`w-4 h-4 rounded border transition-transform hover:scale-110 ${
                    color.toLowerCase() === c.toLowerCase()
                      ? 'border-sky-400 scale-110'
                      : 'border-white/20'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Manual Hex & Native Picker */}
      <div className="flex items-center gap-2 mt-1">
        <input
          type="color"
          value={color}
          onChange={(e) => handleUpdate(e.target.value)}
          className="w-6 h-6 rounded border border-white/20 bg-transparent cursor-pointer p-0"
        />
        <input
          type="text"
          value={hexInput}
          onChange={(e) => {
            setHexInput(e.target.value);
            let val = e.target.value.trim();
            if (!val.startsWith('#')) val = '#' + val;
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
              onChange(val);
            }
          }}
          placeholder="#hex"
          className="w-20 font-mono text-[11px] bg-black/40 border border-white/15 rounded px-2 py-1 text-white focus:outline-none focus:border-sky-400"
        />
        <button
          type="button"
          onClick={handleEyeDropper}
          title="Pick color from screen"
          className="p-1.5 rounded bg-white/5 border border-white/15 hover:bg-white/15 text-gray-300 hover:text-white"
        >
          <Pipette className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
