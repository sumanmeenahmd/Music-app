import React from 'react';
import { CheckCircle2, Play, Plus } from 'lucide-react';
import { formatBytes, formatDuration } from '../lib/offlineDb';
import type { Playlist, Track } from '../types/music';
import { CoverArt } from './CoverArt';

interface PlaylistsOverviewProps {
  playlists: Playlist[];
  tracks: Track[];
  onOpenPlaylist: (playlistId: string) => void;
  onPlayPlaylist: (playlist: Playlist) => void;
  onCreatePlaylist: () => void;
}

export const PlaylistsOverview: React.FC<PlaylistsOverviewProps> = ({
  playlists,
  tracks,
  onOpenPlaylist,
  onPlayPlaylist,
  onCreatePlaylist,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Your Playlists
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Curate custom collections and save entire playlists for offline listening.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreatePlaylist}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-[#0B0D11] text-sm font-semibold hover:bg-amber-400 transition-colors whitespace-nowrap min-h-[42px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          <Plus className="w-4 h-4" />
          <span>New Playlist</span>
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="py-16 px-6 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
          <p className="text-base font-semibold text-white">No playlists created yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Create your first playlist to group your favorite songs and cache them offline.
          </p>
          <button
            type="button"
            onClick={onCreatePlaylist}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 text-[#0B0D11] text-sm font-semibold hover:bg-amber-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Playlist</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {playlists.map((pl) => {
            const plTracks = pl.trackIds
              .map((id) => tracks.find((t) => t.id === id))
              .filter((t): t is Track => Boolean(t));
            const totalDuration = plTracks.reduce((s, t) => s + t.duration, 0);
            const totalSize = plTracks.reduce((s, t) => s + t.sizeBytes, 0);
            const offlineCount = plTracks.filter((t) => t.offlineSaved).length;
            const allOffline = plTracks.length > 0 && offlineCount === plTracks.length;

            return (
              <div
                key={pl.id}
                className="group rounded-2xl bg-[#13161E] border border-white/[0.07] hover:border-white/[0.14] transition-colors overflow-hidden flex flex-col"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0E1117]">
                  <button
                    type="button"
                    onClick={() => onOpenPlaylist(pl.id)}
                    className="w-full h-full block focus-visible:outline-none"
                    aria-label={`Open ${pl.name}`}
                  >
                    <CoverArt
                      src={pl.coverUrl}
                      alt={pl.name}
                      size="lg"
                      className="w-full h-full group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  </button>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#13161E] via-transparent to-transparent pointer-events-none" />
                  {plTracks.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onPlayPlaylist(pl)}
                      aria-label={`Play ${pl.name}`}
                      className="absolute bottom-3 right-3 w-11 h-11 rounded-full bg-amber-500 text-[#0B0D11] flex items-center justify-center shadow-lg hover:bg-amber-400 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onOpenPlaylist(pl.id)}
                  className="p-5 text-left flex-1 flex flex-col justify-between focus-visible:outline-none"
                >
                  <div>
                    <h2 className="font-display text-lg font-semibold text-white truncate">
                      {pl.name}
                    </h2>
                    {pl.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {pl.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
                    <span>
                      {plTracks.length} {plTracks.length === 1 ? 'track' : 'tracks'} · {formatDuration(totalDuration)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {allOffline && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      <span>{formatBytes(totalSize)}</span>
                    </span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
