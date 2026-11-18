import { CURATED_COVERS, type Playlist, type Track } from '../types/music';
import { synthesizeTrackAudio } from './audioSynth';

const DB_NAME = 'tarang-offline-music-v1';
const DB_VERSION = 1;
const STORE_TRACKS = 'tracks';
const STORE_PLAYLISTS = 'playlists';
const STORE_BLOBS = 'audioBlobs';
const CACHE_NAME = 'tarang-offline-audio-v1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
        db.createObjectStore(STORE_PLAYLISTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txPromise<T>(tx: IDBTransaction, request?: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    let result: T;
    if (request) {
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => reject(request.error);
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}

async function putInCacheStorage(id: string, blob: Blob): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(
      `/offline-audio/${id}`,
      new Response(blob, {
        headers: {
          'Content-Type': blob.type || 'audio/mpeg',
          'Content-Length': String(blob.size),
        },
      })
    );
  } catch {
    // Graceful fallback: IndexedDB still holds the blob
  }
}

async function removeFromCacheStorage(id: string): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(`/offline-audio/${id}`);
  } catch {
    // Ignore
  }
}

async function getFromCacheStorage(id: string): Promise<Blob | null> {
  if (typeof caches === 'undefined') return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(`/offline-audio/${id}`);
    if (res) return await res.blob();
  } catch {
    // Ignore
  }
  return null;
}

const SEED_TRACKS: Array<Omit<Track, 'sizeBytes' | 'duration' | 'addedAt'>> = [
  {
    id: 'curated-bhairav-dawn',
    title: 'Raag Bhairav Dawn',
    artist: 'Aarav Sen',
    album: 'Midnight Raga Sessions',
    coverUrl: CURATED_COVERS[0].url,
    mimeType: 'audio/wav',
    source: 'curated',
    offlineSaved: true,
    favorite: true,
    synthPreset: 'raga_dawn',
  },
  {
    id: 'curated-monsoon-lofi',
    title: 'Monsoon Lo-Fi',
    artist: 'Kiran & Tape',
    album: 'Glasshouse Rain',
    coverUrl: CURATED_COVERS[1].url,
    mimeType: 'audio/wav',
    source: 'curated',
    offlineSaved: true,
    favorite: true,
    synthPreset: 'monsoon_lofi',
  },
  {
    id: 'curated-chai-strings',
    title: 'Chai & Strings',
    artist: 'Meera Deshmukh',
    album: 'Acoustic Chai',
    coverUrl: CURATED_COVERS[2].url,
    mimeType: 'audio/wav',
    source: 'curated',
    offlineSaved: true,
    favorite: false,
    synthPreset: 'acoustic_chai',
  },
  {
    id: 'curated-nh48-midnight',
    title: 'NH-48 Midnight',
    artist: 'Vihaan Rao',
    album: 'Night Drive',
    coverUrl: CURATED_COVERS[3].url,
    mimeType: 'audio/wav',
    source: 'curated',
    offlineSaved: false,
    favorite: false,
    synthPreset: 'night_drive',
  },
  {
    id: 'curated-amber-vinyl',
    title: 'Amber Vinyl',
    artist: 'Kiran & Tape',
    album: 'Glasshouse Rain',
    coverUrl: CURATED_COVERS[1].url,
    mimeType: 'audio/wav',
    source: 'curated',
    offlineSaved: true,
    favorite: false,
    synthPreset: 'amber_vinyl',
  },
  {
    id: 'curated-sitar-horizon',
    title: 'Yaman Evening',
    artist: 'Aarav Sen',
    album: 'Midnight Raga Sessions',
    coverUrl: CURATED_COVERS[0].url,
    mimeType: 'audio/wav',
    source: 'curated',
    offlineSaved: false,
    favorite: true,
    synthPreset: 'sitar_horizon',
  },
];

export async function initLibraryIfEmpty(): Promise<void> {
  const db = await openDb();
  const existingTracks = await new Promise<Track[]>((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readonly');
    const req = tx.objectStore(STORE_TRACKS).getAll();
    req.onsuccess = () => resolve(req.result as Track[]);
    req.onerror = () => reject(req.error);
  });

  if (existingTracks.length > 0) {
    db.close();
    return;
  }

  const now = Date.now();
  const tracksWithBlobs: Array<{ track: Track; blob: Blob }> = SEED_TRACKS.map((item, index) => {
    const synth = synthesizeTrackAudio(item.synthPreset ?? 'raga_dawn');
    return {
      track: {
        ...item,
        duration: synth.duration,
        sizeBytes: synth.blob.size,
        addedAt: now - (SEED_TRACKS.length - index) * 60_000,
      },
      blob: synth.blob,
    };
  });

  const tx = db.transaction([STORE_TRACKS, STORE_BLOBS, STORE_PLAYLISTS], 'readwrite');
  const trackStore = tx.objectStore(STORE_TRACKS);
  const blobStore = tx.objectStore(STORE_BLOBS);
  const playlistStore = tx.objectStore(STORE_PLAYLISTS);

  for (const { track, blob } of tracksWithBlobs) {
    trackStore.put(track);
    if (track.offlineSaved) {
      blobStore.put({ id: track.id, blob });
    }
  }

  const starterPlaylists: Playlist[] = [
    {
      id: 'pl-late-night-focus',
      name: 'Late Night Focus',
      description: 'Warm instrumental raga and mellow lo-fi sessions cached for offline listening.',
      coverUrl: CURATED_COVERS[0].url,
      trackIds: ['curated-bhairav-dawn', 'curated-monsoon-lofi', 'curated-amber-vinyl'],
      createdAt: now - 120_000,
      updatedAt: now - 120_000,
    },
    {
      id: 'pl-highway-chill',
      name: 'Highway & Acoustic',
      description: 'Acoustic guitar and midnight highway drives for long journeys without network.',
      coverUrl: CURATED_COVERS[2].url,
      trackIds: ['curated-chai-strings', 'curated-nh48-midnight', 'curated-sitar-horizon'],
      createdAt: now - 60_000,
      updatedAt: now - 60_000,
    },
  ];

  for (const pl of starterPlaylists) {
    playlistStore.put(pl);
  }

  await txPromise(tx);
  db.close();

  // Mirror offline-saved curated tracks into Cache Storage too
  for (const { track, blob } of tracksWithBlobs) {
    if (track.offlineSaved) {
      await putInCacheStorage(track.id, blob);
    }
  }
}

export async function getAllTracks(): Promise<Track[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_TRACKS, 'readonly');
  const tracks = await txPromise<Track[]>(tx, tx.objectStore(STORE_TRACKS).getAll());
  db.close();
  return tracks.sort((a, b) => b.addedAt - a.addedAt);
}

export async function getAllPlaylists(): Promise<Playlist[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_PLAYLISTS, 'readonly');
  const playlists = await txPromise<Playlist[]>(tx, tx.objectStore(STORE_PLAYLISTS).getAll());
  db.close();
  return playlists.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getAudioBlob(track: Track): Promise<Blob | null> {
  const db = await openDb();
  const tx = db.transaction(STORE_BLOBS, 'readonly');
  const record = await txPromise<{ id: string; blob: Blob } | undefined>(
    tx,
    tx.objectStore(STORE_BLOBS).get(track.id)
  );
  db.close();

  if (record?.blob) return record.blob;

  const cached = await getFromCacheStorage(track.id);
  if (cached) return cached;

  // For curated tracks not yet saved offline, synthesize when online
  if (track.source === 'curated' && track.synthPreset && navigator.onLine) {
    return synthesizeTrackAudio(track.synthPreset).blob;
  }

  return null;
}

export async function setTrackOfflineSaved(track: Track, saved: boolean): Promise<Track> {
  const db = await openDb();

  let blobToStore: Blob | null = null;
  if (saved) {
    const existing = await new Promise<{ id: string; blob: Blob } | undefined>((resolve, reject) => {
      const rtx = db.transaction(STORE_BLOBS, 'readonly');
      const req = rtx.objectStore(STORE_BLOBS).get(track.id);
      req.onsuccess = () => resolve(req.result as { id: string; blob: Blob } | undefined);
      req.onerror = () => reject(req.error);
    });
    if (existing?.blob) {
      blobToStore = existing.blob;
    } else if (track.synthPreset) {
      blobToStore = synthesizeTrackAudio(track.synthPreset).blob;
    }
  }

  const updated: Track = { ...track, offlineSaved: saved };
  const tx = db.transaction([STORE_TRACKS, STORE_BLOBS], 'readwrite');
  tx.objectStore(STORE_TRACKS).put(updated);

  if (saved && blobToStore) {
    tx.objectStore(STORE_BLOBS).put({ id: track.id, blob: blobToStore });
  } else if (!saved && track.source === 'curated') {
    // Only remove blob for curated tracks (keep user local uploaded files intact unless deleted)
    tx.objectStore(STORE_BLOBS).delete(track.id);
  }

  await txPromise(tx);
  db.close();

  if (saved && blobToStore) {
    await putInCacheStorage(track.id, blobToStore);
  } else if (!saved && track.source === 'curated') {
    await removeFromCacheStorage(track.id);
  }

  return updated;
}

export async function toggleTrackFavorite(track: Track): Promise<Track> {
  const updated: Track = { ...track, favorite: !track.favorite };
  const db = await openDb();
  const tx = db.transaction(STORE_TRACKS, 'readwrite');
  tx.objectStore(STORE_TRACKS).put(updated);
  await txPromise(tx);
  db.close();
  return updated;
}

export async function deleteTrackFromLibrary(trackId: string): Promise<void> {
  const db = await openDb();
  const playlists = await new Promise<Playlist[]>((resolve, reject) => {
    const rtx = db.transaction(STORE_PLAYLISTS, 'readonly');
    const req = rtx.objectStore(STORE_PLAYLISTS).getAll();
    req.onsuccess = () => resolve(req.result as Playlist[]);
    req.onerror = () => reject(req.error);
  });

  const tx = db.transaction([STORE_TRACKS, STORE_BLOBS, STORE_PLAYLISTS], 'readwrite');
  tx.objectStore(STORE_TRACKS).delete(trackId);
  tx.objectStore(STORE_BLOBS).delete(trackId);

  const plStore = tx.objectStore(STORE_PLAYLISTS);
  for (const pl of playlists) {
    if (pl.trackIds.includes(trackId)) {
      plStore.put({
        ...pl,
        trackIds: pl.trackIds.filter((id) => id !== trackId),
        updatedAt: Date.now(),
      });
    }
  }

  await txPromise(tx);
  db.close();
  await removeFromCacheStorage(trackId);
}

function parseFilenameMetadata(filename: string): { title: string; artist: string } {
  const clean = filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ').trim();
  const parts = clean.split(/\s+[-–]\s+/);
  if (parts.length >= 2) {
    return {
      artist: parts[0].trim() || 'Local Artist',
      title: parts.slice(1).join(' - ').trim() || clean,
    };
  }
  return {
    title: clean || 'Untitled Track',
    artist: 'Imported Audio',
  };
}

function extractAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.removeAttribute('src');
    };
    audio.onloadedmetadata = () => {
      const dur = Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0;
      cleanup();
      resolve(dur);
    };
    audio.onerror = () => {
      cleanup();
      resolve(0);
    };
    audio.src = url;
  });
}

export async function importLocalAudioFiles(files: File[]): Promise<Track[]> {
  const imported: Track[] = [];
  const db = await openDb();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|ogg|flac|aac|opus|webm)$/i.test(file.name)) {
      continue;
    }

    const duration = await extractAudioDuration(file);
    const { title, artist } = parseFilenameMetadata(file.name);
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const coverIndex = (title.length + i) % CURATED_COVERS.length;

    const track: Track = {
      id,
      title,
      artist,
      album: 'Local Device Library',
      duration,
      sizeBytes: file.size,
      coverUrl: CURATED_COVERS[coverIndex].url,
      mimeType: file.type || 'audio/mpeg',
      source: 'local',
      offlineSaved: true,
      favorite: false,
      addedAt: Date.now() + i,
    };

    const tx = db.transaction([STORE_TRACKS, STORE_BLOBS], 'readwrite');
    tx.objectStore(STORE_TRACKS).put(track);
    tx.objectStore(STORE_BLOBS).put({ id: track.id, blob: file });
    await txPromise(tx);
    await putInCacheStorage(track.id, file);
    imported.push(track);
  }

  db.close();
  return imported;
}

export async function createPlaylist(input: {
  name: string;
  description: string;
  coverUrl: string;
  trackIds?: string[];
}): Promise<Playlist> {
  const now = Date.now();
  const playlist: Playlist = {
    id: `pl-${now}-${Math.random().toString(36).slice(2, 7)}`,
    name: input.name.trim(),
    description: input.description.trim(),
    coverUrl: input.coverUrl,
    trackIds: input.trackIds ?? [],
    createdAt: now,
    updatedAt: now,
  };

  const db = await openDb();
  const tx = db.transaction(STORE_PLAYLISTS, 'readwrite');
  tx.objectStore(STORE_PLAYLISTS).put(playlist);
  await txPromise(tx);
  db.close();
  return playlist;
}

export async function updatePlaylist(playlist: Playlist): Promise<Playlist> {
  const updated: Playlist = { ...playlist, updatedAt: Date.now() };
  const db = await openDb();
  const tx = db.transaction(STORE_PLAYLISTS, 'readwrite');
  tx.objectStore(STORE_PLAYLISTS).put(updated);
  await txPromise(tx);
  db.close();
  return updated;
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_PLAYLISTS, 'readwrite');
  tx.objectStore(STORE_PLAYLISTS).delete(playlistId);
  await txPromise(tx);
  db.close();
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${mb.toFixed(1)} MB`;
}
