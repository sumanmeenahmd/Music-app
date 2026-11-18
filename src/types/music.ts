export type RepeatMode = 'off' | 'all' | 'one';

export type SynthPreset =
  | 'raga_dawn'
  | 'monsoon_lofi'
  | 'acoustic_chai'
  | 'night_drive'
  | 'amber_vinyl'
  | 'sitar_horizon';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  sizeBytes: number;
  coverUrl: string;
  mimeType: string;
  source: 'curated' | 'local';
  offlineSaved: boolean;
  favorite: boolean;
  addedAt: number;
  synthPreset?: SynthPreset;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
}

export type ActiveView =
  | { type: 'all' }
  | { type: 'offline' }
  | { type: 'favorites' }
  | { type: 'playlists' }
  | { type: 'playlist'; playlistId: string };

export const CURATED_COVERS = [
  {
    id: 'midnight-raga',
    label: 'Amber Glass',
    url: '/src/assets/images/cover_midnight_raga_1794979881099.jpg',
  },
  {
    id: 'monsoon-lofi',
    label: 'Monsoon Dusk',
    url: '/src/assets/images/cover_monsoon_lofi_1794979883405.jpg',
  },
  {
    id: 'acoustic-chai',
    label: 'Walnut Strings',
    url: '/src/assets/images/cover_acoustic_chai_1794979885073.jpg',
  },
  {
    id: 'night-drive',
    label: 'Highway Trails',
    url: '/src/assets/images/cover_night_drive_1794979882677.jpg',
  },
] as const;
