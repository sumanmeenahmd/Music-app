import React from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  CloudDownload,
  Edit3,
  ListPlus,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import { formatBytes, formatDuration } from '../lib/offlineDb';
import type { Playlist, Track } from '../types/music';
import { CoverArt } from './CoverArt';
import { TrackList } from './TrackList';

interface PlaylistViewProps {
  playlist: Playlist;
  playlistTracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  isOfflineActive: boolean;
  onBack: () => void;
  onPlayPlaylist: () => void;
  onPlayTrack: (track: Track) => void;
  onTogglePlayPause: () => void;
  onSaveAllOffline: () => void;
  onEditPlaylist: () => void;
  onDeletePlaylist: () => void;
  onOpenAddSongs: () => void;
  onToggleOffline: (track: Track) => void;
  onToggleFavorite: (track: Track) => void;
  onAddToPlaylist: (track: Track) => void;
  onRemoveFromPlaylist: (trackId: string) => void;
  onMoveTrack: (fromIndex: number, toIndex: number) => void;
}

export const PlaylistView: React.FC<PlaylistViewProps> = ({
  playlist,
  playlistTracks,
  currentTrackId,
  isPlaying,
  isOfflineActive,
  onBack,
  onPlayPlaylist,
  onPlayTrack,
  onTogglePlayPause,
  onSaveAllOffline,
  onEditPlaylist,
  onDeletePlaylist,
  onOpenAddSongs,
  onToggleOffline,
  onToggleFavorite,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onMoveTrack,
}) => {
  const totalSeconds = playlistTracks.reduce((sum, t) => sum + (t.duration || 0), 0);
  const totalBytes = playlistTracks.reduce((sum, t) => sum + (t.sizeBytes || 0), 0);
  const offlineCount = playlistTracks.filter((t) => t.offlineSaved).length;
  const allSavedOffline = playlistTracks.length > 0 && offlineCount === playlistTracks.length;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-md"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>All Playlists</span>
      </button>

      {/* Editorial Playlist Hero */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-6 pb-6 border-b border-white/[0.07]">
        <CoverArt
          src={playlist.coverUrl}
          alt={playlist.name}
          size="xl"
          className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl border border-white/10 shadow-xl"
        />

        <div className="flex-1 min-w-0 space-y-3">
          <p className="text-xs font-medium text-amber-400">Playlist</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white [text-wrap:balance]">
            {playlist.name}
          </h1>
          {playlist.description && (
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              {playlist.description}
            </p>
          )}

          {/* Unboxed Metadata */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums pt-1">
            <span>
              {playlistTracks.length} {playlistTracks.length === 1 ? 'track' : 'tracks'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatDuration(totalSeconds)} total</span>
            <span aria-hidden="true">·</span>
            <span>{formatBytes(totalBytes)}</span>
            <span aria-hidden="true">·</span>
            <span className={allSavedOffline ? 'text-emerald-300' : 'text-slate-300'}>
              {offlineCount}/{playlistTracks.length} offline ready
            </span>
          </div>

          {/* Primary & Secondary Actions */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onPlayPlaylist}
              disabled={playlistTracks.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 text-[#0B0D11] text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap min-h-[42px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play Playlist</span>
            </button>

            <button
              type="button"
              onClick={onSaveAllOffline}
              disabled={playlistTracks.length === 0 || allSavedOffline}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap min-h-[42px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                allSavedOffline
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] disabled:opacity-40'
              }`}
            >
              {allSavedOffline ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Saved Offline</span>
                </>
              ) : (
                <>
                  <CloudDownload className="w-4 h-4 text-amber-400" />
                  <span>Save Playlist Offline</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenAddSongs}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] text-sm font-medium transition-colors whitespace-nowrap min-h-[42px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <ListPlus className="w-4 h-4" />
              <span>Add Songs</span>
            </button>

            <button
              type="button"
              onClick={onEditPlaylist}
              aria-label="Edit playlist details"
              className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onDeletePlaylist}
              aria-label="Delete playlist"
              className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tracks or Empty State */}
      {playlistTracks.length === 0 ? (
        <div className="py-14 px-6 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
          <p className="text-base font-semibold text-white">This playlist has no songs yet</p>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Add tracks from your library or import local audio files to start building this playlist.
          </p>
          <button
            type="button"
            onClick={onOpenAddSongs}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 text-[#0B0D11] text-sm font-semibold hover:bg-amber-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Songs to Playlist</span>
          </button>
        </div>
      ) : (
        <TrackList
          tracks={playlistTracks}
          currentTrackId={currentTrackId}
          isPlaying={isPlaying}
          isOfflineActive={isOfflineActive}
          playlistMode
          onPlayTrack={onPlayTrack}
          onTogglePlayPause={onTogglePlayPause}
          onToggleOffline={onToggleOffline}
          onToggleFavorite={onToggleFavorite}
          onAddToPlaylist={onAddToPlaylist}
          onRemoveFromPlaylist={onRemoveFromPlaylist}
          onMoveTrack={onMoveTrack}
        />
      )}
    </div>
  );
};
