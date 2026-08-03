import { describe, expect, it } from "vitest";
import { formatUiStatusLabel } from "./ui-copy";

describe("formatUiStatusLabel", () => {
  it("capitalizes ordinary user-visible status labels", () => {
    expect(formatUiStatusLabel("available")).toBe("Available");
    expect(formatUiStatusLabel("  needs attention")).toBe("  Needs attention");
  });

  it("preserves technical identifiers", () => {
    expect(formatUiStatusLabel("three.js ready")).toBe("three.js ready");
  });
});
