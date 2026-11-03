"""Sample a particle silhouette of the phase-2 last-frame mech (intro-still) by edge + luminance.
Output: little-endian binary. Header: uint32 count. Then per point: uint16 x, uint16 y (0..65535 over the
crop box, y down), uint8 weight (brightness), uint8 region (0 body, 1 head, 2 visor)."""
import sys, struct
import numpy as np
from PIL import Image, ImageFilter
src, out = sys.argv[1], sys.argv[2]
N = int(sys.argv[3]) if len(sys.argv) > 3 else 7000
im = Image.open(src).convert('L')
W, H = im.size
# Crop around the mech (excludes the side scaffolds and the floor reflection).
X0, X1, Y0, Y1 = int(W*0.375), int(W*0.625), int(H*0.025), int(H*0.94)
g = im.crop((X0, Y0, X1, Y1))
a = np.asarray(g, dtype=np.float32) / 255
e = np.asarray(g.filter(ImageFilter.FIND_EDGES), dtype=np.float32) / 255
# Body mask: blurred edge energy (the dark body is full of panel lines; the backdrop is smooth).
m = np.asarray(Image.fromarray((np.clip(e*6, 0, 1)*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(9)), dtype=np.float32)/255
mask = m > 0.14
# FIND_EDGES rings the crop border; drop it.
mask[:8, :] = mask[-8:, :] = False
mask[:, :8] = mask[:, -8:] = False
p = (e*3 + a*2.5 + 0.06) * mask
p = p / p.sum()
rng = np.random.default_rng(7)
idx = rng.choice(p.size, size=N, replace=False, p=p.ravel())
ys, xs = np.divmod(idx, a.shape[1])
h, w = a.shape
# Regions in source-image fractions (measured on the 1920x1080 still).
def frac(x, y): return (X0 + x) / W, (Y0 + y) / H
region = np.zeros(N, np.uint8)
fx, fy = frac(xs, ys)
region[(fy < 0.135) & (fx > 0.46) & (fx < 0.54)] = 1
region[(fy > 0.095) & (fy < 0.125) & (fx > 0.478) & (fx < 0.522)] = 2
wgt = np.clip((a[ys, xs]*0.6 + e[ys, xs]*2)*255, 30, 255).astype(np.uint8)
with open(out, 'wb') as f:
    f.write(struct.pack('<I', N))
    for x, y, wv, r in zip(xs, ys, wgt, region):
        f.write(struct.pack('<HHBB', int(x/(w-1)*65535), int(y/(h-1)*65535), int(wv), int(r)))
# Preview
pv = Image.new('RGB', (w, h))
px = pv.load()
for x, y, r in zip(xs, ys, region):
    px[int(x), int(y)] = (95, 212, 255) if r == 2 else (255, 140, 60) if r == 1 else (200, 210, 220)
pv.save(out + '.preview.png')
print(N, w, h, (region == 1).sum(), (region == 2).sum(), 'aspect', w/h * W/H if False else w/h)
