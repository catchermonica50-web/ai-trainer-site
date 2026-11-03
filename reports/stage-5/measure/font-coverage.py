# Every wide (CJK / full-width / general punctuation) character in the exported HTML must be in a Noto SC subset.
# python3 font-coverage.py <out-dir> <public/fonts-dir>
import sys, re, glob, json, os
from fontTools.ttLib import TTFont
out, fonts = sys.argv[1], sys.argv[2]
cmap = {}
for f in glob.glob(os.path.join(fonts, 'noto-sc-*.woff2')):
    cmap[os.path.basename(f)] = set(TTFont(f).getBestCmap())
union = set().union(*cmap.values())
WIDE = re.compile('[\u2000-\u206f\u3000-\u303f\u3400-\u9fff\uff00-\uffef]')
used = set()
for h in glob.glob(os.path.join(out, '**/*.html'), recursive=True):
    used |= set(WIDE.findall(open(h, encoding='utf8').read()))
ascii_ok = all(c in cmap[next(k for k in cmap if 'first' in k)] for c in range(0x20, 0x7f))
missing = sorted(c for c in used if ord(c) not in union)
r = {'htmlWideChars': len(used), 'glyphsPerSubset': {k: len(v) for k, v in cmap.items()}, 'missing': missing, 'asciiInFirst': ascii_ok,
     'trotterLatinInFirst': all(ord(c) in cmap[next(k for k in cmap if 'first' in k)] for c in 'Trotter')}
print(json.dumps(r, ensure_ascii=False))
sys.exit(1 if missing else 0)
