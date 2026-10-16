import { describe, expect, it } from "vitest";
import { alignTabStrip } from "./tab-tab-strip";

const FULL_TABS = [
  [0, 96],
  [96, 199],
  [199, 303],
  [303, 389],
  [389, 499],
  [499, 613],
  [613, 719],
  [719, 826]
] as const;

describe("alignTabStrip", () => {
  it("keeps the strip at the start when the active tab is the first one", () => {
    expect(alignTabStrip(FULL_TABS, 0, 330)).toBe(0);
  });

  it("starts the strip on a whole tab that keeps a middle active tab visible", () => {
    // Active tab spans [389, 499]: 499 - 0 and 499 - 96 both exceed 330 but
    // 499 - 199 = 300 fits, so 199 is the leftmost fitting tab start.
    expect(alignTabStrip(FULL_TABS, 4, 330)).toBe(199);
  });

  it("aligns the last tab's start when earlier tabs cannot keep it visible", () => {
    // Active tab spans [719, 826]; 826 - 613 = 213 <= 330 but 826 - 499 is
    // 327 <= 330 too, and 826 - 389 = 437 > 330, so 499 is the leftmost fit.
    expect(alignTabStrip(FULL_TABS, 7, 330)).toBe(499);
  });

  it("returns the active tab's start when it is wider than the strip", () => {
    const wideTabs = [
      [0, 120],
      [120, 700]
    ] as const;
    expect(alignTabStrip(wideTabs, 1, 330)).toBe(120);
  });

  it("returns the strip start when every tab fits", () => {
    expect(alignTabStrip(FULL_TABS, 7, 900)).toBe(0);
  });

  it("tolerates an out-of-range active index", () => {
    expect(alignTabStrip(FULL_TABS, -1, 330)).toBe(0);
    expect(alignTabStrip([], 0, 330)).toBe(0);
  });
});
