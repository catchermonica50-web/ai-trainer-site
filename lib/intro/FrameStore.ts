import { frameUrl, type FrameSet } from './assets';

type Stats = { decoded: number; bytes: number; peakBytes: number; closed: number };

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
        bmp.close();
        this.bitmaps.delete(i);
        this.stats.closed += 1;
      }
    }
    for (let i = index - this.radius; i <= index + this.radius; i += 1) {
      if (i >= 0 && i < this.count && this.blobs[i]) void this.decode(i);
    }
    if (this.fallback >= 0) void this.decode(this.fallback);
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
    for (const bmp of this.bitmaps.values()) bmp.close();
    this.bitmaps.clear();
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

  private async decode(i: number) {
    const blob = this.blobs[i];
    if (!blob || this.bitmaps.has(i) || this.decoding.has(i)) return;
    this.decoding.add(i);
    try {
      const bmp = await createImageBitmap(blob);
      if (this.abort.signal.aborted || !this.keep(i)) {
        bmp.close();
        this.stats.closed += 1;
      } else {
        this.bitmaps.set(i, bmp);
        this.updateStats();
        this.onFrameReady(i);
      }
    } catch {
      this.fail();
    } finally {
      this.decoding.delete(i);
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
