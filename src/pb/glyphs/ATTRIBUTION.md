# Vendored control glyphs

These SVGs come from **XP.css / XPandeder.css**
(<https://github.com/botoxparty/XP.css>), MIT licensed — see
`reference/LICENSE-xp.css.txt`.

| file | source | used by |
|---|---|---|
| `checkmark-98.svg` | `themes/98/icon/checkmark.svg` | `.pb-check` tick |
| `checkmark-98-disabled.svg` | `themes/98/icon/checkmark-disabled.svg` | disabled tick |
| `radio-border-98.svg` | `themes/98/icon/radio-border.svg` | `.pb-theme--classic` radio ring |
| `radio-border-98-disabled.svg` | `themes/98/icon/radio-border-disabled.svg` | disabled ring |
| `radio-dot-98.svg` | `themes/98/icon/radio-dot.svg` | radio dot |
| `radio-dot-98-disabled.svg` | `themes/98/icon/radio-dot-disabled.svg` | disabled dot |
| `scroll-up-98.svg` / `scroll-down-98.svg` | `themes/98/icon/button-up.svg`, `button-down.svg` | `.pb-theme--classic` scrollbar buttons |
| `spinbox-up.svg` / `spinbox-down.svg` | `themes/XP/icon/spinbox-up.svg`, `spinbox-down.svg` | `PBSpinner` |

## Why the 98 set and not the XP set

The MOIS screenshots show **classic unthemed Win32 controls** inside a Windows
10 window frame — a PowerBuilder app without a visual-styles manifest gets the
Windows 95-era common controls even on Win10. A pixel dump of a checked
checkbox in `scheduler-provider-daybook-left.png` gives a 13×13 box with a
1px `#2f2d2e` border, white fill, and a chunky `#4a4849`–`#706e6f` tick — which
is exactly the shape of `themes/98/icon/checkmark.svg`, not the clean 1.5px
stroke Windows 10 draws.

The XP set was left out: its checkmark is Luna green (`#22a122`) and its radio
dot green (`#4dbf4a`). The two spinbox chevrons are the exception — plain
`#4D6185`, no Luna styling — so they are vendored for `PBSpinner`.
