import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MarkdownRenderer } from "./markdown-renderer";

describe("MarkdownRenderer", () => {
  it("renders heading hierarchy, tables, rules, quotes, and inline formatting", () => {
    render(
      <MarkdownRenderer
        content={[
          "# Overview",
          "## Details",
          "### Notes",
          "A **bold** value, *emphasis*, ~~removed~~, and [reference](https://example.test).",
          "",
          "| Name | Value |",
          "| --- | --- |",
          "| Flow | `ready` |",
          "",
          "---",
          "> Keep the response readable."
        ].join("\n")}
      />
    );

    expect(screen.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "Details" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 3, name: "Notes" })).toBeVisible();
    expect(screen.getByRole("table")).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeVisible();
    expect(screen.getByRole("cell", { name: "Flow" })).toBeVisible();
    expect(screen.getByRole("separator")).toBeVisible();
    expect(screen.getByRole("blockquote")).toHaveTextContent("Keep the response readable.");
    expect(screen.getByText("bold", { selector: "strong" })).toBeVisible();
    expect(screen.getByRole("link", { name: "reference" })).toHaveAttribute(
      "href",
      "https://example.test"
    );
  });

  it("does not create a nested vertical scroller for short code and copies fenced code", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const previousClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText }
    });

    try {
      const { container } = render(
        <MarkdownRenderer content={["```ts", "const value = 1;", "```"].join("\n")} />
      );
      const block = container.querySelector(".markdownCodeBlock");
      expect(block).not.toHaveAttribute("data-long");
      expect(screen.getByLabelText("TypeScript code example")).toHaveTextContent(
        "const value = 1;"
      );

      fireEvent.click(screen.getByRole("button", { name: "Copy TypeScript code" }));

      expect(writeText).toHaveBeenCalledWith("const value = 1;");
      expect(await screen.findByText("Copied", { selector: ".markdownCodeCopy span" })).toBeVisible();
    } finally {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: previousClipboard
      });
    }
  });

  it("marks only long fenced blocks for their internal vertical scroll", () => {
    const content = Array.from({ length: 12 }, (_, index) => `line ${index + 1}`).join("\n");
    const { container } = render(
      <MarkdownRenderer content={`\`\`\`text\n${content}\n\`\`\``} />
    );

    expect(container.querySelector(".markdownCodeBlock")).toHaveAttribute(
      "data-long",
      "true"
    );
  });

  it("renders unsupported link protocols as plain text", () => {
    render(<MarkdownRenderer content="[unsafe](javascript:alert)" />);
    expect(screen.getByText("unsafe")).toBeVisible();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
