import React, { useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react';
import { formatDuration } from '../lib/offlineDb';
import type { RepeatMode, Track } from '../types/music';
import { CoverArt } from './CoverArt';

interface NowPlayingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  queueTracks: Track[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeatMode: RepeatMode;
  analyserRef: React.RefObject<AnalyserNode | null>;
  onTogglePlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onPlayTrack: (track: Track) => void;
}

export const NowPlayingSheet: React.FC<NowPlayingSheetProps> = ({
  isOpen,
  onClose,
  currentTrack,
  queueTracks,
  isPlaying,
  currentTime,
  duration,
  shuffle,
  repeatMode,
  analyserRef,
  onTogglePlayPause,
  onNext,
  onPrevious,
  onSeek,
  onToggleShuffle,
  onCycleRepeat,
  onPlayTrack,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let rafId = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bars = 24;
    const data = new Uint8Array(32);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (analyserRef.current && isPlaying) {
        analyserRef.current.getByteFrequencyData(data);
      } else {
        data.fill(isPlaying ? 48 : 10);
      }

      const gap = 4;
      const barW = (w - gap * (bars - 1)) / bars;
      for (let i = 0; i < bars; i++) {
        const val = data[i % data.length] / 255;
        const barH = Math.max(4, val * (h - 4));
        const x = i * (barW + gap);
        const y = h - barH;
        ctx.fillStyle = isPlaying ? 'rgba(245, 158, 11, 0.85)' : 'rgba(148, 163, 184, 0.25)';
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, 2);
        ctx.fill();
      }
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [analyserRef, isOpen, isPlaying]);

  if (!isOpen) return null;

  const effectiveDuration = duration || currentTrack?.duration || 0;
  const progressPct =
    effectiveDuration > 0 ? Math.min(100, (currentTime / effectiveDuration) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-6">
      <div className="w-full sm:max-w-4xl max-h-[92vh] rounded-t-3xl sm:rounded-2xl bg-[#11141C] border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.07] flex items-center justify-between shrink-0">
          <h2 className="font-display text-base font-semibold text-white">Now Playing &amp; Queue</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Now Playing"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Two-column body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.07]">
          {/* Left: Current Track + Spectrum + Controls */}
          <div className="p-6 flex flex-col items-center justify-center text-center space-y-5">
            <CoverArt
              src={currentTrack?.coverUrl ?? ''}
              alt={currentTrack?.title ?? 'No track'}
              size="xl"
              className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl border border-white/10 shadow-2xl"
            />

            <div className="space-y-1 max-w-xs">
              <h3 className="font-display text-xl font-bold text-white truncate">
                {currentTrack?.title ?? 'No Track Active'}
              </h3>
              <p className="text-sm text-slate-400 truncate">
                {currentTrack
                  ? `${currentTrack.artist} · ${currentTrack.album}`
                  : 'Choose any track to begin'}
              </p>
              {currentTrack?.offlineSaved && (
                <p className="inline-flex items-center gap-1.5 text-xs text-emerald-300 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Available Offline</span>
                </p>
              )}
            </div>

            {/* Live Frequency Visualizer */}
            <canvas
              ref={canvasRef}
              width={260}
              height={42}
              className="w-[260px] h-[42px]"
              aria-hidden="true"
            />

            {/* Seek */}
            <div className="w-full max-w-xs space-y-1.5">
              <input
                type="range"
                aria-label="Seek position"
                min={0}
                max={effectiveDuration || 100}
                step={0.1}
                value={Math.min(currentTime, effectiveDuration || 100)}
                onChange={(e) => onSeek(Number(e.target.value))}
                style={{
                  background: `linear-gradient(to right, #F59E0B ${progressPct}%, rgba(255,255,255,0.14) ${progressPct}%)`,
                }}
                className="audio-range w-full h-1 rounded-full"
              />
              <div className="flex items-center justify-between font-mono text-[11px] tabular-nums text-slate-400">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(effectiveDuration)}</span>
              </div>
            </div>

            {/* Transport */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onToggleShuffle}
                aria-label="Shuffle"
                className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg ${
                  shuffle ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onPrevious}
                aria-label="Previous"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-200 hover:bg-white/[0.06]"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>
              <button
                type="button"
                onClick={onTogglePlayPause}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="w-14 h-14 rounded-full bg-amber-500 text-[#0B0D11] flex items-center justify-center hover:bg-amber-400 transition-transform active:scale-95"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={onNext}
                aria-label="Next"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-200 hover:bg-white/[0.06]"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
              <button
                type="button"
                onClick={onCycleRepeat}
                aria-label="Repeat"
                className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg ${
                  repeatMode !== 'off'
                    ? 'text-amber-400 bg-amber-500/10'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="w-4 h-4" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Right: Up Next Queue */}
          <div className="p-5 flex flex-col min-h-[280px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Up Next</h3>
              <span className="font-mono text-xs tabular-nums text-slate-400">
                {queueTracks.length} {queueTracks.length === 1 ? 'track' : 'tracks'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06]">
              {queueTracks.map((t) => {
                const active = t.id === currentTrack?.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onPlayTrack(t)}
                    className={`w-full flex items-center gap-3 py-2.5 px-2 rounded-lg text-left transition-colors ${
                      active ? 'bg-amber-500/10' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <CoverArt
                      src={t.coverUrl}
                      alt={t.title}
                      size="sm"
                      className="w-9 h-9 rounded-md border border-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium truncate ${
                          active ? 'text-amber-300' : 'text-white'
                        }`}
                      >
                        {t.title}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{t.artist}</p>
                    </div>
                    <span className="font-mono text-xs tabular-nums text-slate-500">
                      {formatDuration(t.duration)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
