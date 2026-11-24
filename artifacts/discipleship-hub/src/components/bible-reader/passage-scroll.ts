import type { Location, Passage } from "./reader-utils";

/** Run only after the matching chapter is visible; cancel stale queued navigation. */
export function scrollToPassage(
  loc: Location, passage: Passage | null, loading: boolean, error: string,
  navigationId: number, lastNavigation: { current: number },
) {
  if (loading || error || !passage || passage.book !== loc.book ||
    passage.chapter !== loc.chapter || passage.translation !== loc.translation) return;
  // Closing the verse panel must not jump back to the chapter heading.
  if (!loc.verse && lastNavigation.current === navigationId) return;
  const el = document.getElementById(loc.verse ? `v${loc.verse}` : "br-top");
  if (!el) return;
  const frame = requestAnimationFrame(() => {
    lastNavigation.current = navigationId;
    // Keep the verse below the header and above the mobile verse-study sheet.
    el.scrollIntoView({ block: "start", behavior: "instant" });
  });
  return () => cancelAnimationFrame(frame);
}
