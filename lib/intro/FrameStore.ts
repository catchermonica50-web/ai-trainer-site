import { frameUrl, type FrameSet } from './assets';

type Stats = { decoded: number; bytes: number; peakBytes: number; closed: number };
const DEV = process.env.NODE_ENV !== 'production';
/** Dev-only probe: ImageBitmaps created and not yet closed (all stores). Stripped in production. */
export const DEV_LIVE = { live: 0, peak: 0 };
function devCount(delta: 1 | -1) {
  if (!DEV) return;
  DEV_LIVE.live += delta;
  if (DEV_LIVE.live > DEV_LIVE.peak) {
    DEV_LIVE.peak = DEV_LIVE.live;
    console.debug('[FrameStore] live decoded frames peak', DEV_LIVE.peak);
  }
  (window as unknown as { __frameStoreLive?: typeof DEV_LIVE }).__frameStoreLive =
    DEV_LIVE;
}
/** Concurrent createImageBitmap calls; each in-flight decode also holds a full frame. */
const DECODE_CONCURRENCY = 3;

const WARM = 24;
const SPARSE = 8;

/**
 * Downloads frames as compressed Blobs through a priority queue that follows
 * the scroll target, and keeps only a small window of decoded ImageBitmaps.
 * While the target frame is missing, the nearest downloaded frame stands in.
 */
export class FrameStore {
  private readonly blobs: (Blob | null)[];
  private readonly pending = new Set<number>();
  private readonly bitmaps = new Map<number, ImageBitmap>();
  private readonly decoding = new Set<number>();
  private readonly abort = new AbortController();
  private current = 0;
  private target = 0;
  private steered = false;
  private fallback = -1;
  private active = 0;
  private failures = 0;
  readonly stats: Stats = { decoded: 0, bytes: 0, peakBytes: 0, closed: 0 };

  constructor(
    readonly set: FrameSet,
    readonly count: number,
    private readonly radius: number,
    private readonly onFail: () => void,
    private readonly onFrameReady: (index: number) => void,
    private readonly concurrency = 6,
  ) {
    this.blobs = new Array<Blob | null>(count).fill(null);
    for (let i = 0; i < count; i += 1) this.pending.add(i);
  }

  /** Start fetching: first WARM frames, then every SPARSE-th, until steered by scroll. */
  start() {
    this.pump();
  }

  /** Scroll target (where the scrub is heading); reorders the queue. */
  setTarget(index: number) {
    this.target = index;
    this.steered = true;
    this.pump();
  }

  setCurrent(index: number) {
    this.current = index;
    this.fallback = this.blobs[index] ? -1 : this.nearestBlob(index);
    for (const [i, bmp] of this.bitmaps) {
      if (!this.keep(i)) {
        this.release(i, bmp);
      }
    }
    this.decodeWindow();
    this.updateStats();
  }

  /** Exact frame if decoded, otherwise the nearest decoded frame. */
  get(index: number): { bmp: ImageBitmap; index: number } | undefined {
    let best: { bmp: ImageBitmap; index: number } | undefined;
    for (const [i, bmp] of this.bitmaps) {
      if (!best || Math.abs(i - index) < Math.abs(best.index - index))
        best = { bmp, index: i };
    }
    return best;
  }

  dispose() {
    this.abort.abort();
    for (const [i, bmp] of this.bitmaps) this.release(i, bmp);
    this.updateStats();
  }

  private priority(i: number) {
    if (!this.steered) return i < WARM ? i : i % SPARSE === 0 ? WARM + i : 1000 + i;
    const d = Math.abs(i - this.target);
    // Sparse frames rank ahead, so any position quickly has a near neighbour.
    return i % SPARSE === 0 ? d / 3 : d;
  }

  private pump() {
    while (
      this.active < this.concurrency &&
      this.pending.size &&
      !this.abort.signal.aborted
    ) {
      let next = -1;
      for (const i of this.pending) {
        if (next < 0 || this.priority(i) < this.priority(next)) next = i;
      }
      this.pending.delete(next);
      this.active += 1;
      void this.fetchFrame(next).finally(() => {
        this.active -= 1;
        this.pump();
      });
    }
  }

  private async fetchFrame(i: number) {
    try {
      const res = await fetch(frameUrl(this.set, i), { signal: this.abort.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.blobs[i] = await res.blob();
      if (!this.blobs[this.current]) this.setCurrent(this.current);
      else if (this.keep(i)) void this.decode(i);
    } catch {
      if (!this.abort.signal.aborted) this.fail();
    }
  }

  private nearestBlob(index: number) {
    for (let d = 1; d < this.count; d += 1) {
      if (this.blobs[index - d]) return index - d;
      if (this.blobs[index + d]) return index + d;
    }
    return -1;
  }

  private keep(i: number) {
    return Math.abs(i - this.current) <= this.radius || i === this.fallback;
  }

  /** Nearest-first: current frame, the fallback, then outwards within the radius. */
  private decodeWindow() {
    const order = [this.current];
    if (this.fallback >= 0) order.push(this.fallback);
    for (let d = 1; d <= this.radius; d += 1)
      order.push(this.current + d, this.current - d);
    for (const i of order) {
      if (this.decoding.size >= DECODE_CONCURRENCY) return;
      if (i >= 0 && i < this.count && this.blobs[i]) void this.decode(i);
    }
  }

  /** Close and forget a frame; nothing else (canvas, caches) keeps a reference to it. */
  private release(i: number, bmp: ImageBitmap) {
    bmp.close();
    if (this.bitmaps.get(i) === bmp) this.bitmaps.delete(i);
    this.stats.closed += 1;
    devCount(-1);
  }

  private async decode(i: number) {
    const blob = this.blobs[i];
    if (!blob || this.bitmaps.has(i) || this.decoding.has(i)) return;
    this.decoding.add(i);
    try {
      const bmp = await createImageBitmap(blob);
      devCount(1);
      if (this.abort.signal.aborted || !this.keep(i) || this.bitmaps.has(i)) {
        this.release(i, bmp);
      } else {
        this.bitmaps.set(i, bmp);
        this.updateStats();
        this.onFrameReady(i);
      }
    } catch {
      this.fail();
    } finally {
      this.decoding.delete(i);
      if (!this.abort.signal.aborted) this.decodeWindow();
    }
  }

  private fail() {
    this.failures += 1;
    if (this.failures === 1) {
      this.abort.abort();
      this.onFail();
    }
  }

  private updateStats() {
    const { width, height } = this.set;
    this.stats.decoded = this.bitmaps.size;
    this.stats.bytes = this.bitmaps.size * width * height * 4;
    this.stats.peakBytes = Math.max(this.stats.peakBytes, this.stats.bytes);
  }
}
