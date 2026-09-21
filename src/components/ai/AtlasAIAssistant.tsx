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
} from 'lucide-react';
import { useMapStore } from '../../store/useMapStore';
import { extractStreetQuery, buildStreetTour } from '../../gis/tourEngine';

interface AtlasMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isTourTrigger?: boolean;
}

export const AtlasAIAssistant: React.FC = () => {
  const {
    isAtlasAIOpen,
    toggleAtlasAI,
    setActiveTour,
    features,
    setToast,
  } = useMapStore();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<AtlasMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Greetings. I am **atlas.ai**, your spatial intelligence analyst. You can ask me any questions about this map, commercial vitality, or prompt me to visualize a corridor (e.g. *"Tour me to Tomas Morato"*).',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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

    // 1. Check if user query is a Cinematic Tour / Flyby intent
    const street = extractStreetQuery(query);
    if (street) {
      setToast(`Generating 3D cinematic flyby for ${street}...`);
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
          text: `🎬 **Launching 3D Cinematic Flyby along ${tour.streetName}**\n\nGliding down the corridor at a 62° pitch. The camera will automatically track the road curvature and pop up holographic callouts pointing out **${tour.pois.length} commercial anchors** in real-time.`,
          isTourTrigger: true,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setIsLoading(false);
        return;
      } catch (err) {
        console.error('Failed to launch tour:', err);
      }
    }

    // 2. Regular Spatial Intelligence Inquiry
    try {
      const scannedPois = features
        .filter((f) => f.kind === 'marker')
        .slice(0, 40)
        .map((f) => ({
          name: f.name,
          category: f.props?.attributes?.Category || f.props?.attributes?.Type || 'Commercial',
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
      const reply = data.reply || data.summary?.strategicNarrative || 'I have analyzed the active spatial parameters for your request.';

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: reply,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: 'I encountered an error analyzing that spatial inquiry. Please try rephrasing or ask for a specific corridor flyby.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'Tour me to Tomas Morato',
    'Flyby EDSA commercial anchors',
    'Evaluate commercial vitality here',
    'Identify underserved retail gaps',
  ];

  return (
    <>
      {/* Floating atlas.ai Trigger Pill (Top-Right Corner) */}
      <div className="fixed top-4 right-6 z-[1000] select-none">
        <button
          type="button"
          onClick={() => toggleAtlasAI()}
          className={`px-3.5 py-1.5 rounded-full flex items-center gap-2 border shadow-2xl backdrop-blur-2xl transition active:scale-95 ${
            isAtlasAIOpen
              ? 'bg-white text-black border-white shadow-white/20 font-black'
              : 'bg-black/80 hover:bg-black/95 text-white border-white/20 hover:border-white/40'
          }`}
          title="Open atlas.ai Spatial Assistant"
        >
          {/* Online Pulsing Core */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
          </span>

          <Sparkles className={`w-3.5 h-3.5 ${isAtlasAIOpen ? 'text-black' : 'text-amber-400'}`} />

          <span className="font-extrabold text-xs tracking-tight">atlas.ai</span>
        </button>
      </div>

      {/* Expandable atlas.ai Floating Chat HUD */}
      {isAtlasAIOpen && (
        <div className="fixed top-16 right-6 z-[1000] w-96 max-w-[94vw] h-[520px] max-h-[75vh] bg-zinc-950/95 border border-white/20 rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden text-white animate-in fade-in slide-in-from-top-3 select-none">
          {/* Header */}
          <div className="p-3.5 px-4 border-b border-white/10 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs tracking-tight text-white flex items-center gap-1.5">
                  <span>atlas.ai</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-400/20 text-emerald-300 font-bold">
                    ACTIVE ANALYST
                  </span>
                </h3>
                <p className="text-[9.5px] text-zinc-400">Spatial Intelligence &amp; Autonomous Visual Tour Agent</p>
              </div>
            </div>

            <button
              onClick={() => toggleAtlasAI(false)}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
              title="Close atlas.ai"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Action Chips */}
          <div className="px-4 py-2 border-b border-white/10 bg-black/20 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/25 text-zinc-300 hover:text-white shrink-0 transition flex items-center gap-1"
              >
                <span>{prompt}</span>
                <ArrowRight className="w-2.5 h-2.5 text-zinc-500" />
              </button>
            ))}
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] p-3 rounded-2xl leading-relaxed text-[11.5px] ${
                    m.role === 'user'
                      ? 'bg-white text-black font-semibold rounded-br-none'
                      : 'bg-white/5 border border-white/10 text-zinc-200 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>
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
                <div className="w-6 h-6 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0 text-amber-400">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl rounded-bl-none flex items-center gap-2 text-zinc-400 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Synthesizing spatial geometry &amp; POIs...</span>
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
              placeholder="Ask anything or 'Tour me to Tomas Morato'..."
              className="flex-1 bg-white/5 border border-white/15 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-white/40 transition"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-white text-black disabled:opacity-30 rounded-2xl font-bold transition hover:bg-zinc-200 active:scale-95 shrink-0"
              title="Send Prompt"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
