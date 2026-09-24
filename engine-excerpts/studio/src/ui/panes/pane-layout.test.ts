import { afterEach, describe, expect, it } from "vitest";
import {
  PANE_STORAGE_KEY,
  applyPaneKeyboardStep,
  clampPaneSizes,
  clampPreviewHeight,
  clampPreviewHeightToBound,
  clampRightWidth,
  defaultPaneSizes,
  paneBounds,
  paneKeyboardDelta,
  parsePanePreferences,
  readPanePreferences,
  resolveRightPaneMax,
  resolvePreviewMax,
  resolveRightMax,
  resolveSidebarMax,
  serializePanePreferences,
  withDefaultPaneSizes,
  writePanePreferences
} from "./pane-layout";

describe("pane layout bounds", () => {
  it("keeps the documented default geometry", () => {
    expect(paneBounds).toEqual({
      left: { min: 200, max: 420, default: 256 },
      preview: { min: 140, max: 520, default: 280 },
      right: { min: 320, max: 760, default: 424 },
      centreMinWidth: 480
    });
    expect(defaultPaneSizes()).toEqual({ left: 256, preview: 280, right: 424 });
  });

  it("caps the right pane at half the viewport but never below its minimum", () => {
    expect(resolveRightMax(2000)).toBe(760);
    expect(resolveRightMax(1200)).toBe(600);
    expect(resolveRightMax(640)).toBe(320);
    expect(resolveRightMax(0)).toBe(760);
    expect(resolveRightMax(Number.NaN)).toBe(760);
  });

  it("derives the sidebar maximum from the centre column minimum", () => {
    // 1600 - 424 right pane - 480 centre = 696, capped at 420.
    expect(resolveSidebarMax(1600, 424)).toBe(420);
    // 1200 - 424 - 480 = 296 -> still above the 200px sidebar minimum.
    expect(resolveSidebarMax(1200, 424)).toBe(296);
    // 900 - 424 - 480 = -4 -> floored at the sidebar minimum, never below it.
    expect(resolveSidebarMax(900, 424)).toBe(200);
    // A collapsed right pane frees its width for the sidebar.
    expect(resolveSidebarMax(900, 424, true)).toBe(420);
    expect(resolveSidebarMax(0, 424)).toBe(420);
  });

  it("derives the right pane maximum from the centre column minimum", () => {
    expect(resolveRightPaneMax(1600, 256)).toBe(760);
    expect(resolveRightPaneMax(1200, 256)).toBe(464);
    // Narrow viewports still keep the right pane at its own minimum.
    expect(resolveRightPaneMax(700, 256)).toBe(320);
    expect(resolveRightPaneMax(700, 256, true)).toBe(350);
    expect(resolveRightPaneMax(700, 256)).toBe(
      Math.min(760, Math.max(320, 700 - 256 - 480))
    );
  });

  it("caps the preview at 75% of the centre column height", () => {
    expect(resolvePreviewMax(2000)).toBe(520);
    expect(resolvePreviewMax(800)).toBe(520);
    expect(resolvePreviewMax(400)).toBe(300);
    expect(resolvePreviewMax(100)).toBe(140);
    expect(resolvePreviewMax(0)).toBe(520);
  });
});

describe("pane layout clamping", () => {
  it("clamps every pane independently", () => {
    expect(clampPaneSizes({ left: 999, preview: 999, right: 999 }, 1600, 1000)).toEqual(
      { left: 420, preview: 520, right: 760 }
    );
    expect(clampPaneSizes({ left: 0, preview: 0, right: 0 }, 1600, 1000)).toEqual({
      left: 200,
      preview: 140,
      right: 320
    });
    // Half-viewport cap applies to the right pane even inside absolute bounds.
    expect(clampRightWidth(700, 900)).toBe(450);
    expect(clampPreviewHeight(400, 300)).toBe(225);
    // A pre-resolved maximum (e.g. the stacked-layout cap) clamps directly.
    expect(clampPreviewHeightToBound(600, 520)).toBe(520);
    expect(clampPreviewHeightToBound(90, 520)).toBe(140);
  });
});

describe("pane preference persistence", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("round-trips preferences through the shared storage key", () => {
    const preferences = {
      left: 300,
      preview: 200,
      right: 500,
      leftCollapsed: true,
      rightCollapsed: false
    };
    writePanePreferences(preferences);

    expect(window.localStorage.getItem(PANE_STORAGE_KEY)).toBe(
      serializePanePreferences(preferences)
    );
    expect(readPanePreferences()).toEqual(preferences);
  });

  it("repairs corrupt and partial payloads field-by-field", () => {
    expect(parsePanePreferences(null)).toBeNull();
    expect(parsePanePreferences("")).toBeNull();
    expect(parsePanePreferences("not json")).toBeNull();
    // Array payloads are unknown shapes, not hard failures: defaults fill in.
    expect(parsePanePreferences("[1,2,3]")).toEqual({
      left: 256,
      preview: 280,
      right: 424,
      leftCollapsed: false,
      rightCollapsed: false
    });

    expect(
      parsePanePreferences(
        JSON.stringify({ left: 990, preview: "huge", right: null })
      )
    ).toEqual({
      left: 420,
      preview: 280,
      right: 424,
      leftCollapsed: false,
      rightCollapsed: false
    });
  });


  it("fills defaults for missing fields", () => {
    expect(withDefaultPaneSizes(null)).toEqual(defaultPaneSizes());
    expect(withDefaultPaneSizes({ right: 999 })).toEqual({
      left: 256,
      preview: 280,
      right: 760
    });
  });
});

describe("pane keyboard steps", () => {
  it("maps keys to steps and edge jumps", () => {
    expect(paneKeyboardDelta("ArrowLeft", false)).toBe(16);
    expect(paneKeyboardDelta("ArrowDown", true)).toBe(64);
    expect(paneKeyboardDelta("Home", false)).toBe("min");
    expect(paneKeyboardDelta("End", false)).toBe("max");
    expect(paneKeyboardDelta("Enter", false)).toBeNull();
  });

  it("applies signed deltas and clamps to the splitter range", () => {
    expect(applyPaneKeyboardStep(300, -16, 200, 420)).toBe(284);
    expect(applyPaneKeyboardStep(300, 64, 200, 420)).toBe(364);
    expect(applyPaneKeyboardStep(300, "min", 200, 420)).toBe(200);
    expect(applyPaneKeyboardStep(300, "max", 200, 420)).toBe(420);
    expect(applyPaneKeyboardStep(205, -64, 200, 420)).toBe(200);
    expect(applyPaneKeyboardStep(410, 64, 200, 420)).toBe(420);
  });
});
