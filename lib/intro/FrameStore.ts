import { frameUrl, type FrameSet } from './assets';

type Stats = { decoded: number; bytes: number; peakBytes: number; closed: number };

/**
 * Downloads every frame as a compressed Blob, but keeps only a small window of
 * decoded ImageBitmaps around the current frame. Far frames are close()d.
 */
export class FrameStore {
  private readonly blobs: (Blob | null)[];
  private readonly bitmaps = new Map<number, ImageBitmap>();
  private readonly decoding = new Set<number>();
  private readonly abort = new AbortController();
  private current = 0;
  private failures = 0;
  readonly stats: Stats = { decoded: 0, bytes: 0, peakBytes: 0, closed: 0 };

  constructor(
    readonly set: FrameSet,
    readonly count: number,
    private readonly radius: number,
    private readonly onFail: () => void,
    private readonly onFrameReady: (index: number) => void,
  ) {
    this.blobs = new Array<Blob | null>(count).fill(null);
  }

  /** Download all frames, nearest to the current frame first. */
  async download(concurrency = 6) {
    const order = [...Array(this.count).keys()].sort(
      (a, b) => Math.abs(a - this.current) - Math.abs(b - this.current),
    );
    const worker = async () => {
      while (order.length && !this.abort.signal.aborted) {
        const i = order.shift() as number;
        try {
          const res = await fetch(frameUrl(this.set, i), { signal: this.abort.signal });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          this.blobs[i] = await res.blob();
          if (this.inWindow(i)) void this.decode(i);
        } catch {
          if (!this.abort.signal.aborted) this.fail();
          return;
        }
      }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
  }

  setCurrent(index: number) {
    this.current = index;
    for (const [i, bmp] of this.bitmaps) {
      if (!this.inWindow(i)) {
        bmp.close();
        this.bitmaps.delete(i);
        this.stats.closed += 1;
      }
    }
    for (let i = index - this.radius; i <= index + this.radius; i += 1) {
      if (i >= 0 && i < this.count && this.blobs[i]) void this.decode(i);
    }
    this.updateStats();
  }

  /** Exact frame if decoded, otherwise the nearest decoded neighbour. */
  get(index: number): ImageBitmap | undefined {
    for (let d = 0; d <= this.radius; d += 1) {
      const hit = this.bitmaps.get(index - d) ?? this.bitmaps.get(index + d);
      if (hit) return hit;
    }
    return undefined;
  }

  has(index: number) {
    return this.bitmaps.has(index);
  }

  dispose() {
    this.abort.abort();
    for (const bmp of this.bitmaps.values()) bmp.close();
    this.bitmaps.clear();
    this.updateStats();
  }

  private inWindow(i: number) {
    return Math.abs(i - this.current) <= this.radius;
  }

  private async decode(i: number) {
    const blob = this.blobs[i];
    if (!blob || this.bitmaps.has(i) || this.decoding.has(i)) return;
    this.decoding.add(i);
    try {
      const bmp = await createImageBitmap(blob);
      if (this.abort.signal.aborted || !this.inWindow(i)) {
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
    if (this.failures === 1) this.onFail();
  }

  private updateStats() {
    const { width, height } = this.set;
    this.stats.decoded = this.bitmaps.size;
    this.stats.bytes = this.bitmaps.size * width * height * 4;
    this.stats.peakBytes = Math.max(this.stats.peakBytes, this.stats.bytes);
  }
}
