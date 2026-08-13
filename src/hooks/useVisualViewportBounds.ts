import { useEffect, useState } from 'react';

export interface VisualViewportBounds {
  height: number;
  offsetTop: number;
}

// Mobile keyboards resize the VISUAL viewport when they open, but not always the
// layout viewport that CSS `dvh` units are computed from (Safari iOS never
// resizes it for on-page content; Android Chrome only does when the page opts in
// via <meta interactive-widget=resizes-content>, see index.html). Without this,
// a flex-column-anchored, non-fixed element at the bottom of the page (like the
// chat message composer) ends up positioned below the visible area — covered by
// the keyboard instead of pushed above it.
//
// `height` alone is not enough on iOS Safari: when a focused input is near the
// bottom of the page, iOS also scrolls/shifts the visual viewport itself
// (`offsetTop`) to bring the caret above the keyboard, independent of any CSS
// height we apply. Shrinking the shell's height without also compensating for
// that native shift leaves the shell's top pinned to the (now scrolled-away)
// layout-viewport origin, so content — including the composer — can end up
// rendered outside the actually-visible area even though the height is correct.
//
// Returns the current `{ height, offsetTop }` of the visual viewport, updated
// live as the keyboard opens/closes or the page scrolls under it, or `null`
// when the API isn't available (older browsers) — callers should fall back to
// the `h-dvh` CSS class in that case, which is correct there.
export function useVisualViewportBounds(): VisualViewportBounds | null {
  const [bounds, setBounds] = useState<VisualViewportBounds | null>(() => {
    const viewport = typeof window !== 'undefined' ? window.visualViewport : null;
    return viewport ? { height: viewport.height, offsetTop: viewport.offsetTop } : null;
  });

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => setBounds({ height: viewport.height, offsetTop: viewport.offsetTop });
    update();

    // `resize` covers the keyboard opening/closing; `scroll` covers iOS Safari
    // shifting the visual viewport afterward (e.g. nudging the caret further
    // into view) without a corresponding resize event.
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  return bounds;
}
