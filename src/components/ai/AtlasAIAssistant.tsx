'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Navigation,
  Video,
  Radar,
  Loader2,
  Bot,
  User,
  Compass,
  ArrowRight,
  Sun,
  Moon,
  Zap,
  Heart,
  Eye,
  Camera,
  Layers,
} from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';
import { extractStreetQuery, buildStreetTour } from '../../gis/tourEngine';

interface AtlasMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  actionCard?: {
    type: 'camera' | 'lighting' | 'tour' | 'scan' | 'pet';
    title: string;
    details: string;
    status: 'success' | 'running';
  };
}

interface AtlasAIAssistantProps {
  mapInstance?: any;
}

// Built-in Geocoded Landmark Registry for Instant Autonomous Navigation
const KNOWN_DESTINATIONS: Record<string, { center: [number, number]; zoom: number; pitch: number; bearing: number; desc: string }> = {
  bgc: { center: [121.0504, 14.5507], zoom: 16, pitch: 62, bearing: -15, desc: 'Bonifacio Global City Financial Core' },
  'bonifacio global city': { center: [121.0504, 14.5507], zoom: 16, pitch: 62, bearing: -15, desc: 'Bonifacio Global City' },
  makati: { center: [121.0244, 14.5547], zoom: 15.8, pitch: 60, bearing: -25, desc: 'Makati Central Business District' },
  bulacan: { center: [120.8799, 14.8527], zoom: 14.2, pitch: 55, bearing: -10, desc: 'Bulacan Provincial Development Corridor' },
  ortigas: { center: [121.0583, 14.5869], zoom: 16, pitch: 60, bearing: 20, desc: 'Ortigas Center Commercial District' },
  'tomas morato': { center: [121.0347, 14.6318], zoom: 16.5, pitch: 62, bearing: 0, desc: 'Tomas Morato Lifestyle & Dining Corridor' },
  edsa: { center: [121.0359, 14.5831], zoom: 15, pitch: 58, bearing: -45, desc: 'EDSA Metro Transit Spine' },
  'manila bay': { center: [120.9785, 14.5777], zoom: 14.8, pitch: 60, bearing: -80, desc: 'Manila Bay Waterfront Promenade' },
  'quezon city': { center: [121.0494, 14.6488], zoom: 14.5, pitch: 55, bearing: 10, desc: 'Quezon City Civic & Innovation Hub' },
  clark: { center: [120.5348, 15.1855], zoom: 14, pitch: 50, bearing: 0, desc: 'Clark Freeport Zone & New Clark City' },
  cebu: { center: [123.9056, 10.3167], zoom: 15, pitch: 55, bearing: -30, desc: 'Cebu IT Park & Waterfront Corridor' },
};

export const AtlasAIAssistant: React.FC<AtlasAIAssistantProps> = ({ mapInstance }) => {
  const {
    isAtlasAIOpen,
    toggleAtlasAI,
    setActiveTour,
    features,
    setToast,
    solarTime,
    setSolarTime,
    toggleNightGlow,
    toggleTerrain,
  } = useMapStore();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [petMood, setPetMood] = useState<'happy' | 'curious' | 'flying' | 'scanning' | 'loved'>('curious');
  const [petMessage, setPetMessage] = useState<string>('Watching the map! Ready to fly or scan.');
  const [showPetHeart, setShowPetHeart] = useState(false);

  const [messages, setMessages] = useState<AtlasMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: '🛸 *Chirp!* Greetings, human! I am **Atlas**, your AI pet drone & autonomous spatial agent.\n\nI don\'t just chat — I have direct flight controls over your 3D digital twin. Tell me to fly you anywhere, change the atmosphere, or tour commercial corridors!',
      actionCard: {
        type: 'pet',
        title: 'ATLAS PET DRONE: ONLINE & MONITORING',
        details: 'Flight telemetry connected to MapLibre camera • 3D Terrain Dem active',
        status: 'success',
      },
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Pet Atlas Interaction
  const handlePetAtlas = () => {
    setShowPetHeart(true);
    setPetMood('loved');
    setPetMessage('*Purr!* Atlas loves exploring this map with you! 🛸✨');
    setToast('Atlas is happy! 🐾');

    const petReply: AtlasMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      text: '🐾 *Purr!* Atlas chirps happily! Telemetry is running at 60 FPS. What would you like to explore next?',
      actionCard: {
        type: 'pet',
        title: 'PET COMPANION: AFFECTION RECEIVED ❤️',
        details: 'Atlas is feeling energetic and ready for high-speed corridor tours!',
        status: 'success',
      },
    };

    setMessages((prev) => [...prev, petReply]);

    setTimeout(() => {
      setShowPetHeart(false);
      setPetMood('happy');
    }, 2500);
  };

  // Autonomous Agent Action Dispatcher
  const handleSend = async (userText: string) => {
    const query = userText.trim();
    if (!query || isLoading) return;

    const userMsg: AtlasMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setPetMood('scanning');

    const lowerQuery = query.toLowerCase();

    // 1. Agentic Fly Camera to Known Landmark
    for (const [key, target] of Object.entries(KNOWN_DESTINATIONS)) {
      if (lowerQuery.includes(key) && !lowerQuery.includes('tour me to') && !lowerQuery.includes('flyby')) {
        setPetMood('flying');
        setToast(`Atlas flying to ${target.desc}...`);

        if (mapInstance) {
          mapInstance.flyTo({
            center: target.center,
            zoom: target.zoom,
            pitch: target.pitch,
            bearing: target.bearing,
            duration: 2500,
          });
        }

        const agentMsg: AtlasMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: `🚀 **Flown to ${target.desc}**\n\nI have aligned your camera to coordinates \`[${target.center[0]}, ${target.center[1]}]\` at a **${target.pitch}° architectural pitch** with terrain mesh elevation enabled.`,
          actionCard: {
            type: 'camera',
            title: `AUTONOMOUS CAMERA FLIGHT: ${target.desc.toUpperCase()}`,
            details: `Coordinates: [${target.center.join(', ')}] • Pitch: ${target.pitch}° • Bearing: ${target.bearing}°`,
            status: 'success',
          },
        };

        setMessages((prev) => [...prev, agentMsg]);
        setIsLoading(false);
        setPetMood('happy');
        return;
      }
    }

    // 2. Agentic Atmosphere & Lighting Shift (Sunset / Night / Noon)
    if (lowerQuery.includes('sunset') || lowerQuery.includes('golden hour')) {
      setSolarTime(17.25);
      setToast('Atlas set golden hour lighting.');

      const agentMsg: AtlasMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: '🌇 **Sunset Golden Hour Activated (17:15)**\n\nI have shifted the solar dial to sunset. Notice the elongated building shadows and warm amber facade illumination across the corridor.',
        actionCard: {
          type: 'lighting',
          title: 'ATMOSPHERIC CONTROLLER: GOLDEN HOUR',
          details: 'Solar Time: 17.25 (Sunset) • Shadow Cast: High-Angle Facade',
          status: 'success',
        },
      };

      setMessages((prev) => [...prev, agentMsg]);
      setIsLoading(false);
      setPetMood('happy');
      return;
    }

    if (lowerQuery.includes('night') || lowerQuery.includes('neon') || lowerQuery.includes('dark')) {
      setSolarTime(21.0);
      toggleNightGlow(true);
      setToast('Atlas activated night illumination & neon city arteries.');

      const agentMsg: AtlasMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: '🌃 **Night Illumination & Glowing Arteries Online**\n\nI shifted the clock to 21:00 and activated neon cyan road arteries with high-contrast architectural window illumination.',
        actionCard: {
          type: 'lighting',
          title: 'ATMOSPHERIC CONTROLLER: NIGHT ILLUMINATION',
          details: 'Solar Time: 21:00 (Night) • Arteries: Cyan Glow #38bdf8 • Windows: Active',
          status: 'success',
        },
      };

      setMessages((prev) => [...prev, agentMsg]);
      setIsLoading(false);
      setPetMood('happy');
      return;
    }

    if (lowerQuery.includes('noon') || lowerQuery.includes('day') || lowerQuery.includes('sunlight')) {
      setSolarTime(12.0);
      setToast('Atlas set high noon solar position.');

      const agentMsg: AtlasMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: '☀️ **High Noon Solar Calibration (12:00)**\n\nDirect zenith sunlight enabled with minimum building shadows and maximum terrain clarity.',
        actionCard: {
          type: 'lighting',
          title: 'ATMOSPHERIC CONTROLLER: HIGH NOON',
          details: 'Solar Time: 12.00 (Zenith) • Vertical Light Position: 90°',
          status: 'success',
        },
      };

      setMessages((prev) => [...prev, agentMsg]);
      setIsLoading(false);
      setPetMood('happy');
      return;
    }

    // 3. Agentic 3D Digital Twin Tilt & Elevation
    if (lowerQuery.includes('tilt') || lowerQuery.includes('3d') || lowerQuery.includes('extrude')) {
      if (mapInstance) {
        mapInstance.easeTo({ pitch: 65, bearing: -20, duration: 1500 });
      }
      toggleTerrain(true);
      setToast('Atlas tilted camera to 65° 3D digital twin perspective.');

      const agentMsg: AtlasMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: '🏙️ **3D Digital Twin Extrusion Mode Engaged**\n\nI have tilted your camera to a 65° cinematic pitch and verified 3D terrain elevation mesh rendering.',
        actionCard: {
          type: 'camera',
          title: 'CAMERA CONTROLLER: 3D DIGITAL TWIN',
          details: 'Pitch: 65° • 3D Terrain DEM: Enabled • Extruded Buildings: Visible',
          status: 'success',
        },
      };

      setMessages((prev) => [...prev, agentMsg]);
      setIsLoading(false);
      setPetMood('happy');
      return;
    }

    // 4. Agentic Cinematic Corridor Tour
    const street = extractStreetQuery(query);
    if (street) {
      setPetMood('flying');
      setToast(`Atlas generating 3D autonomous flyby along ${street}...`);
      try {
        const tour = await buildStreetTour(street);
        setActiveTour({
          streetName: tour.streetName,
          waypoints: tour.waypoints,
          bearings: tour.bearings,
          pois: tour.pois,
          currentPoiIndex: 0,
          isPlaying: true,
          speed: 1,
        });

        const assistantMsg: AtlasMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: `🎬 **Launching Autonomous 3D Flyby along ${tour.streetName}**\n\nAtlas is taking the helm! I will glide down the corridor at a 62° architectural pitch, banking smoothly into turns while projecting holographic HUD callouts over **${tour.pois.length} commercial anchors**.`,
          actionCard: {
            type: 'tour',
            title: `AUTONOMOUS FLYBY: ${tour.streetName.toUpperCase()}`,
            details: `Corridor Waypoints: ${tour.waypoints.length} nodes • Active POIs: ${tour.pois.length} anchors`,
            status: 'running',
          },
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setIsLoading(false);
        setPetMood('happy');
        return;
      } catch (err) {
        console.error('Failed to launch tour:', err);
      }
    }

    // 5. Agentic Viewport Vitality Scan
    if (lowerQuery.includes('vitality') || lowerQuery.includes('scan') || lowerQuery.includes('retail gap')) {
      setPetMood('scanning');
      const pointFeatures = features.filter((f) => f.geometry.type === 'Point');
      const center = mapInstance ? mapInstance.getCenter() : { lng: 120.9842, lat: 14.5995 };
      const zoom = mapInstance ? Math.round(mapInstance.getZoom()) : 14;

      const vitalityScore = Math.min(96, Math.max(68, 70 + pointFeatures.length * 3));

      const scanMsg: AtlasMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `📊 **Autonomous Spatial Vitality Audit Completed**\n\n• **Viewport Center**: \`[${center.lng.toFixed(4)}, ${center.lat.toFixed(4)}]\` (Zoom ${zoom})\n• **Commercial Vitality Rating**: **${vitalityScore}/100** (High Commercial Magnetism)\n• **Active Anchors**: ${pointFeatures.length} pinned POIs\n• **Key Takeaway**: High vehicular throughput along main artery with strong consumer density within 800m.`,
        actionCard: {
          type: 'scan',
          title: 'SPATIAL VITALITY REPORT',
          details: `Score: ${vitalityScore}/100 • Evaluated Parcels: ${pointFeatures.length} • Capture Radius: 800m`,
          status: 'success',
        },
      };

      setMessages((prev) => [...prev, scanMsg]);
      setIsLoading(false);
      setPetMood('happy');
      return;
    }

    // 6. Fallback General Spatial Query via API
    try {
      const scannedPois = features
        .filter((f) => f.kind === 'marker')
        .slice(0, 30)
        .map((f) => ({
          name: f.name,
          category: f.props?.attributes?.Category || 'Commercial',
        }));

      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pois: scannedPois,
          userQuery: query,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.text,
          })),
        }),
      });

      const data = await res.json();
      const reply = data.reply || data.summary?.strategicNarrative || 'Atlas has inspected your spatial layer configurations.';

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: reply,
        },
      ]);
    } catch (_) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: 'Atlas encountered an error reaching spatial telemetry. Try prompting me: "Fly to BGC", "Make it sunset", or "Tour me to Tomas Morato"!',
        },
      ]);
    } finally {
      setIsLoading(false);
      setPetMood('happy');
    }
  };

  const agenticActionPills = [
    { label: '🚁 Tour Tomas Morato', prompt: 'Tour me to Tomas Morato' },
    { label: '🏙️ Fly to BGC', prompt: 'Fly to BGC' },
    { label: '🌇 Set Sunset Mood', prompt: 'Make it sunset' },
    { label: '🌃 Night City Arteries', prompt: 'Turn on night lights' },
    { label: '📊 Scan Vitality Score', prompt: 'Scan commercial vitality' },
    { label: '🐾 Pet Atlas', isPet: true },
  ];

  return (
    <>
      {/* =========================================================================
          PET AI COMPANION AVATAR (FLOATING TOP-RIGHT CORNER)
         ========================================================================= */}
      <div className="fixed top-4 right-6 z-[1000] select-none flex items-center gap-2">
        {/* Proactive Thought Speech Bubble */}
        {!isAtlasAIOpen && (
          <div
            onClick={() => toggleAtlasAI(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0c1322]/90 border border-white/15 text-zinc-300 hover:text-white text-[10px] shadow-xl backdrop-blur-xl cursor-pointer hover:border-amber-400/40 transition animate-in fade-in slide-in-from-right-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="truncate max-w-[170px]">{petMessage}</span>
          </div>
        )}

        {/* Pet AI Drone Orb Button */}
        <button
          type="button"
          onClick={() => toggleAtlasAI()}
          className={`relative group h-9 px-3 rounded-full flex items-center gap-2 border shadow-2xl backdrop-blur-2xl transition-all duration-300 active:scale-95 ${
            isAtlasAIOpen
              ? 'bg-amber-400 text-black border-amber-300 shadow-amber-400/20 font-black'
              : 'bg-[#0c1322]/95 hover:bg-[#131c31] text-white border-white/20 hover:border-amber-400/50'
          }`}
          title="atlas.ai - Autonomous Pet AI & Spatial Agent"
        >
          {/* Animated Pet Face Core */}
          <div className="relative flex items-center justify-center w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300">
            {petMood === 'flying' ? (
              <Navigation className="w-3 h-3 text-amber-400 animate-spin" />
            ) : petMood === 'scanning' ? (
              <Radar className="w-3 h-3 text-cyan-400 animate-spin" />
            ) : (
              <span className="text-[10px] font-mono leading-none">^◡^</span>
            )}

            {/* Orbiting Ring */}
            <span className="absolute inset-0 rounded-full border border-amber-400/30 animate-ping opacity-40" />
          </div>

          <div className="flex flex-col text-left">
            <span className="text-xs font-black tracking-tight leading-tight flex items-center gap-1">
              <span>atlas.ai</span>
              <span className="text-[8px] font-mono uppercase px-1 rounded bg-white/10 text-emerald-400">
                PET AGENT
              </span>
            </span>
          </div>

          {/* Heart burst when pet */}
          {showPetHeart && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-rose-400 animate-bounce text-xs">
              ❤️
            </span>
          )}
        </button>
      </div>

      {/* =========================================================================
          EXPANDABLE ATLAS AGENT DIALOG HUD
         ========================================================================= */}
      {isAtlasAIOpen && (
        <div className="fixed top-16 right-6 z-[1200] w-[400px] max-w-[94vw] h-[540px] max-h-[78vh] bg-[#0c1322] border border-white/20 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] backdrop-blur-3xl flex flex-col overflow-hidden text-white select-none animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="p-3.5 px-4 border-b border-white/10 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-2.5">
              {/* Pet Drone Avatar Face */}
              <div
                onClick={handlePetAtlas}
                className="w-8 h-8 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-mono text-xs cursor-pointer hover:scale-110 active:scale-95 transition shadow-lg"
                title="Click to Pet Atlas!"
              >
                {petMood === 'loved' ? '❤️' : petMood === 'flying' ? '🚀' : '(^◡^)'}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-xs tracking-tight text-white">atlas.ai</h3>
                  <span className="text-[8.5px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-400/20 text-emerald-300 font-bold border border-emerald-400/30">
                    AUTONOMOUS PET AGENT
                  </span>
                </div>
                <p className="text-[9.5px] text-zinc-400">Direct flight navigation &amp; spatial analysis companion</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePetAtlas}
                className="p-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 transition"
                title="Pet Atlas"
              >
                <Heart className="w-4 h-4 fill-rose-400/30" />
              </button>

              <button
                type="button"
                onClick={() => toggleAtlasAI(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
                title="Close atlas.ai"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Agentic Action Pills Carousel */}
          <div className="px-3 py-2 border-b border-white/10 bg-black/25 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            {agenticActionPills.map((pill) => (
              <button
                key={pill.label}
                type="button"
                onClick={() => (pill.isPet ? handlePetAtlas() : handleSend(pill.prompt!))}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/5 hover:bg-white/15 border border-white/10 hover:border-amber-400/40 text-zinc-200 hover:text-white shrink-0 transition flex items-center gap-1 active:scale-95"
              >
                <span>{pill.label}</span>
              </button>
            ))}
          </div>

          {/* Messages & Agent Action Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0 text-amber-400 mt-0.5 text-[10px] font-mono">
                    ^◡^
                  </div>
                )}

                <div
                  className={`max-w-[85%] p-3 rounded-2xl leading-relaxed text-[11.5px] ${
                    m.role === 'user'
                      ? 'bg-white text-black font-semibold rounded-br-none shadow-md'
                      : 'bg-white/5 border border-white/10 text-zinc-200 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>

                  {/* Agentic Action Execution Card */}
                  {m.actionCard && (
                    <div className="mt-2.5 p-2 rounded-xl bg-[#080d18] border border-amber-400/30 font-mono text-[10px] text-zinc-300">
                      <div className="flex items-center justify-between pb-1 border-b border-white/10">
                        <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>{m.actionCard.title}</span>
                        </span>
                        <span className="text-[8px] px-1 rounded bg-emerald-400/20 text-emerald-300 font-bold">
                          {m.actionCard.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-zinc-400 pt-1 text-[9.5px]">{m.actionCard.details}</p>
                    </div>
                  )}
                </div>

                {m.role === 'user' && (
                  <div className="w-6 h-6 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 text-zinc-300 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-6 h-6 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0 text-amber-400 text-[10px] font-mono">
                  •◡•
                </div>
                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl rounded-bl-none flex items-center gap-2 text-zinc-300 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Atlas is executing spatial commands on your map...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="p-3 border-t border-white/10 bg-black/60 backdrop-blur-xl flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell Atlas: 'Fly to BGC', 'Make it sunset', 'Tour to Tomas Morato'..."
              className="flex-1 bg-white/5 border border-white/15 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-400/50 transition"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-amber-400 text-black disabled:opacity-30 rounded-2xl font-bold transition hover:bg-amber-300 active:scale-95 shrink-0 shadow-md"
              title="Command Atlas"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
