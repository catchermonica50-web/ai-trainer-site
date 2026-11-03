export const INTRO_VERSION = 'v1';
const BASE = '/media/intro';

export const INTRO_MEDIA = {
  poster: { avif: `${BASE}/intro-poster.v1.avif`, webp: `${BASE}/intro-poster.v1.webp` },
  still: { avif: `${BASE}/intro-still.v1.avif`, webp: `${BASE}/intro-still.v1.webp` },
  idle: { webm: `${BASE}/intro-idle.v1.webm`, mp4: `${BASE}/intro-idle.v1.mp4` },
  transformMobile: {
    webm: `${BASE}/intro-transform-720.v1.webm`,
    mp4: `${BASE}/intro-transform-720.v1.mp4`,
  },
  seq1080: { dir: `${BASE}/seq-1080.v1`, width: 1920, height: 1080 },
  seq720: { dir: `${BASE}/seq-720.v1`, width: 1280, height: 720 },
} as const;

export type FrameSet = { dir: string; width: number; height: number };

export function frameUrl(set: FrameSet, index: number) {
  return `${set.dir}/f${String(index).padStart(3, '0')}.webp`;
}
