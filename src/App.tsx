import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CloudDownload,
  Heart,
  Play,
  Plus,
  Search,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  AddSongsToPlaylistModal,
  AddToPlaylistModal,
  CreatePlaylistModal,
  ImportSongsModal,
} from './components/Modals';
import { MobileNav } from './components/MobileNav';
import { NowPlayingSheet } from './components/NowPlayingSheet';
import { PlayerBar } from './components/PlayerBar';
import { PlaylistView } from './components/PlaylistView';
import { PlaylistsOverview } from './components/PlaylistsOverview';
import { PWAInstallButton } from './components/PWAInstallButton';
import { Sidebar } from './components/Sidebar';
import { TrackList } from './components/TrackList';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  createPlaylist,
  deletePlaylist,
  deleteTrackFromLibrary,
  formatBytes,
  formatDuration,
  getAllPlaylists,
  getAllTracks,
  importLocalAudioFiles,
  initLibraryIfEmpty,
  setTrackOfflineSaved,
  toggleTrackFavorite,
  updatePlaylist,
} from './lib/offlineDb';
import { CURATED_COVERS, type ActiveView, type Playlist, type Track } from './types/music';

export default function App() {
  const isOnline = useOnlineStatus();
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const isOfflineActive = isOfflineMode || !isOnline;

  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>({ type: 'all' });
  const [searchQuery, setSearchQuery] = useState('');

  // Modal & sheet states
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<Track | null>(null);
  const [addSongsPlaylistId, setAddSongsPlaylistId] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);

  const loadLibrary = useCallback(async () => {
    try {
      await initLibraryIfEmpty();
      const [loadedTracks, loadedPlaylists] = await Promise.all([
        getAllTracks(),
        getAllPlaylists(),
      ]);
      setTracks(loadedTracks);
      setPlaylists(loadedPlaylists);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  const player = useAudioPlayer({
    tracks,
    isOfflineActive,
  });

  // Library derived counts
  const offlineTracks = useMemo(() => tracks.filter((t) => t.offlineSaved), [tracks]);
  const favoriteTracks = useMemo(() => tracks.filter((t) => t.favorite), [tracks]);
  const offlineBytes = useMemo(
    () => offlineTracks.reduce((sum, t) => sum + (t.sizeBytes || 0), 0),
    [offlineTracks]
  );

  // Filtered tracks for current view
  const displayedTracks = useMemo(() => {
    let base = tracks;
    if (activeView.type === 'offline') {
      base = offlineTracks;
    } else if (activeView.type === 'favorites') {
      base = favoriteTracks;
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q)
    );
  }, [activeView.type, favoriteTracks, offlineTracks, searchQuery, tracks]);

  const activePlaylist = useMemo(() => {
    if (activeView.type !== 'playlist') return null;
    return playlists.find((p) => p.id === activeView.playlistId) ?? null;
  }, [activeView, playlists]);

  const activePlaylistTracks = useMemo(() => {
    if (!activePlaylist) return [];
    const mapped = activePlaylist.trackIds
      .map((id) => tracks.find((t) => t.id === id))
      .filter((t): t is Track => Boolean(t));
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mapped;
    return mapped.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q)
    );
  }, [activePlaylist, searchQuery, tracks]);

  // Handlers
  const handleToggleOfflineTrack = async (track: Track) => {
    if (track.source === 'local') return;
    if (!track.offlineSaved && !isOnline) {
      player.setPlaybackNotice('Connect to the internet to download and cache this track offline.');
      return;
    }
    const updated = await setTrackOfflineSaved(track, !track.offlineSaved);
    setTracks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    player.setPlaybackNotice(
      updated.offlineSaved
        ? `"${updated.title}" saved for offline playback.`
        : `"${updated.title}" removed from offline cache.`
    );
  };

  const handleSaveAllOfflineInView = async (targetTracks: Track[]) => {
    const toCache = targetTracks.filter((t) => !t.offlineSaved);
    if (toCache.length === 0) return;
    if (!isOnline) {
      player.setPlaybackNotice('Reconnect to cache remaining tracks offline.');
      return;
    }
    const updatedList = await Promise.all(toCache.map((t) => setTrackOfflineSaved(t, true)));
    const map = new Map(updatedList.map((u) => [u.id, u]));
    setTracks((prev) => prev.map((t) => map.get(t.id) ?? t));
    player.setPlaybackNotice(`Saved ${updatedList.length} tracks to offline storage.`);
  };

  const handleToggleFavorite = async (track: Track) => {
    const updated = await toggleTrackFavorite(track);
    setTracks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleDeleteLocalTrack = async (track: Track) => {
    await deleteTrackFromLibrary(track.id);
    setTracks((prev) => prev.filter((t) => t.id !== track.id));
    setPlaylists((prev) =>
      prev.map((pl) => ({
        ...pl,
        trackIds: pl.trackIds.filter((id) => id !== track.id),
      }))
    );
    player.setPlaybackNotice(`Deleted "${track.title}" from device library.`);
  };

  const handleCreateOrEditPlaylist = async (data: {
    name: string;
    description: string;
    coverUrl: string;
  }) => {
    if (editingPlaylist) {
      const updated = await updatePlaylist({
        ...editingPlaylist,
        ...data,
      });
      setPlaylists((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditingPlaylist(null);
      return;
    }

    const created = await createPlaylist(data);
    setPlaylists((prev) => [created, ...prev]);
    setActiveView({ type: 'playlist', playlistId: created.id });
  };

  const handleDeletePlaylist = async (playlist: Playlist) => {
    await deletePlaylist(playlist.id);
    setPlaylists((prev) => prev.filter((p) => p.id !== playlist.id));
    setActiveView({ type: 'playlists' });
    player.setPlaybackNotice(`Deleted playlist "${playlist.name}".`);
  };

  const handleToggleTrackInPlaylist = async (playlistId: string, trackId: string) => {
    const pl = playlists.find((p) => p.id === playlistId);
    if (!pl) return;
    const exists = pl.trackIds.includes(trackId);
    const nextIds = exists
      ? pl.trackIds.filter((id) => id !== trackId)
      : [...pl.trackIds, trackId];
    const updated = await updatePlaylist({ ...pl, trackIds: nextIds });
    setPlaylists((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleCreatePlaylistWithTrack = async (name: string, trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    const created = await createPlaylist({
      name,
      description: '',
      coverUrl: track?.coverUrl || CURATED_COVERS[0].url,
      trackIds: [trackId],
    });
    setPlaylists((prev) => [created, ...prev]);
    player.setPlaybackNotice(`Created playlist "${created.name}".`);
  };

  const handleMovePlaylistTrack = async (
    playlist: Playlist,
    fromIndex: number,
    toIndex: number
  ) => {
    if (toIndex < 0 || toIndex >= playlist.trackIds.length) return;
    const nextIds = [...playlist.trackIds];
    const [moved] = nextIds.splice(fromIndex, 1);
    nextIds.splice(toIndex, 0, moved);
    const updated = await updatePlaylist({ ...playlist, trackIds: nextIds });
    setPlaylists((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleImportFiles = async (files: File[], targetPlaylistId?: string) => {
    const imported = await importLocalAudioFiles(files);
    if (imported.length === 0) return [];

    setTracks((prev) => [...imported, ...prev]);

    if (targetPlaylistId) {
      const pl = playlists.find((p) => p.id === targetPlaylistId);
      if (pl) {
        const nextIds = [...pl.trackIds, ...imported.map((t) => t.id)];
        const updated = await updatePlaylist({ ...pl, trackIds: nextIds });
        setPlaylists((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      }
    }

    return imported;
  };

  const addSongsModalPlaylist = playlists.find((p) => p.id === addSongsPlaylistId) ?? null;

  const viewHeading =
    activeView.type === 'offline'
      ? 'Offline Saved'
      : activeView.type === 'favorites'
      ? 'Favorites'
      : 'All Songs';

  const viewTotalDuration = displayedTracks.reduce((sum, t) => sum + t.duration, 0);
  const viewTotalBytes = displayedTracks.reduce((sum, t) => sum + t.sizeBytes, 0);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0B0D11] text-[#F3F4F6]">
      <div className="flex-1 flex min-h-0">
        {/* Desktop Sidebar */}
        <Sidebar
          activeView={activeView}
          onSelectView={setActiveView}
          playlists={playlists}
          totalTracksCount={tracks.length}
          offlineTracksCount={offlineTracks.length}
          favoritesCount={favoriteTracks.length}
          offlineBytes={offlineBytes}
          isOfflineMode={isOfflineMode}
          isOnline={isOnline}
          onToggleOfflineMode={() => setIsOfflineMode((m) => !m)}
          onOpenCreatePlaylist={() => {
            setEditingPlaylist(null);
            setIsCreatePlaylistOpen(true);
          }}
        />

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* 3-Zone Top Bar */}
          <header className="px-4 sm:px-8 py-3.5 border-b border-white/[0.07] bg-[#0B0D11]/90 backdrop-blur-md flex items-center justify-between gap-4 sm:gap-8 shrink-0">
            {/* Mobile Wordmark / Desktop Quick Filters */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="lg:hidden font-display text-xl font-bold tracking-tight text-white whitespace-nowrap">
                Tarang
              </span>
              <div className="hidden lg:flex items-center gap-1 p-1 rounded-lg bg-[#13161E] border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setActiveView({ type: 'all' })}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    activeView.type === 'all'
                      ? 'bg-white/[0.1] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Songs
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView({ type: 'offline' })}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    activeView.type === 'offline'
                      ? 'bg-white/[0.1] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Offline Ready
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView({ type: 'playlists' })}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    activeView.type === 'playlists' || activeView.type === 'playlist'
                      ? 'bg-white/[0.1] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Playlists
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search songs, artists, albums..."
                aria-label="Search library"
                className="w-full rounded-lg bg-[#13161E] border border-white/[0.08] pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/70"
              />
            </div>

            {/* Primary Action */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsOfflineMode((m) => !m)}
                aria-label="Toggle offline mode"
                className={`lg:hidden min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border transition-colors ${
                  isOfflineActive
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    : 'bg-white/[0.04] border-white/10 text-slate-300'
                }`}
              >
                {isOfflineActive ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
              </button>

              <div className="lg:hidden">
                <PWAInstallButton compact />
              </div>

              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-[#0B0D11] text-sm font-semibold hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Import Songs</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </header>

          {/* Connectivity / Offline Notice Strip */}
          {(!isOnline || isOfflineMode) && (
            <div className="px-4 sm:px-8 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between gap-3 text-xs text-amber-200 shrink-0">
              <div className="flex items-center gap-2">
                <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  {!isOnline
                    ? 'You are offline — playing cached tracks from local device storage.'
                    : 'Offline Mode active — only tracks saved offline can be played.'}
                </span>
              </div>
              {isOnline && isOfflineMode && (
                <button
                  type="button"
                  onClick={() => setIsOfflineMode(false)}
                  className="font-semibold text-amber-300 hover:text-amber-200 whitespace-nowrap"
                >
                  Go Online
                </button>
              )}
            </div>
          )}

          {/* Playback Toast Notice */}
          {player.playbackNotice && (
            <div className="px-4 sm:px-8 py-2 bg-[#161B26] border-b border-white/10 flex items-center justify-between gap-3 text-xs text-slate-200 shrink-0">
              <span>{player.playbackNotice}</span>
              <button
                type="button"
                onClick={() => player.setPlaybackNotice(null)}
                className="text-slate-400 hover:text-white font-medium"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Main Scrollable Viewport */}
          <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-8">
            <div className="max-w-5xl mx-auto">
              {loading ? (
                <div className="space-y-4">
                  <div className="h-9 w-48 rounded-lg bg-white/[0.06] animate-pulse" />
                  <div className="h-4 w-72 rounded bg-white/[0.04] animate-pulse" />
                  <div className="pt-4 space-y-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div
                        key={n}
                        className="h-14 rounded-lg bg-white/[0.03] border border-white/[0.04] animate-pulse"
                      />
                    ))}
                  </div>
                </div>
              ) : activeView.type === 'playlists' ? (
                <PlaylistsOverview
                  playlists={playlists}
                  tracks={tracks}
                  onOpenPlaylist={(playlistId) => setActiveView({ type: 'playlist', playlistId })}
                  onPlayPlaylist={(pl) => {
                    const plTracks = pl.trackIds
                      .map((id) => tracks.find((t) => t.id === id))
                      .filter((t): t is Track => Boolean(t));
                    if (plTracks[0]) {
                      void player.loadAndPlayTrack(plTracks[0], plTracks);
                    }
                  }}
                  onCreatePlaylist={() => {
                    setEditingPlaylist(null);
                    setIsCreatePlaylistOpen(true);
                  }}
                />
              ) : activeView.type === 'playlist' && activePlaylist ? (
                <PlaylistView
                  playlist={activePlaylist}
                  playlistTracks={activePlaylistTracks}
                  currentTrackId={player.currentTrack?.id ?? null}
                  isPlaying={player.isPlaying}
                  isOfflineActive={isOfflineActive}
                  onBack={() => setActiveView({ type: 'playlists' })}
                  onPlayPlaylist={() => {
                    if (activePlaylistTracks[0]) {
                      void player.loadAndPlayTrack(activePlaylistTracks[0], activePlaylistTracks);
                    }
                  }}
                  onPlayTrack={(track) =>
                    void player.loadAndPlayTrack(track, activePlaylistTracks)
                  }
                  onTogglePlayPause={() => void player.togglePlayPause()}
                  onSaveAllOffline={() => void handleSaveAllOfflineInView(activePlaylistTracks)}
                  onEditPlaylist={() => {
                    setEditingPlaylist(activePlaylist);
                    setIsCreatePlaylistOpen(true);
                  }}
                  onDeletePlaylist={() => void handleDeletePlaylist(activePlaylist)}
                  onOpenAddSongs={() => setAddSongsPlaylistId(activePlaylist.id)}
                  onToggleOffline={(track) => void handleToggleOfflineTrack(track)}
                  onToggleFavorite={(track) => void handleToggleFavorite(track)}
                  onAddToPlaylist={(track) => setAddToPlaylistTrack(track)}
                  onRemoveFromPlaylist={(trackId) =>
                    void handleToggleTrackInPlaylist(activePlaylist.id, trackId)
                  }
                  onMoveTrack={(from, to) =>
                    void handleMovePlaylistTrack(activePlaylist, from, to)
                  }
                />
              ) : (
                <div className="space-y-6">
                  {/* Library View Header */}
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="space-y-1.5">
                      <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white [text-wrap:balance]">
                        {viewHeading}
                      </h1>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
                        <span>
                          {displayedTracks.length}{' '}
                          {displayedTracks.length === 1 ? 'track' : 'tracks'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDuration(viewTotalDuration)} total</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatBytes(viewTotalBytes)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-300">
                          {offlineTracks.length} offline ready
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {displayedTracks.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            void player.loadAndPlayTrack(displayedTracks[0], displayedTracks)
                          }
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-[#0B0D11] text-sm font-semibold hover:bg-amber-400 transition-colors whitespace-nowrap min-h-[40px]"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>Play All</span>
                        </button>
                      )}

                      {displayedTracks.some((t) => !t.offlineSaved) && (
                        <button
                          type="button"
                          onClick={() => void handleSaveAllOfflineInView(displayedTracks)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] text-sm font-medium transition-colors whitespace-nowrap min-h-[40px]"
                        >
                          <CloudDownload className="w-4 h-4 text-amber-400" />
                          <span>Save All Offline</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setEditingPlaylist(null);
                          setIsCreatePlaylistOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] text-sm font-medium transition-colors whitespace-nowrap min-h-[40px]"
                      >
                        <Plus className="w-4 h-4" />
                        <span>New Playlist</span>
                      </button>
                    </div>
                  </div>

                  {/* Mobile Filter Strip */}
                  <div className="flex lg:hidden items-center gap-2 overflow-x-auto pb-1">
                    <button
                      type="button"
                      onClick={() => setActiveView({ type: 'all' })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                        activeView.type === 'all'
                          ? 'bg-amber-500 text-[#0B0D11]'
                          : 'bg-[#13161E] text-slate-300 border border-white/[0.08]'
                      }`}
                    >
                      All ({tracks.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView({ type: 'offline' })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap inline-flex items-center gap-1.5 ${
                        activeView.type === 'offline'
                          ? 'bg-amber-500 text-[#0B0D11]'
                          : 'bg-[#13161E] text-slate-300 border border-white/[0.08]'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Offline ({offlineTracks.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView({ type: 'favorites' })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap inline-flex items-center gap-1.5 ${
                        activeView.type === 'favorites'
                          ? 'bg-amber-500 text-[#0B0D11]'
                          : 'bg-[#13161E] text-slate-300 border border-white/[0.08]'
                      }`}
                    >
                      <Heart className="w-3.5 h-3.5" />
                      Favorites ({favoriteTracks.length})
                    </button>
                  </div>

                  {/* Track Table or Empty State */}
                  {displayedTracks.length === 0 ? (
                    <div className="py-16 px-6 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
                      <p className="text-base font-semibold text-white">
                        {searchQuery
                          ? 'No matching songs found'
                          : activeView.type === 'offline'
                          ? 'No songs saved offline yet'
                          : activeView.type === 'favorites'
                          ? 'No favorite songs yet'
                          : 'Your music library is empty'}
                      </p>
                      <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                        {searchQuery
                          ? 'Try searching for a different title, artist, or album.'
                          : 'Import audio files from your device or save tracks offline for anytime listening.'}
                      </p>
                      {!searchQuery && (
                        <button
                          type="button"
                          onClick={() => setIsImportOpen(true)}
                          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 text-[#0B0D11] text-sm font-semibold hover:bg-amber-400 transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Import Local Songs</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <TrackList
                      tracks={displayedTracks}
                      currentTrackId={player.currentTrack?.id ?? null}
                      isPlaying={player.isPlaying}
                      isOfflineActive={isOfflineActive}
                      onPlayTrack={(track) =>
                        void player.loadAndPlayTrack(track, displayedTracks)
                      }
                      onTogglePlayPause={() => void player.togglePlayPause()}
                      onToggleOffline={(track) => void handleToggleOfflineTrack(track)}
                      onToggleFavorite={(track) => void handleToggleFavorite(track)}
                      onAddToPlaylist={(track) => setAddToPlaylistTrack(track)}
                      onDeleteTrack={(track) => void handleDeleteLocalTrack(track)}
                    />
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Persistent Player Bar */}
      <PlayerBar
        currentTrack={player.currentTrack}
        isPlaying={player.isPlaying}
        isLoadingAudio={player.isLoadingAudio}
        currentTime={player.currentTime}
        duration={player.duration}
        volume={player.volume}
        isMuted={player.isMuted}
        shuffle={player.shuffle}
        repeatMode={player.repeatMode}
        onTogglePlayPause={() => void player.togglePlayPause()}
        onNext={() => void player.playNext(false)}
        onPrevious={() => void player.playPrevious()}
        onSeek={(time) => player.seekTo(time)}
        onVolumeChange={(v) => player.changeVolume(v)}
        onToggleMute={() => player.toggleMute()}
        onToggleShuffle={() => player.toggleShuffle()}
        onCycleRepeat={() => player.cycleRepeatMode()}
        onOpenNowPlaying={() => setIsNowPlayingOpen(true)}
      />

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeView={activeView}
        onSelectView={setActiveView}
        onOpenImport={() => setIsImportOpen(true)}
      />

      {/* Modals & Sheets */}
      <NowPlayingSheet
        isOpen={isNowPlayingOpen}
        onClose={() => setIsNowPlayingOpen(false)}
        currentTrack={player.currentTrack}
        queueTracks={player.queueTracks}
        isPlaying={player.isPlaying}
        currentTime={player.currentTime}
        duration={player.duration}
        shuffle={player.shuffle}
        repeatMode={player.repeatMode}
        analyserRef={player.analyserRef}
        onTogglePlayPause={() => void player.togglePlayPause()}
        onNext={() => void player.playNext(false)}
        onPrevious={() => void player.playPrevious()}
        onSeek={(time) => player.seekTo(time)}
        onToggleShuffle={() => player.toggleShuffle()}
        onCycleRepeat={() => player.cycleRepeatMode()}
        onPlayTrack={(track) => void player.loadAndPlayTrack(track)}
      />

      <CreatePlaylistModal
        isOpen={isCreatePlaylistOpen}
        editingPlaylist={editingPlaylist}
        onClose={() => {
          setIsCreatePlaylistOpen(false);
          setEditingPlaylist(null);
        }}
        onSubmit={handleCreateOrEditPlaylist}
      />

      <AddToPlaylistModal
        track={addToPlaylistTrack}
        playlists={playlists}
        onClose={() => setAddToPlaylistTrack(null)}
        onToggleTrackInPlaylist={handleToggleTrackInPlaylist}
        onCreatePlaylistWithTrack={handleCreatePlaylistWithTrack}
      />

      <AddSongsToPlaylistModal
        playlist={addSongsModalPlaylist}
        allTracks={tracks}
        onClose={() => setAddSongsPlaylistId(null)}
        onToggleTrack={handleToggleTrackInPlaylist}
      />

      <ImportSongsModal
        isOpen={isImportOpen}
        playlists={playlists}
        onClose={() => setIsImportOpen(false)}
        onImportFiles={handleImportFiles}
      />
    </div>
  );
}
