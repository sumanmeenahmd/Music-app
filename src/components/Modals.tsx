import React, { useEffect, useRef, useState } from 'react';
import { Check, FolderPlus, Music, Plus, Upload, X } from 'lucide-react';
import { formatBytes, formatDuration } from '../lib/offlineDb';
import { CURATED_COVERS, type Playlist, type Track } from '../types/music';
import { CoverArt } from './CoverArt';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  editingPlaylist?: Playlist | null;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; coverUrl: string }) => Promise<void>;
}

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  isOpen,
  editingPlaylist,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState<string>(CURATED_COVERS[0].url);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(editingPlaylist?.name ?? '');
      setDescription(editingPlaylist?.description ?? '');
      setCoverUrl(editingPlaylist?.coverUrl ?? CURATED_COVERS[0].url);
    }
  }, [editingPlaylist, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), description: description.trim(), coverUrl });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#141821] border border-white/10 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.07] flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-white">
            {editingPlaylist ? 'Edit Playlist' : 'Create Playlist'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="pl-name" className="block text-xs font-medium text-slate-300">
              Playlist Name
            </label>
            <input
              id="pl-name"
              type="text"
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Monsoon Evening Mix"
              className="w-full rounded-lg bg-[#0B0D11] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pl-desc" className="block text-xs font-medium text-slate-300">
              Description (Optional)
            </label>
            <textarea
              id="pl-desc"
              rows={2}
              maxLength={160}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mood, occasion, or notes..."
              className="w-full rounded-lg bg-[#0B0D11] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-300">Cover Artwork</span>
            <div className="grid grid-cols-4 gap-2.5">
              {CURATED_COVERS.map((cover) => {
                const selected = coverUrl === cover.url;
                return (
                  <button
                    key={cover.id}
                    type="button"
                    onClick={() => setCoverUrl(cover.url)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-square ${
                      selected
                        ? 'border-amber-500 scale-[1.02]'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <CoverArt src={cover.url} alt={cover.label} className="w-full h-full" />
                    {selected && (
                      <span className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white drop-shadow" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-white/10 text-sm font-medium text-slate-300 hover:bg-white/[0.05] min-h-[42px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="px-5 py-2.5 rounded-lg bg-amber-500 text-[#0B0D11] text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-40 min-h-[42px]"
            >
              {saving ? 'Saving...' : editingPlaylist ? 'Save Changes' : 'Create Playlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface AddToPlaylistModalProps {
  track: Track | null;
  playlists: Playlist[];
  onClose: () => void;
  onToggleTrackInPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  onCreatePlaylistWithTrack: (name: string, trackId: string) => Promise<void>;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  track,
  playlists,
  onClose,
  onToggleTrackInPlaylist,
  onCreatePlaylistWithTrack,
}) => {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  if (!track) return null;

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      await onCreatePlaylistWithTrack(newName.trim(), track.id);
      setNewName('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#141821] border border-white/10 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.07] flex items-center justify-between">
          <div className="min-w-0 pr-4">
            <h2 className="font-display text-base font-semibold text-white">Add to Playlist</h2>
            <p className="text-xs text-slate-400 truncate mt-0.5">{track.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="max-h-60 overflow-y-auto divide-y divide-white/[0.06]">
            {playlists.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                No playlists yet. Create one below.
              </p>
            ) : (
              playlists.map((pl) => {
                const included = pl.trackIds.includes(track.id);
                return (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => void onToggleTrackInPlaylist(pl.id, track.id)}
                    className="w-full flex items-center justify-between gap-3 py-3 px-2 hover:bg-white/[0.04] rounded-lg transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CoverArt
                        src={pl.coverUrl}
                        alt={pl.name}
                        size="sm"
                        className="w-10 h-10 rounded-lg border border-white/10"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{pl.name}</p>
                        <p className="text-xs text-slate-400 font-mono tabular-nums">
                          {pl.trackIds.length} {pl.trackIds.length === 1 ? 'track' : 'tracks'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        included
                          ? 'bg-amber-500 border-amber-500 text-[#0B0D11]'
                          : 'border-white/20 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <form onSubmit={(e) => void handleQuickCreate(e)} className="pt-3 border-t border-white/[0.07] flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New playlist name..."
              maxLength={60}
              className="flex-1 rounded-lg bg-[#0B0D11] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={!newName.trim() || creating}
              className="px-3.5 py-2 rounded-lg bg-amber-500 text-[#0B0D11] text-xs font-semibold hover:bg-amber-400 disabled:opacity-40 whitespace-nowrap inline-flex items-center gap-1.5"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Create</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

interface AddSongsToPlaylistModalProps {
  playlist: Playlist | null;
  allTracks: Track[];
  onClose: () => void;
  onToggleTrack: (playlistId: string, trackId: string) => Promise<void>;
}

export const AddSongsToPlaylistModal: React.FC<AddSongsToPlaylistModalProps> = ({
  playlist,
  allTracks,
  onClose,
  onToggleTrack,
}) => {
  const [query, setQuery] = useState('');

  if (!playlist) return null;

  const filtered = allTracks.filter((t) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.album.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#141821] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[82vh]">
        <div className="px-6 py-4 border-b border-white/[0.07] flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              Add Songs to {playlist.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select tracks from your library to include in this playlist.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-4 pb-2 shrink-0">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter songs by title or artist..."
            className="w-full rounded-lg bg-[#0B0D11] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4 divide-y divide-white/[0.06]">
          {filtered.map((track) => {
            const added = playlist.trackIds.includes(track.id);
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => void onToggleTrack(playlist.id, track.id)}
                className="w-full flex items-center justify-between gap-3 py-3 px-2 hover:bg-white/[0.04] rounded-lg text-left transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CoverArt
                    src={track.coverUrl}
                    alt={track.title}
                    size="sm"
                    className="w-10 h-10 rounded-lg border border-white/10"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{track.title}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {track.artist} · {formatDuration(track.duration)}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 inline-flex items-center gap-1.5 ${
                    added
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-white/[0.06] text-slate-200 hover:bg-white/[0.12]'
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Added</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-6 py-3.5 border-t border-white/[0.07] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-amber-500 text-[#0B0D11] text-sm font-semibold hover:bg-amber-400"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

interface ImportSongsModalProps {
  isOpen: boolean;
  playlists: Playlist[];
  onClose: () => void;
  onImportFiles: (files: File[], targetPlaylistId?: string) => Promise<Track[]>;
}

export const ImportSongsModal: React.FC<ImportSongsModalProps> = ({
  isOpen,
  playlists,
  onClose,
  onImportFiles,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [targetPlaylistId, setTargetPlaylistId] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const processFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setImporting(true);
    setStatusMessage(null);
    try {
      const files = Array.from(fileList);
      const imported = await onImportFiles(files, targetPlaylistId || undefined);
      if (imported.length > 0) {
        const totalSize = imported.reduce((s, t) => s + t.sizeBytes, 0);
        setStatusMessage(
          `Imported ${imported.length} ${imported.length === 1 ? 'song' : 'songs'} (${formatBytes(totalSize)}) into offline storage.`
        );
        window.setTimeout(() => {
          onClose();
          setStatusMessage(null);
        }, 900);
      } else {
        setStatusMessage('No supported audio files found. Try MP3, WAV, M4A, OGG, or FLAC.');
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#141821] border border-white/10 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.07] flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Import Local Songs</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Audio files are saved directly in your browser&apos;s offline storage.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void processFiles(e.dataTransfer.files);
            }}
            className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragging
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-white/15 bg-[#0B0D11]/60 hover:border-white/25'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto mb-3">
              {importing ? <Music className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
            </div>
            <p className="text-sm font-medium text-white">
              {importing ? 'Saving songs to offline vault...' : 'Drop audio files here'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports MP3, WAV, M4A, OGG, FLAC, and AAC
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac"
              multiple
              className="hidden"
              onChange={(e) => void processFiles(e.target.files)}
            />
            <button
              type="button"
              disabled={importing}
              onClick={() => inputRef.current?.click()}
              className="mt-4 px-5 py-2.5 rounded-lg bg-amber-500 text-[#0B0D11] text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              Browse Device Files
            </button>
          </div>

          {playlists.length > 0 && (
            <div className="space-y-1.5">
              <label htmlFor="import-playlist" className="block text-xs font-medium text-slate-300">
                Also add imported songs to playlist (optional)
              </label>
              <select
                id="import-playlist"
                value={targetPlaylistId}
                onChange={(e) => setTargetPlaylistId(e.target.value)}
                className="w-full rounded-lg bg-[#0B0D11] border border-white/10 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">Library only</option>
                {playlists.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {statusMessage && (
            <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3.5 py-2.5">
              {statusMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
