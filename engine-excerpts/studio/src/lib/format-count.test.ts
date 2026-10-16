import { describe, expect, it } from "vitest";
import { formatCount } from "./format-count";

describe("formatCount", () => {
  it("uses the singular noun for a count of one", () => {
    expect(formatCount(1, "record")).toBe("1 record");
    expect(formatCount(1, "event")).toBe("1 event");
  });

  it("appends s by default for plural counts", () => {
    expect(formatCount(0, "record")).toBe("0 records");
    expect(formatCount(2, "event")).toBe("2 events");
  });

  it("accepts irregular plurals explicitly", () => {
    expect(formatCount(1, "retry", "retries")).toBe("1 retry");
    expect(formatCount(3, "retry", "retries")).toBe("3 retries");
    expect(formatCount(1, "entry", "entries")).toBe("1 entry");
    expect(formatCount(2, "entry", "entries")).toBe("2 entries");
  });

  it("pluralizes compound nouns as a whole", () => {
    expect(formatCount(1, "retry loop")).toBe("1 retry loop");
    expect(formatCount(11, "retry loop")).toBe("11 retry loops");
  });
});
