"""Mech-style 16:10 placeholder covers for the sample works (WebP, <=150KB).

Each cover is a tinted crop of the intro final-frame still with a HUD grid, corner ticks and an
index label. Re-run after changing the list; filenames are versioned.
Usage: python scripts/make-work-covers.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
STILL = ROOT / 'public/media/intro/intro-still.v1.webp'
OUT = ROOT / 'public/media/work'
W, H = 1280, 800
ORANGE, ICE = (255, 106, 43), (95, 212, 255)
# slug, crop box as fractions of the still (x0, y0, x1), accent
COVERS = [
    ('rlhf-preference-data', (0.36, 0.02, 0.64), ORANGE),
    ('prompt-eval-benchmark', (0.30, 0.20, 0.70), ICE),
    ('multimodal-annotation-guide', (0.40, 0.06, 0.60), ICE),
    ('safety-red-teaming', (0.33, 0.40, 0.67), ORANGE),
]


def cover(still, box, accent, index):
    x0, y0, x1 = box
    cw = (x1 - x0) * still.width
    ch = cw * H / W
    top = y0 * still.height
    img = still.crop((int(x0 * still.width), int(top), int(x1 * still.width), int(top + ch)))
    img = img.resize((W, H), Image.LANCZOS)
    gray = ImageOps.grayscale(ImageEnhance.Contrast(img).enhance(1.3))
    img = ImageOps.colorize(gray, (11, 13, 16), accent, mid=(26, 31, 38))
    img = Image.blend(img, Image.new('RGB', (W, H), (11, 13, 16)), 0.35)
    d = ImageDraw.Draw(img, 'RGBA')
    for x in range(0, W, 64):
        d.line([(x, 0), (x, H)], fill=(201, 209, 217, 18))
    for y in range(0, H, 64):
        d.line([(0, y), (W, y)], fill=(201, 209, 217, 18))
    t, L = 32, 48
    for cx, cy, sx, sy in [(t, t, 1, 1), (W - t, t, -1, 1), (t, H - t, 1, -1), (W - t, H - t, -1, -1)]:
        d.line([(cx, cy), (cx + sx * L, cy)], fill=ICE + (200,), width=2)
        d.line([(cx, cy), (cx, cy + sy * L)], fill=ICE + (200,), width=2)
    d.rectangle([t + 24, H - t - 40, t + 24 + 120, H - t - 36], fill=accent + (220,))
    d.text((t + 24, t + 20), f'[{index:02d}]', fill=accent + (255,))
    return img.filter(ImageFilter.SMOOTH)


def main():
    still = Image.open(STILL).convert('RGB')
    OUT.mkdir(parents=True, exist_ok=True)
    for i, (slug, box, accent) in enumerate(COVERS, 1):
        path = OUT / f'{slug}.v1.webp'
        q = 80
        while True:
            cover(still, box, accent, i).save(path, 'WEBP', quality=q, method=6)
            if path.stat().st_size <= 150_000 or q <= 40:
                break
            q -= 10
        print(path.name, path.stat().st_size, 'q', q)


if __name__ == '__main__':
    main()
