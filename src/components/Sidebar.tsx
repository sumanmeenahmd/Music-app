import React from 'react';
import {
  CheckCircle2,
  Heart,
  Library,
  ListMusic,
  Plus,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { formatBytes } from '../lib/offlineDb';
import type { ActiveView, Playlist } from '../types/music';
import { CoverArt } from './CoverArt';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  playlists: Playlist[];
  totalTracksCount: number;
  offlineTracksCount: number;
  favoritesCount: number;
  offlineBytes: number;
  isOfflineMode: boolean;
  isOnline: boolean;
  onToggleOfflineMode: () => void;
  onOpenCreatePlaylist: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  playlists,
  totalTracksCount,
  offlineTracksCount,
  favoritesCount,
  offlineBytes,
  isOfflineMode,
  isOnline,
  onToggleOfflineMode,
  onOpenCreatePlaylist,
}) => {
  const isNavActive = (type: ActiveView['type']) => activeView.type === type;

  return (
    <aside className="hidden lg:flex flex-col w-[264px] shrink-0 bg-[#10131A] border-r border-white/[0.07] h-full select-none">
      {/* Brand Wordmark */}
      <div className="px-6 pt-6 pb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onSelectView({ type: 'all' })}
          className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-md"
        >
          <span className="font-display text-2xl font-bold tracking-tight text-white whitespace-nowrap">
            Tarang
          </span>
        </button>
      </div>

      {/* Primary Library Nav */}
      <nav aria-label="Library navigation" className="px-3 space-y-1">
        <button
          type="button"
          onClick={() => onSelectView({ type: 'all' })}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[42px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            isNavActive('all')
              ? 'bg-white/[0.08] text-white'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span className="flex items-center gap-3 whitespace-nowrap">
            <Library className={`w-4 h-4 ${isNavActive('all') ? 'text-amber-400' : ''}`} />
            All Songs
          </span>
          <span className="font-mono text-xs tabular-nums text-slate-400">{totalTracksCount}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectView({ type: 'offline' })}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[42px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            isNavActive('offline')
              ? 'bg-white/[0.08] text-white'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span className="flex items-center gap-3 whitespace-nowrap">
            <CheckCircle2 className={`w-4 h-4 ${isNavActive('offline') ? 'text-amber-400' : ''}`} />
            Offline Saved
          </span>
          <span className="font-mono text-xs tabular-nums text-slate-400">{offlineTracksCount}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectView({ type: 'favorites' })}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[42px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            isNavActive('favorites')
              ? 'bg-white/[0.08] text-white'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span className="flex items-center gap-3 whitespace-nowrap">
            <Heart className={`w-4 h-4 ${isNavActive('favorites') ? 'text-amber-400' : ''}`} />
            Favorites
          </span>
          <span className="font-mono text-xs tabular-nums text-slate-400">{favoritesCount}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectView({ type: 'playlists' })}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[42px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            isNavActive('playlists')
              ? 'bg-white/[0.08] text-white'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span className="flex items-center gap-3 whitespace-nowrap">
            <ListMusic className={`w-4 h-4 ${isNavActive('playlists') ? 'text-amber-400' : ''}`} />
            All Playlists
          </span>
          <span className="font-mono text-xs tabular-nums text-slate-400">{playlists.length}</span>
        </button>
      </nav>

      {/* Playlists Section */}
      <div className="mt-6 pt-5 border-t border-white/[0.07] px-3 flex-1 flex flex-col min-h-0">
        <div className="px-3 mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-400">Playlists</h2>
          <button
            type="button"
            onClick={onOpenCreatePlaylist}
            aria-label="Create new playlist"
            className="flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300 px-2 py-1 rounded-md hover:bg-amber-500/10 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {playlists.length === 0 ? (
            <p className="px-3 py-4 text-xs text-slate-500">
              No playlists yet. Create one to organize your tracks.
            </p>
          ) : (
            playlists.map((pl) => {
              const active =
                activeView.type === 'playlist' && activeView.playlistId === pl.id;
              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => onSelectView({ type: 'playlist', playlistId: pl.id })}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    active
                      ? 'bg-white/[0.08] text-white'
                      : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <CoverArt
                    src={pl.coverUrl}
                    alt={pl.name}
                    size="sm"
                    className="w-8 h-8 rounded-md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{pl.name}</p>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">
                      {pl.trackIds.length} {pl.trackIds.length === 1 ? 'track' : 'tracks'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Offline Vault & Install Footer */}
      <div className="p-4 border-t border-white/[0.07] space-y-3 bg-[#0D1016]">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Offline Storage</span>
            <span className="font-mono tabular-nums text-slate-200 font-medium">
              {formatBytes(offlineBytes)}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/[0.07] overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-transform origin-left"
              style={{
                width: `${
                  totalTracksCount > 0
                    ? Math.max(6, Math.round((offlineTracksCount / totalTracksCount) * 100))
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-[11px] text-slate-500 font-mono tabular-nums">
            {offlineTracksCount} of {totalTracksCount} tracks cached locally
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleOfflineMode}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium border transition-colors min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            isOfflineMode || !isOnline
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
              : 'bg-white/[0.03] border-white/[0.08] text-slate-300 hover:bg-white/[0.06]'
          }`}
        >
          <span className="flex items-center gap-2 whitespace-nowrap">
            {isOfflineMode || !isOnline ? (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Wifi className="w-3.5 h-3.5 text-slate-400" />
            )}
            {!isOnline ? 'Device Offline' : isOfflineMode ? 'Offline Mode On' : 'Offline Mode Off'}
          </span>
          <span className="text-[11px] text-slate-400">
            {!isOnline ? 'Auto' : isOfflineMode ? 'Active' : 'Switch'}
          </span>
        </button>

        <PWAInstallButton />
      </div>
    </aside>
  );
};
