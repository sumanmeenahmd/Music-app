import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CloudDownload,
  Heart,
  ListPlus,
  Pause,
  Play,
  Trash2,
} from 'lucide-react';
import { formatBytes, formatDuration } from '../lib/offlineDb';
import type { Track } from '../types/music';
import { CoverArt } from './CoverArt';

interface TrackListProps {
  tracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  isOfflineActive: boolean;
  playlistMode?: boolean;
  onPlayTrack: (track: Track) => void;
  onTogglePlayPause: () => void;
  onToggleOffline: (track: Track) => void;
  onToggleFavorite: (track: Track) => void;
  onAddToPlaylist: (track: Track) => void;
  onPlayNext?: (track: Track) => void;
  onRemoveFromPlaylist?: (trackId: string) => void;
  onMoveTrack?: (fromIndex: number, toIndex: number) => void;
  onDeleteTrack?: (track: Track) => void;
}

export const TrackList: React.FC<TrackListProps> = ({
  tracks,
  currentTrackId,
  isPlaying,
  isOfflineActive,
  playlistMode = false,
  onPlayTrack,
  onTogglePlayPause,
  onToggleOffline,
  onToggleFavorite,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onMoveTrack,
  onDeleteTrack,
}) => {
  if (tracks.length === 0) {
    return null;
  }

  return (
    <div className="divide-y divide-white/[0.06] border-t border-b border-white/[0.06]">
      {tracks.map((track, idx) => {
        const isCurrent = track.id === currentTrackId;
        const isUnavailableOffline = isOfflineActive && !track.offlineSaved;

        return (
          <div
            key={track.id}
            className={`group flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 min-h-[60px] transition-colors ${
              isCurrent
                ? 'bg-amber-500/[0.07]'
                : 'hover:bg-white/[0.03]'
            } ${isUnavailableOffline ? 'opacity-50' : ''}`}
          >
            {/* Track Number / Play Trigger */}
            <button
              type="button"
              onClick={() => (isCurrent ? onTogglePlayPause() : onPlayTrack(track))}
              aria-label={isCurrent && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
              className="w-10 h-10 flex items-center justify-center rounded-lg shrink-0 text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {isCurrent && isPlaying ? (
                <Pause className="w-4 h-4 text-amber-400 fill-amber-400" />
              ) : isCurrent ? (
                <Play className="w-4 h-4 text-amber-400 fill-amber-400" />
              ) : (
                <>
                  <span className="font-mono text-xs tabular-nums group-hover:hidden">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <Play className="w-4 h-4 hidden group-hover:block text-white fill-white" />
                </>
              )}
            </button>

            {/* Cover + Title + Unboxed Metadata */}
            <button
              type="button"
              onClick={() => (isCurrent ? onTogglePlayPause() : onPlayTrack(track))}
              className="flex items-center gap-3 min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-md"
            >
              <CoverArt
                src={track.coverUrl}
                alt={track.title}
                size="sm"
                className="w-11 h-11 rounded-lg border border-white/[0.08]"
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold truncate ${
                    isCurrent ? 'text-amber-300' : 'text-white'
                  }`}
                >
                  {track.title}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate mt-0.5">
                  <span className="truncate">{track.artist}</span>
                  <span aria-hidden="true">·</span>
                  <span className="hidden sm:inline truncate">{track.album}</span>
                  <span className="hidden sm:inline" aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums shrink-0">
                    {formatBytes(track.sizeBytes)}
                  </span>
                  {track.source === 'local' && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-amber-300/80 shrink-0">Local file</span>
                    </>
                  )}
                </div>
              </div>
            </button>

            {/* Offline Save / Saved Action */}
            <button
              type="button"
              onClick={() => onToggleOffline(track)}
              disabled={track.source === 'local'}
              title={
                track.source === 'local'
                  ? 'Local files are stored offline on your device'
                  : track.offlineSaved
                  ? 'Saved offline — tap to remove from offline cache'
                  : 'Save track for offline playback'
              }
              className={`min-h-[40px] px-2.5 sm:px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                track.offlineSaved
                  ? 'text-emerald-300 hover:bg-emerald-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              } ${track.source === 'local' ? 'cursor-default opacity-90' : ''}`}
            >
              {track.offlineSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline">Offline</span>
                </>
              ) : (
                <>
                  <CloudDownload className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline">Save</span>
                </>
              )}
            </button>

            {/* Favorite Button */}
            <button
              type="button"
              onClick={() => onToggleFavorite(track)}
              aria-label={track.favorite ? `Remove ${track.title} from favorites` : `Favorite ${track.title}`}
              className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                track.favorite
                  ? 'text-amber-400 hover:bg-amber-500/10'
                  : 'text-slate-500 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Heart className={`w-4 h-4 ${track.favorite ? 'fill-amber-400' : ''}`} />
            </button>

            {/* Add to Playlist */}
            <button
              type="button"
              onClick={() => onAddToPlaylist(track)}
              aria-label={`Add ${track.title} to playlist`}
              title="Add to playlist"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <ListPlus className="w-4 h-4" />
            </button>

            {/* Playlist Reorder / Remove OR Library Delete for local uploads */}
            {playlistMode && onMoveTrack && onRemoveFromPlaylist ? (
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onMoveTrack(idx, idx - 1)}
                  disabled={idx === 0}
                  aria-label={`Move ${track.title} up`}
                  className="min-h-[40px] min-w-[36px] hidden sm:flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-25 disabled:pointer-events-none"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onMoveTrack(idx, idx + 1)}
                  disabled={idx === tracks.length - 1}
                  aria-label={`Move ${track.title} down`}
                  className="min-h-[40px] min-w-[36px] hidden sm:flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-25 disabled:pointer-events-none"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveFromPlaylist(track.id)}
                  aria-label={`Remove ${track.title} from playlist`}
                  title="Remove from playlist"
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              track.source === 'local' &&
              onDeleteTrack && (
                <button
                  type="button"
                  onClick={() => onDeleteTrack(track)}
                  aria-label={`Delete ${track.title}`}
                  title="Delete from device library"
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )
            )}

            {/* Duration */}
            <span className="font-mono text-xs tabular-nums text-slate-400 w-10 text-right shrink-0">
              {formatDuration(track.duration)}
            </span>
          </div>
        );
      })}
    </div>
  );
};
