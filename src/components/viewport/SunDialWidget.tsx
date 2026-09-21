'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Sun, Moon, Play, Pause, X, Compass, Sparkles, Clock } from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';
import { calculateSolarLighting, formatSolarTime } from '../../gis/sunCalc';

export const SunDialWidget: React.FC = () => {
  const { solarTime, setSolarTime, isSunDialOpen, toggleSunDial } = useMapStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const arcRef = useRef<SVGSVGElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Time lapse auto play
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setSolarTime((useMapStore.getState().solarTime + 0.1) % 24);
      }, 100);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, setSolarTime]);

  if (!isSunDialOpen) return null;

  // Calculate current solar stats
  const solarStats = calculateSolarLighting(solarTime);

  // Arc math: semi-circle from left (East / Sunrise 06:00) to top (Noon 12:00) to right (West / Sunset 18:00)
  // Map daylight hours 06:00 - 18:00 to 0° - 180° along arc
  const daylightHours = Math.max(6, Math.min(18, solarTime));
  const daylightProgress = (daylightHours - 6) / 12; // 0 to 1
  const angleRad = Math.PI - daylightProgress * Math.PI; // PI (left) -> PI/2 (top) -> 0 (right)

  // Arc dimensions
  const cx = 140;
  const cy = 110;
  const r = 90;
  const sunX = cx + r * Math.cos(angleRad);
  const sunY = cy - r * Math.sin(angleRad);

  // Handle pointer dragging on celestial arc
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging && e.type !== 'pointerdown') return;
    if (!arcRef.current) return;

    const rect = arcRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - (cx * rect.width) / 280;
    const y = cy * (rect.height / 130) - (e.clientY - rect.top);

    // Calculate angle from center
    let angle = Math.atan2(y, -x); // 0 on left (-x), PI/2 on top, PI on right
    if (angle < 0) angle = 0;
    if (angle > Math.PI) angle = Math.PI;

    // Convert angle to hours (0 rad = 6am, PI rad = 6pm)
    const progress = 1 - angle / Math.PI;
    const hours = 6 + progress * 12;
    setSolarTime(parseFloat(hours.toFixed(2)));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Quick preset jumpers
  const presets = [
    { label: 'Dawn', time: 6.5, icon: '🌅' },
    { label: 'Morning', time: 9.0, icon: '🌤️' },
    { label: 'Noon', time: 12.0, icon: '☀️' },
    { label: 'Golden', time: 17.25, icon: '🌇' },
    { label: 'Night', time: 21.0, icon: '🌙' },
  ];

  return (
    <div
      className="fixed bottom-24 right-6 z-[1200] w-80 bg-zinc-950/90 border border-white/20 rounded-3xl p-4 shadow-2xl backdrop-blur-2xl text-white select-none animate-in fade-in slide-in-from-bottom-4"
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
            <Sun className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs tracking-tight text-white flex items-center gap-1.5">
              <span>Celestial Sun Dial</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-white/10 text-zinc-300 font-normal">
                3D Shadows
              </span>
            </h4>
            <p className="text-[9.5px] text-zinc-400">Real-time solar pathing &amp; facade lighting</p>
          </div>
        </div>
        <button
          onClick={() => toggleSunDial(false)}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Interactive Celestial Arc Canvas */}
      <div className="relative py-2 flex flex-col items-center">
        <svg
          ref={arcRef}
          viewBox="0 0 280 130"
          className="w-full h-32 cursor-pointer touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
        >
          <defs>
            {/* Celestial Arc Gradient */}
            <linearGradient id="sunArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#fef08a" stopOpacity="1" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0.8" />
            </linearGradient>

            {/* Glowing Sun Radial Gradient */}
            <radialGradient id="sunGlow">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Horizon Reference Baseline */}
          <line
            x1="30"
            y1={cy}
            x2="250"
            y2={cy}
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Ground Compass Cardinal Markers */}
          <text x="32" y={cy + 14} fill="#9ca3af" fontSize="9" fontWeight="bold" textAnchor="middle">
            EAST (06:00)
          </text>
          <text x="140" y="16" fill="#9ca3af" fontSize="9" fontWeight="bold" textAnchor="middle">
            ZENITH (12:00)
          </text>
          <text x="248" y={cy + 14} fill="#9ca3af" fontSize="9" fontWeight="bold" textAnchor="middle">
            WEST (18:00)
          </text>

          {/* Semicircle Track */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Illuminated Arc Progress */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="url(#sunArcGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Connecting Ray to Center Pivot */}
          <line
            x1={cx}
            y1={cy}
            x2={sunX}
            y2={sunY}
            stroke={solarStats.lightColor}
            strokeWidth="1.5"
            strokeOpacity="0.4"
            strokeDasharray="2 2"
          />

          {/* Center Pivot Marker */}
          <circle cx={cx} cy={cy} r="3" fill="#ffffff" opacity="0.6" />

          {/* Sun Halo Pulse */}
          <circle cx={sunX} cy={sunY} r="18" fill="url(#sunGlow)" opacity="0.4" />

          {/* Glowing Sun Puck (Draggable Handle) */}
          <circle
            cx={sunX}
            cy={sunY}
            r="8"
            fill={solarStats.lightColor}
            stroke="#ffffff"
            strokeWidth="2.5"
            className="filter drop-shadow-md cursor-grab active:cursor-grabbing"
          />
        </svg>

        {/* Current Time Badge & Solar Telemetry */}
        <div className="w-full flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-black text-white">
              {formatSolarTime(solarTime)}
            </span>
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-white/20 uppercase"
              style={{ color: solarStats.lightColor, borderColor: solarStats.lightColor }}
            >
              Alt: {Math.round(solarStats.altitudeDeg)}° • Az: {Math.round(solarStats.azimuthDeg)}°
            </span>
          </div>

          {/* Play/Pause Timelapse */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
              isPlaying
                ? 'bg-amber-400 text-black border-amber-300 shadow-md'
                : 'bg-white/5 hover:bg-white/15 border-white/15 text-zinc-300'
            }`}
            title="Auto Solar Timelapse"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="text-[10px]">{isPlaying ? 'Stop' : 'Timelapse'}</span>
          </button>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="pt-2 border-t border-white/10 grid grid-cols-5 gap-1">
        {presets.map((p) => {
          const isActive = Math.abs(solarTime - p.time) < 0.75;
          return (
            <button
              key={p.label}
              onClick={() => {
                setIsPlaying(false);
                setSolarTime(p.time);
              }}
              className={`py-1.5 px-1 rounded-xl text-[10px] font-semibold transition flex flex-col items-center gap-0.5 border ${
                isActive
                  ? 'bg-white text-black border-white shadow-md font-bold'
                  : 'bg-white/[0.03] text-zinc-400 border-white/10 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="text-xs">{p.icon}</span>
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
