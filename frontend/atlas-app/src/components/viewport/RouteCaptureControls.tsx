'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Circle, Download, Film, Square, TriangleAlert, Sparkles } from 'lucide-react';
import { GISFeature } from '../../types/gis';

type CaptureState = 'ready' | 'recording' | 'saving' | 'saved' | 'error';
type CaptureQuality = 'sd' | 'hd';

interface RouteCaptureControlsProps {
  route: GISFeature;
}

export const RouteCaptureControls: React.FC<RouteCaptureControlsProps> = ({ route }) => {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureFrameRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const routeIdRef = useRef(route.id);
  const mountedRef = useRef(true);
  const [captureState, setCaptureState] = useState<CaptureState>('ready');
  const [captureQuality, setCaptureQuality] = useState<CaptureQuality>('hd');
  const [errorMessage, setErrorMessage] = useState('');

  const releaseStream = useCallback(() => {
    if (captureFrameRef.current != null) cancelAnimationFrame(captureFrameRef.current);
    captureFrameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    captureCanvasRef.current = null;
    recorderRef.current = null;
  }, []);

  const stopRecording = useCallback((stopRoute: boolean) => {
    if (stopRoute) {
      window.dispatchEvent(new CustomEvent('atlas:stop-route-animation'));
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      setCaptureState('saving');
      recorder.stop();
    }
  }, []);

  useEffect(() => {
    if (routeIdRef.current === route.id) return;
    routeIdRef.current = route.id;
    stopRecording(true);
    setCaptureState('ready');
    setErrorMessage('');
  }, [route.id, stopRecording]);

  useEffect(() => {
    const onRouteEnded = (event: Event) => {
      if ((event as CustomEvent).detail?.featureId === route.id) stopRecording(false);
    };
    const onRouteStatus = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.featureId === route.id && detail.status === 'error') {
        setErrorMessage('The route could not be played. Check the route and try again.');
        stopRecording(true);
      }
    };
    window.addEventListener('atlas:route-animation-ended', onRouteEnded);
    window.addEventListener('atlas:route-animation-status', onRouteStatus);
    return () => {
      window.removeEventListener('atlas:route-animation-ended', onRouteEnded);
      window.removeEventListener('atlas:route-animation-status', onRouteStatus);
    };
  }, [route.id, stopRecording]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      window.dispatchEvent(new CustomEvent('atlas:stop-route-animation'));
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
      releaseStream();
    };
  }, [releaseStream]);

  const downloadRecording = (blob: Blob) => {
    if (blob.size === 0) {
      if (mountedRef.current) {
        setErrorMessage('the recording was empty. try again after the map has finished loading.');
        setCaptureState('error');
      }
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const safeName = route.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'route';
    const timestamp = new Date().toISOString().toLowerCase().replace(/[:.]/g, '-');
    anchor.href = url;
    anchor.download = `${safeName}-${timestamp}.webm`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    if (mountedRef.current) setCaptureState('saved');
  };

  const startRecording = () => {
    setErrorMessage('');
    const map = (window as any).__map;
    const canvas = map?.getCanvas?.() as HTMLCanvasElement | undefined;
    if (!canvas || typeof MediaRecorder === 'undefined') {
      setErrorMessage('video capture is not available here. try the latest chrome or edge.');
      setCaptureState('error');
      return;
    }

    try {
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = captureQuality === 'hd' ? 1920 : 854;
      outputCanvas.height = captureQuality === 'hd' ? 1080 : 480;
      const outputContext = outputCanvas.getContext('2d');
      if (!outputContext || !outputCanvas.captureStream) throw new Error('video capture is not available here.');

      const drawFrame = () => {
        const sourceWidth = canvas.width;
        const sourceHeight = canvas.height;
        if (sourceWidth > 0 && sourceHeight > 0) {
          const scale = Math.min(outputCanvas.width / sourceWidth, outputCanvas.height / sourceHeight);
          const width = sourceWidth * scale;
          const height = sourceHeight * scale;
          outputContext.fillStyle = '#000000';
          outputContext.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
          outputContext.drawImage(canvas, (outputCanvas.width - width) / 2, (outputCanvas.height - height) / 2, width, height);
        }
        captureFrameRef.current = requestAnimationFrame(drawFrame);
      };
      captureCanvasRef.current = outputCanvas;
      drawFrame();
      const stream = outputCanvas.captureStream(60);
      const preferredMime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
        .find((mime) => MediaRecorder.isTypeSupported(mime));
      if (!preferredMime) throw new Error('webm recording is not supported here. try the latest chrome or edge.');
      const recorder = new MediaRecorder(stream, {
        mimeType: preferredMime,
        videoBitsPerSecond: captureQuality === 'hd' ? 12_000_000 : 2_500_000,
      });
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        if (mountedRef.current) {
          setErrorMessage('Recording stopped unexpectedly. Try again.');
          setCaptureState('error');
        }
        window.dispatchEvent(new CustomEvent('atlas:stop-route-animation'));
        releaseStream();
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
        chunksRef.current = [];
        releaseStream();
        downloadRecording(blob);
      };
      recorder.start(1000);
      setCaptureState('recording');
      const settings = route.props.routeAnimation;
      window.dispatchEvent(new CustomEvent('atlas:play-route-animation', {
        detail: { featureId: route.id, ...settings },
      }));
    } catch (error) {
      releaseStream();
      setErrorMessage(error instanceof Error ? error.message.toLowerCase() : 'could not start map recording.');
      setCaptureState('error');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="rounded-lg bg-sky-400/10 p-2 text-sky-300"><Film className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-white">capture the map</h4>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">record the map as the route draws, then download the video. only the map is captured.</p>
        </div>
      </div>

      <fieldset disabled={captureState === 'recording' || captureState === 'saving'} className="space-y-2 disabled:opacity-60">
        <legend className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-300"><Sparkles className="h-3.5 w-3.5 text-sky-300" /> video quality</legend>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: 'sd' as const, label: 'sd', detail: '480p · smaller file' },
            { id: 'hd' as const, label: 'hd', detail: '1080p · sharper map' },
          ]).map((option) => (
            <button key={option.id} type="button" aria-pressed={captureQuality === option.id} onClick={() => setCaptureQuality(option.id)} className={`rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${captureQuality === option.id ? 'border-sky-400 bg-sky-400/10 text-white' : 'border-white/10 bg-white/[0.02] text-zinc-300 hover:bg-white/5'}`}>
              <span className="block text-sm font-bold">{option.label}</span><span className="mt-0.5 block text-[10px] text-zinc-400">{option.detail}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {captureState === 'recording' ? (
        <button type="button" onClick={() => stopRecording(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">
          <Square className="h-4 w-4 fill-current" /> stop and download
        </button>
      ) : (
        <button type="button" onClick={startRecording} disabled={route.props.visible === 0} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
          {captureState === 'saving' ? <><Download className="h-4 w-4 animate-pulse" /> preparing download</> : captureState === 'saved' ? <><Download className="h-4 w-4" /> record again</> : <><Circle className="h-3.5 w-3.5 fill-current" /> record route</>}
        </button>
      )}

      <p aria-live="polite" className="flex min-h-4 items-center justify-center gap-1.5 text-center text-xs text-zinc-400">
        {captureState === 'recording' && <><span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> recording route</>}
        {captureState === 'saving' && 'finishing video'}
        {captureState === 'saved' && <><Download className="h-3.5 w-3.5" /> video downloaded</>}
        {captureState === 'ready' && `${captureQuality} video · up to 60 fps`}
        {captureState === 'error' && <><TriangleAlert className="h-3.5 w-3.5 text-amber-400" /> {errorMessage}</>}
      </p>
    </div>
  );
};
