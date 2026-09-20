# Vendored fonts

## `ms_sans_serif.woff2`, `ms_sans_serif_bold.woff2`

A bitmap reconstruction of **MS Sans Serif**, drawn on FontStruct by **lou**
(2017) and licensed **CC BY-SA 3.0**
(<http://creativecommons.org/licenses/by-sa/3.0/>) — see the licence, designer
and copyright in the files' own `name` table. The two `.woff2` files are taken
unmodified from [98.css](https://github.com/jdan/98.css) `0.1.20`
(`dist/ms_sans_serif.woff2`, `dist/ms_sans_serif_bold.woff2`), which is MIT and
distributes the same conversion.

Because it is ShareAlike, the font stays under CC BY-SA 3.0 wherever this kit
goes; the kit's own CSS does not become a derivative work of it.

### What it is for

`.pb-text--pixel` (see `pb/text.css`). The kit's default is Tahoma 11px, which
is the font MOIS asks for and the one that matches the measured captions — but
only Windows hints it onto the pixel grid, so off Windows it renders as a soft
outline instead of the hard 1px stems in the screenshots. This font is drawn on
an 11px grid, so at `font-size: 11px` every advance is a whole number of pixels
and the glyphs land on the grid on any platform.

### What it is not

Not Tahoma, and not the real MS Sans Serif — it is a reconstruction, so a few
letterforms (`a`, `e`, `s`) sit slightly differently, and captions come out
1–2px narrower than the real ones. It covers ASCII only (116 glyphs): `…`, `✓`,
`×` and accented characters fall through to Tahoma.
