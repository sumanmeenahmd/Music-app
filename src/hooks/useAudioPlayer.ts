import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioBlob } from '../lib/offlineDb';
import type { RepeatMode, Track } from '../types/music';

interface UseAudioPlayerOptions {
  tracks: Track[];
  isOfflineActive: boolean;
}

export function useAudioPlayer({ tracks, isOfflineActive }: UseAudioPlayerOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  const [queueIds, setQueueIds] = useState<string[]>([]);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [playbackNotice, setPlaybackNotice] = useState<string | null>(null);

  const currentTrack = tracks.find((t) => t.id === currentTrackId) ?? null;

  const ensureAudioElement = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.volume = volume;
      audioRef.current = audio;
    }
    return audioRef.current;
  }, [volume]);

  const ensureAnalyser = useCallback((audio: HTMLAudioElement) => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.78;
        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        sourceNodeRef.current = source;
      }
      if (audioCtxRef.current.state === 'suspended') {
        void audioCtxRef.current.resume();
      }
    } catch {
      // Fallback: standard HTMLAudioElement playback without analyser
    }
  }, []);

  const loadAndPlayTrack = useCallback(
    async (track: Track, customQueue?: Track[]) => {
      setPlaybackNotice(null);

      if (customQueue) {
        setQueueIds(customQueue.map((t) => t.id));
      } else if (!queueIds.includes(track.id)) {
        setQueueIds(tracks.map((t) => t.id));
      }

      if (isOfflineActive && !track.offlineSaved) {
        setPlaybackNotice(`"${track.title}" is not saved offline. Save it while online or pick an offline track.`);
        return;
      }

      const audio = ensureAudioElement();
      setIsLoadingAudio(true);

      try {
        const blob = await getAudioBlob(track);
        if (!blob) {
          setPlaybackNotice(`Audio data for "${track.title}" is unavailable offline.`);
          setIsLoadingAudio(false);
          setIsPlaying(false);
          return;
        }

        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }

        const nextUrl = URL.createObjectURL(blob);
        objectUrlRef.current = nextUrl;

        audio.src = nextUrl;
        audio.currentTime = 0;
        setCurrentTrackId(track.id);
        setCurrentTime(0);
        setDuration(track.duration);

        ensureAnalyser(audio);
        await audio.play();
        setIsPlaying(true);

        if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: track.album,
            artwork: [{ src: track.coverUrl, sizes: '512x512', type: 'image/jpeg' }],
          });
        }
      } catch {
        setPlaybackNotice(`Could not start playback for "${track.title}". Tap Play again.`);
        setIsPlaying(false);
      } finally {
        setIsLoadingAudio(false);
      }
    },
    [ensureAnalyser, ensureAudioElement, isOfflineActive, queueIds, tracks]
  );

  const togglePlayPause = useCallback(async () => {
    const audio = ensureAudioElement();
    if (!currentTrack) {
      const candidate = isOfflineActive
        ? tracks.find((t) => t.offlineSaved)
        : tracks[0];
      if (candidate) {
        await loadAndPlayTrack(candidate, tracks);
      }
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      ensureAnalyser(audio);
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        await loadAndPlayTrack(currentTrack);
      }
    }
  }, [currentTrack, ensureAnalyser, ensureAudioElement, isOfflineActive, isPlaying, loadAndPlayTrack, tracks]);

  const getActiveQueueTracks = useCallback(() => {
    const resolved = queueIds
      .map((id) => tracks.find((t) => t.id === id))
      .filter((t): t is Track => Boolean(t));
    const base = resolved.length > 0 ? resolved : tracks;
    return isOfflineActive ? base.filter((t) => t.offlineSaved) : base;
  }, [isOfflineActive, queueIds, tracks]);

  const playNext = useCallback(
    async (autoEnded = false) => {
      const pool = getActiveQueueTracks();
      if (pool.length === 0) return;

      const audio = ensureAudioElement();
      if (autoEnded && repeatMode === 'one' && currentTrack) {
        audio.currentTime = 0;
        await audio.play();
        setIsPlaying(true);
        return;
      }

      const idx = currentTrack ? pool.findIndex((t) => t.id === currentTrack.id) : -1;
      let nextTrack: Track | undefined;

      if (shuffle && pool.length > 1) {
        const candidates = pool.filter((t) => t.id !== currentTrack?.id);
        nextTrack = candidates[Math.floor(Math.random() * candidates.length)];
      } else if (idx >= 0 && idx < pool.length - 1) {
        nextTrack = pool[idx + 1];
      } else if (repeatMode === 'all' || !autoEnded) {
        nextTrack = pool[0];
      }

      if (nextTrack) {
        await loadAndPlayTrack(nextTrack);
      } else {
        setIsPlaying(false);
      }
    },
    [currentTrack, ensureAudioElement, getActiveQueueTracks, loadAndPlayTrack, repeatMode, shuffle]
  );

  const playPrevious = useCallback(async () => {
    const audio = ensureAudioElement();
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const pool = getActiveQueueTracks();
    if (pool.length === 0) return;
    const idx = currentTrack ? pool.findIndex((t) => t.id === currentTrack.id) : 0;
    const prevIndex = idx <= 0 ? pool.length - 1 : idx - 1;
    await loadAndPlayTrack(pool[prevIndex]);
  }, [currentTrack, ensureAudioElement, getActiveQueueTracks, loadAndPlayTrack]);

  const seekTo = useCallback(
    (timeSec: number) => {
      const audio = ensureAudioElement();
      if (!Number.isFinite(timeSec)) return;
      audio.currentTime = Math.max(0, Math.min(timeSec, duration || audio.duration || 0));
      setCurrentTime(audio.currentTime);
    },
    [duration, ensureAudioElement]
  );

  const changeVolume = useCallback(
    (nextVol: number) => {
      const clamped = Math.max(0, Math.min(1, nextVol));
      setVolume(clamped);
      if (clamped > 0 && isMuted) setIsMuted(false);
      const audio = ensureAudioElement();
      audio.volume = clamped;
      audio.muted = clamped === 0;
    },
    [ensureAudioElement, isMuted]
  );

  const toggleMute = useCallback(() => {
    const audio = ensureAudioElement();
    const next = !isMuted;
    setIsMuted(next);
    audio.muted = next;
  }, [ensureAudioElement, isMuted]);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  }, []);

  const addToQueueNext = useCallback(
    (track: Track) => {
      setQueueIds((prev) => {
        const filtered = prev.filter((id) => id !== track.id);
        if (!currentTrackId) return [track.id, ...filtered];
        const idx = filtered.indexOf(currentTrackId);
        if (idx === -1) return [track.id, ...filtered];
        const copy = [...filtered];
        copy.splice(idx + 1, 0, track.id);
        return copy;
      });
      setPlaybackNotice(`Added "${track.title}" to play next.`);
    },
    [currentTrackId]
  );

  // Wire audio element events
  useEffect(() => {
    const audio = ensureAudioElement();

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      void playNext(true);
    };
    const onPause = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
    };
  }, [ensureAudioElement, playNext]);

  // Wire MediaSession hardware keys
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => void togglePlayPause());
    navigator.mediaSession.setActionHandler('pause', () => void togglePlayPause());
    navigator.mediaSession.setActionHandler('nexttrack', () => void playNext(false));
    navigator.mediaSession.setActionHandler('previoustrack', () => void playPrevious());
  }, [playNext, playPrevious, togglePlayPause]);

  // Spacebar play/pause shortcut when not typing
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        void togglePlayPause();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePlayPause]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Auto-dismiss playback notice after 4s
  useEffect(() => {
    if (!playbackNotice) return;
    const timer = window.setTimeout(() => setPlaybackNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [playbackNotice]);

  return {
    currentTrack,
    queueTracks: getActiveQueueTracks(),
    isPlaying,
    isLoadingAudio,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeatMode,
    playbackNotice,
    analyserRef,
    setPlaybackNotice,
    loadAndPlayTrack,
    togglePlayPause,
    playNext,
    playPrevious,
    seekTo,
    changeVolume,
    toggleMute,
    toggleShuffle: () => setShuffle((s) => !s),
    cycleRepeatMode,
    addToQueueNext,
  };
}
