import { describe, expect, it } from "vitest";
import { formatEnumLabel, formatUiStatusLabel } from "./ui-copy";

describe("formatUiStatusLabel", () => {
  it("capitalizes ordinary user-visible status labels", () => {
    expect(formatUiStatusLabel("available")).toBe("Available");
    expect(formatUiStatusLabel("  needs attention")).toBe("  Needs attention");
  });

  it("preserves technical identifiers", () => {
    expect(formatUiStatusLabel("three.js ready")).toBe("three.js ready");
  });
});

describe("formatEnumLabel", () => {
  it("humanizes upper-snake enum values", () => {
    expect(formatEnumLabel("SUCCESS")).toBe("Success");
    expect(formatEnumLabel("IN_PROGRESS")).toBe("In progress");
    expect(formatEnumLabel("NOT_AVAILABLE")).toBe("Not available");
  });

  it("keeps technical prefixes lowercase", () => {
    expect(formatEnumLabel("P5_READY")).toBe("p5 ready");
    expect(formatEnumLabel("GLSL_SHIM")).toBe("glsl shim");
  });

  it("keeps leading acronyms verbatim", () => {
    expect(formatEnumLabel("API_LIMIT")).toBe("API limit");
  });

  it("handles already-humanized and empty values", () => {
    expect(formatEnumLabel("In progress")).toBe("In progress");
    expect(formatEnumLabel("")).toBe("");
    expect(formatEnumLabel("   ")).toBe("");
  });
});
