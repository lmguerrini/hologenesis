

export type PaneSizes = {
  left: number;
  preview: number;
  right: number;
};

export type PanePreferences = PaneSizes & {
  leftCollapsed: boolean;
  rightCollapsed: boolean;
};

export const PANE_STORAGE_KEY = "example.ui.panes.v1";
export const LAYOUT_STORAGE_KEY = "example.ui.layout.v1";

export type PaneLayoutPreset = {
  primary: "center" | "right";
  preview: "above" | "below";
};

export const DEFAULT_LAYOUT_PRESET: PaneLayoutPreset = {
  primary: "center",
  preview: "below"
};

export function layoutPresetKey(preset: PaneLayoutPreset): string {
  return `primary-${preset.primary}-preview-${preset.preview}`;
}

export function parsePaneLayoutPreset(raw: string | null): PaneLayoutPreset {
  if (typeof raw !== "string") return DEFAULT_LAYOUT_PRESET;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_LAYOUT_PRESET;
    const record = parsed as Record<string, unknown>;
    return {
      primary: record.primary === "right" ? "right" : "center",
      preview: record.preview === "above" ? "above" : "below"
    };
  } catch {
    return DEFAULT_LAYOUT_PRESET;
  }
}

export function readPaneLayoutPreset(): PaneLayoutPreset {
  try {
    return parsePaneLayoutPreset(globalThis.window?.localStorage.getItem(LAYOUT_STORAGE_KEY) ?? null);
  } catch {
    return DEFAULT_LAYOUT_PRESET;
  }
}

export function writePaneLayoutPreset(preset: PaneLayoutPreset): void {
  try {
    globalThis.window?.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(preset));
  } catch {
    // Layout preferences are optional when browser storage is unavailable.
  }
}

function presetPaneStorageKey(preset: PaneLayoutPreset): string {
  return layoutPresetKey(preset) === layoutPresetKey(DEFAULT_LAYOUT_PRESET)
    ? PANE_STORAGE_KEY
    : `${PANE_STORAGE_KEY}.${layoutPresetKey(preset)}`;
}

export const paneBounds = {
  left: { min: 200, max: 420, default: 256 },
  // The live preview bound is 75% of the centre column (resolvePreviewMax);
  // the absolute max is only a corrupt-payload ceiling far above any real
  // centre height, so it never preempts the proportional contract.
  preview: { min: 140, max: 3200, default: 280 },
  right: { min: 320, max: 760, default: 424 },
  centreMinWidth: 480
} as const;

export const paneKeyboardStep = 16;
export const paneKeyboardStepLarge = 64;

/** Right pane never takes more than half the viewport (nor 760px). */
export function resolveRightMax(viewportWidth: number): number {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) {
    return paneBounds.right.max;
  }
  return Math.min(
    paneBounds.right.max,
    Math.max(paneBounds.right.min, Math.floor(viewportWidth / 2))
  );
}

/** Largest sidebar width that still leaves the centre column its minimum. */
export function resolveSidebarMax(
  viewportWidth: number,
  rightPaneWidth: number,
  rightPaneCollapsed = false
): number {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) {
    return paneBounds.left.max;
  }
  const rightExtent = rightPaneCollapsed ? 0 : rightPaneWidth;
  return Math.min(
    paneBounds.left.max,
    Math.max(
      paneBounds.left.min,
      viewportWidth - rightExtent - paneBounds.centreMinWidth
    )
  );
}

/** Largest right pane width that still leaves the centre column its minimum. */
export function resolveRightPaneMax(
  viewportWidth: number,
  sidebarWidth: number,
  sidebarCollapsed = false
): number {
  const viewportCap = resolveRightMax(viewportWidth);
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0 || sidebarCollapsed) {
    return viewportCap;
  }
  return Math.min(
    viewportCap,
    Math.max(
      paneBounds.right.min,
      viewportWidth - sidebarWidth - paneBounds.centreMinWidth
    )
  );
}

/** Preview never exceeds 75% of the centre column height. */
export function resolvePreviewMax(centreHeight: number): number {
  if (!Number.isFinite(centreHeight) || centreHeight <= 0) {
    return paneBounds.preview.max;
  }
  return Math.max(
    paneBounds.preview.min,
    Math.min(
      paneBounds.preview.max,
      Math.floor(centreHeight * 0.75)
    )
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function clampLeftWidth(width: number): number {
  return clamp(
    width,
    paneBounds.left.min,
    paneBounds.left.max
  );
}

export function clampRightWidth(width: number, viewportWidth: number): number {
  return clamp(width, paneBounds.right.min, resolveRightMax(viewportWidth));
}

/** Clamp against an already-resolved maximum (e.g. one derived from the sibling pane). */
export function clampLeftWidthToBound(
  width: number,
  resolvedMax: number
): number {
  return clamp(width, paneBounds.left.min, resolvedMax);
}

/** Clamp against an already-resolved maximum (e.g. one derived from the sibling pane). */
export function clampRightWidthToBound(
  width: number,
  resolvedMax: number
): number {
  return clamp(width, paneBounds.right.min, resolvedMax);
}

export function clampPreviewHeight(
  height: number,
  centreHeight: number
): number {
  return clamp(
    height,
    paneBounds.preview.min,
    resolvePreviewMax(centreHeight)
  );
}

/** Clamp against an already-resolved maximum (e.g. the stacked-layout cap). */
export function clampPreviewHeightToBound(
  height: number,
  resolvedMax: number
): number {
  return clamp(height, paneBounds.preview.min, resolvedMax);
}

export function defaultPaneSizes(): PaneSizes {
  return {
    left: paneBounds.left.default,
    preview: paneBounds.preview.default,
    right: paneBounds.right.default
  };
}

export function clampPaneSizes(
  sizes: PaneSizes,
  viewportWidth: number,
  centreHeight: number
): PaneSizes {
  return {
    left: clampLeftWidth(sizes.left),
    preview: clampPreviewHeight(sizes.preview, centreHeight),
    right: clampRightWidth(sizes.right, viewportWidth)
  };
}

export function serializePanePreferences(preferences: PanePreferences): string {
  return JSON.stringify(preferences);
}

function coercePaneNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

/**
 * Parse and validate a stored preferences payload. Unknown shapes fall back
 * to defaults field-by-field so a partially corrupt entry still yields
 * usable geometry; only non-object payloads return null.
 */
export function parsePanePreferences(raw: string | null): PanePreferences | null {
  if (typeof raw !== "string" || raw.trim() === "") {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  const defaults = defaultPaneSizes();
  const left = coercePaneNumber(record.left);
  const preview = coercePaneNumber(record.preview);
  const right = coercePaneNumber(record.right);

  return {
    left: left === null ? defaults.left : clampLeftWidth(left),
    preview:
      preview === null
        ? defaults.preview
        : clampPreviewHeight(preview, 0),
    right:
      right === null
        ? defaults.right
        : clamp(right, paneBounds.right.min, paneBounds.right.max),
    leftCollapsed: Boolean(record.leftCollapsed),
    rightCollapsed: Boolean(record.rightCollapsed)
  };
}

function resolvePaneStorage(): Storage | null {
  try {
    return globalThis.window?.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readPanePreferences(preset: PaneLayoutPreset = DEFAULT_LAYOUT_PRESET): PanePreferences | null {
  const storage = resolvePaneStorage();
  if (!storage) {
    return null;
  }

  try {
    const presetValue = storage.getItem(presetPaneStorageKey(preset));
    if (presetValue !== null) return parsePanePreferences(presetValue);
    // The unsuffixed v1 key is the legacy global layout. Use it to seed the
    // default preset once, while other presets begin with their own defaults.
    return layoutPresetKey(preset) === layoutPresetKey(DEFAULT_LAYOUT_PRESET)
      ? parsePanePreferences(storage.getItem(PANE_STORAGE_KEY))
      : null;
  } catch {
    return null;
  }
}

export function writePanePreferences(
  preferences: PanePreferences,
  preset: PaneLayoutPreset = DEFAULT_LAYOUT_PRESET
): void {
  const storage = resolvePaneStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(presetPaneStorageKey(preset), serializePanePreferences(preferences));
  } catch {
    // Storage can be full or blocked; pane geometry is not worth failing over.
  }
}



export function withDefaultPaneSizes(sizes: Partial<PaneSizes> | null): PaneSizes {
  const defaults = defaultPaneSizes();
  if (!sizes) {
    return defaults;
  }

  return {
    left: sizes.left === undefined ? defaults.left : clampLeftWidth(sizes.left),
    preview:
      sizes.preview === undefined
        ? defaults.preview
        : clampPreviewHeight(sizes.preview, 0),
    right:
      sizes.right === undefined
        ? defaults.right
        : clamp(sizes.right, paneBounds.right.min, paneBounds.right.max)
  };
}

/** Resolve the signed delta (or min/max jump) a splitter key implies. */
export function paneKeyboardDelta(
  key: string,
  shiftKey: boolean
): number | "min" | "max" | null {
  switch (key) {
    case "ArrowLeft":
    case "ArrowRight":
    case "ArrowUp":
    case "ArrowDown":
      return shiftKey ? paneKeyboardStepLarge : paneKeyboardStep;
    case "Home":
      return "min";
    case "End":
      return "max";
    default:
      return null;
  }
}

export function applyPaneKeyboardStep(
  value: number,
  delta: number | "min" | "max",
  min: number,
  max: number
): number {
  if (delta === "min") {
    return min;
  }
  if (delta === "max") {
    return max;
  }
  return clamp(value + delta, min, max);
}
