import React from 'react';
import {
  ChevronUp,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatDuration } from '../lib/offlineDb';
import type { RepeatMode, Track } from '../types/music';
import { CoverArt } from './CoverArt';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoadingAudio: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;
  onTogglePlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onOpenNowPlaying: () => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentTrack,
  isPlaying,
  isLoadingAudio,
  currentTime,
  duration,
  volume,
  isMuted,
  shuffle,
  repeatMode,
  onTogglePlayPause,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onCycleRepeat,
  onOpenNowPlaying,
}) => {
  const effectiveDuration = duration || currentTrack?.duration || 0;
  const progressPct =
    effectiveDuration > 0 ? Math.min(100, (currentTime / effectiveDuration) * 100) : 0;

  return (
    <footer className="border-t border-white/[0.08] bg-[#10131A]/95 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3 z-30">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3 sm:gap-6">
        {/* Left: Track Info */}
        <button
          type="button"
          onClick={onOpenNowPlaying}
          disabled={!currentTrack}
          className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial sm:w-[260px] text-left rounded-lg hover:bg-white/[0.04] p-1 -m-1 transition-colors disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <CoverArt
            src={currentTrack?.coverUrl ?? ''}
            alt={currentTrack?.title ?? 'No track selected'}
            size="sm"
            className="w-11 h-11 rounded-lg border border-white/10"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">
              {currentTrack ? currentTrack.title : 'Select a song to play'}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {currentTrack
                ? `${currentTrack.artist} · ${currentTrack.offlineSaved ? 'Offline Ready' : 'Online'}`
                : 'Your offline studio is ready'}
            </p>
          </div>
          {currentTrack && (
            <ChevronUp className="w-4 h-4 text-slate-400 sm:hidden shrink-0" />
          )}
        </button>

        {/* Center: Playback Controls + Scrubber */}
        <div className="flex flex-col items-center gap-1.5 sm:flex-1 sm:max-w-xl">
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              onClick={onToggleShuffle}
              aria-label="Toggle shuffle"
              title="Shuffle"
              className={`hidden sm:flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                shuffle ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onPrevious}
              aria-label="Previous track"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={onTogglePlayPause}
              disabled={isLoadingAudio}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="w-11 h-11 rounded-full bg-amber-500 text-[#0B0D11] flex items-center justify-center hover:bg-amber-400 transition-transform active:scale-95 disabled:opacity-60 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onNext}
              aria-label="Next track"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={onCycleRepeat}
              aria-label={`Repeat mode: ${repeatMode}`}
              title={`Repeat: ${repeatMode}`}
              className={`hidden sm:flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
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

          {/* Scrubber Bar (Desktop) */}
          <div className="hidden sm:flex items-center gap-2.5 w-full">
            <span className="font-mono text-[11px] tabular-nums text-slate-400 w-9 text-right">
              {formatDuration(currentTime)}
            </span>
            <input
              type="range"
              aria-label="Seek audio position"
              min={0}
              max={effectiveDuration || 100}
              step={0.1}
              value={Math.min(currentTime, effectiveDuration || 100)}
              onChange={(e) => onSeek(Number(e.target.value))}
              style={{
                background: `linear-gradient(to right, #F59E0B ${progressPct}%, rgba(255,255,255,0.12) ${progressPct}%)`,
              }}
              className="audio-range flex-1 h-1 rounded-full"
            />
            <span className="font-mono text-[11px] tabular-nums text-slate-400 w-9">
              {formatDuration(effectiveDuration)}
            </span>
          </div>
        </div>

        {/* Right: Volume + Queue Trigger (Desktop) */}
        <div className="hidden sm:flex items-center justify-end gap-3 w-[240px]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              aria-label="Volume"
              min={0}
              max={1}
              step={0.02}
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              style={{
                background: `linear-gradient(to right, #F59E0B ${
                  (isMuted ? 0 : volume) * 100
                }%, rgba(255,255,255,0.12) ${(isMuted ? 0 : volume) * 100}%)`,
              }}
              className="audio-range w-24 h-1 rounded-full"
            />
          </div>

          <button
            type="button"
            onClick={onOpenNowPlaying}
            aria-label="Open Now Playing and Queue"
            title="Now Playing & Queue"
            className="min-h-[38px] px-2.5 flex items-center gap-1.5 rounded-lg border border-white/10 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors whitespace-nowrap"
          >
            <ListMusic className="w-4 h-4 text-amber-400" />
            <span>Queue</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
