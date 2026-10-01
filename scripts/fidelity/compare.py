#!/usr/bin/env python3
"""Compare a capture with the emulator, the way the fidelity passes did.

    python3 scripts/fidelity/compare.py side  capture.png ours.png out.png
    python3 scripts/fidelity/compare.py ink   capture.png ours.png x0,y0,x1,y1 [...]
    python3 scripts/fidelity/compare.py rules capture.png ours.png --x 1500 [--from 150 --to 420]

side   capture left, ours right, both scaled to 1000 wide.
ink    per region: ink weight (sum of darkness), ink extent and height, for
       each image. Weight is what "the font looks lighter/heavier" means in
       numbers; extent is its width. Regions are in device px of the 2x images.
rules  every dark row down one column: where the rules and borders fall,
       so a row that is a pixel short shows as an offset from there down.
Both images must be sRGB (to-srgb.py) and at the same scale (2x).
"""
import sys
import numpy as np
from PIL import Image

def load(f): return Image.open(f).convert('RGB')

def side(a, b, out):
    A, B = load(a), load(b); W = 1000
    A = A.resize((W, int(A.height * W / A.width))); B = B.resize((W, int(B.height * W / B.width)))
    c = Image.new('RGB', (W * 2 + 8, max(A.height, B.height)), (255, 0, 0)); c.paste(A, (0, 0)); c.paste(B, (W + 8, 0)); c.save(out)
    print(out)

def ink(a, b, boxes):
    for box in boxes:
        b4 = tuple(int(v) for v in box.split(','))
        row = []
        for f in (a, b):
            x = np.asarray(load(f).convert('L').crop(b4)).astype(int)
            m = x < 128; xs = np.where(m.any(axis=0))[0]; ys = np.where(m.any(axis=1))[0]
            weight = int((255 - x)[x < 235].sum() / 255)
            row.append(f'weight {weight:6}  extent {xs.max()-xs.min()+1 if len(xs) else 0:4}  height {ys.max()-ys.min()+1 if len(ys) else 0:3}')
        print(f'{box:22}  capture: {row[0]}   ours: {row[1]}')

def rules(a, b, x, y0, y1):
    for f in (a, b):
        im = np.asarray(load(f)).astype(int)
        print(f'{f}: ' + ' '.join(str(y) for y in range(y0, min(y1, im.shape[0])) if im[y, x].max() < 130))

if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'side': side(*sys.argv[2:5])
    elif cmd == 'ink': ink(sys.argv[2], sys.argv[3], sys.argv[4:])
    elif cmd == 'rules':
        args = sys.argv[2:]; opt = lambda k, d: int(args[args.index(k) + 1]) if k in args else d
        rules(args[0], args[1], opt('--x', 1500), opt('--from', 100), opt('--to', 500))
    else: print(__doc__)
