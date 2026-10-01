/* ============================================================================
   PBScaleOverlay — the Windows 200% stretch (data/mois.tsx PBScaleMode).

   MOIS is a 96-dpi program. On a Windows display set to 200% it is drawn at
   1x and Windows scales the whole picture up 2x with bilinear smoothing —
   every 2026-09-29 TRAINING capture shows that softness. A bilinear 2x
   upscale of a 1x image is exactly a [1 2 1]/4 x [1 2 1]/4 convolution of
   the same image drawn sharp at 2x, so on a 2x screen this overlay applies
   that kernel to the frame and every layer over it (a CSS filter on each
   child of `.pb-desktop`, one device pixel per kernel step). On any other
   pixel ratio it stays off (pb/scale.css).

   Measured on Condition (set 3 c34): ink weight 2805 in the capture, 2558
   sharp, 2767 stretched; see docs/rendering-fidelity.md.

   A filter makes its element the containing block of fixed-position
   descendants; every such layer here is itself a child of the desktop, which
   sits at the page origin, so nothing moves (checked: menus, dropped lists,
   dialogs).
   ========================================================================= */
export const PB_SCALE_FILTER_ID = 'pb-dpi-stretch-200'

/** the filter's definition; mounted once inside `.pb-desktop` */
export function PBScaleOverlay() {
  return (
    <svg className="pb-scale-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <filter id={PB_SCALE_FILTER_ID} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feConvolveMatrix order="3" kernelMatrix="1 2 1 2 4 2 1 2 1" divisor="16" edgeMode="duplicate" preserveAlpha="true" />
      </filter>
    </svg>
  )
}
