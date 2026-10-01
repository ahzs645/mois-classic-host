#!/usr/bin/env python3
"""Convert screenshots to sRGB before measuring anything.

macOS saves screenshots in Display P3. Read raw, a P3 file's saturated
colours are wrong for CSS (MOIS navy reads #183f7c; it is #004080). Greys
are unaffected, which is why the error hides.

    python3 scripts/fidelity/to-srgb.py ~/Desktop/Screenshot*.png --out /tmp/caps
"""
import argparse, io, os
from PIL import Image, ImageCms

ap = argparse.ArgumentParser()
ap.add_argument('files', nargs='+')
ap.add_argument('--out', required=True)
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
srgb = ImageCms.createProfile('sRGB')
for i, f in enumerate(a.files, 1):
    im = Image.open(f)
    icc = im.info.get('icc_profile')
    rgb = im.convert('RGB')
    if icc:
        rgb = ImageCms.profileToProfile(rgb, ImageCms.ImageCmsProfile(io.BytesIO(icc)), srgb, outputMode='RGB')
    name = os.path.join(a.out, f'c{i:02d}.png')
    rgb.save(name)
    print(f'{name}  {im.size[0]}x{im.size[1]}  {"converted from embedded profile" if icc else "no profile (assumed sRGB)"}  <- {f}')
