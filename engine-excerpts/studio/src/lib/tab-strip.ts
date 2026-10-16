/**
 * The tab strip scrolls horizontally, and `scrollIntoView` with
 * `inline: "nearest"` can stop with the first visible tab cut mid-word at the
 * left edge. These helpers align the strip so its left edge always falls on a
 * whole tab while keeping the active tab fully visible.
 */

/** [start, end] offsets of a tab inside the strip's scroll content. */
export type TabSpan = readonly [start: number, end: number];

/**
 * Returns the leftmost tab start `s` such that `s <= active.start` and the
 * active tab still fits in `clientWidth` (`active.end - s <= clientWidth`) —
 * i.e. show as many preceding tabs as fit without clipping the active one.
 * When no candidate fits (active tab wider than the strip), the active tab's
 * own start is returned so it aligns with the left edge.
 */
export function alignTabStrip(
  spans: readonly TabSpan[],
  activeIndex: number,
  clientWidth: number
): number {
  if (activeIndex < 0 || activeIndex >= spans.length) {
    return 0;
  }

  const [activeStart, activeEnd] = spans[activeIndex];
  for (const [start] of spans) {
    if (start <= activeStart && activeEnd - start <= clientWidth) {
      return start;
    }
  }

  return activeStart;
}

/**
 * Flags the strip when content overflows past its right edge so CSS can fade
 * the cut-off side. A no-op where rects are unavailable (jsdom), where there
 * is no overflow, or when the scroll position already reaches the end.
 */
export function refreshTabOverflowEnd(strip: HTMLElement): void {
  const overflows =
    strip.scrollWidth > 0 &&
    strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1;
  const next = overflows ? "true" : "false";
  if (strip.dataset.overflowEnd !== next) {
    strip.dataset.overflowEnd = next;
  }
}
