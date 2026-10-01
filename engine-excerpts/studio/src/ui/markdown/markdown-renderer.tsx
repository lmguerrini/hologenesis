"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

type MarkdownBlock =
  | { kind: "code"; content: string; language: string }
  | { kind: "heading"; content: string; level: 1 | 2 | 3 }
  | { kind: "list"; items: string[]; ordered: boolean }
  | { kind: "paragraph"; content: string }
  | { kind: "quote"; content: string }
  | { kind: "rule" }
  | { kind: "table"; rows: string[][] };

const longCodeLineCount = 12;
const longCodeCharacterCount = 600;

export function MarkdownRenderer({ content }: { content: string }) {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="markdown">
      {blocks.map((block, index) => {
        const key = `${block.kind}-${index}`;

        switch (block.kind) {
          case "code":
            return <CodeBlock block={block} key={key} />;
          case "heading": {
            const Heading = `h${block.level}` as "h1" | "h2" | "h3";
            return <Heading key={key}>{renderInlineMarkdown(block.content)}</Heading>;
          }
          case "list": {
            const List = block.ordered ? "ol" : "ul";
            return (
              <List key={key}>
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
                ))}
              </List>
            );
          }
          case "quote":
            return <blockquote key={key}>{renderInlineMarkdown(block.content)}</blockquote>;
          case "paragraph":
            return <p key={key}>{renderInlineMarkdown(block.content)}</p>;
          case "rule":
            return <hr key={key} />;
          case "table":
            return (
              <div className="markdownTableScroll" key={key}>
                <table>
                  <thead>
                    <tr>
                      {block.rows[0]?.map((cell, cellIndex) => (
                        <th key={`${key}-head-${cellIndex}`} scope="col">
                          {renderInlineMarkdown(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.slice(1).map((row, rowIndex) => (
                      <tr key={`${key}-row-${rowIndex}`}>
                        {row.map((cell, cellIndex) => (
                          <td key={`${key}-${rowIndex}-${cellIndex}`}>
                            {renderInlineMarkdown(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}

function CodeBlock({
  block
}: {
  block: Extract<MarkdownBlock, { kind: "code" }>;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "unavailable">("idle");
  const languageLabel = formatLanguageLabel(block.language);
  const isLong =
    block.content.split("\n").length >= longCodeLineCount ||
    block.content.length >= longCodeCharacterCount;

  async function copyCode() {
    if (!navigator.clipboard?.writeText) {
      setCopyState("unavailable");
      return;
    }
    try {
      await navigator.clipboard.writeText(block.content);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("unavailable");
    }
  }

  return (
    <figure
      className="markdownCodeBlock"
      data-long={isLong ? "true" : undefined}
    >
      <figcaption>
        <span>{languageLabel}</span>
        <button
          aria-label={`Copy ${languageLabel} code`}
          className="markdownCodeCopy"
          onClick={() => void copyCode()}
          type="button"
        >
          {copyState === "copied" ? (
            <Check aria-hidden="true" size={14} />
          ) : (
            <Copy aria-hidden="true" size={14} />
          )}
          <span>{copyState === "copied" ? "Copied" : "Copy"}</span>
        </button>
      </figcaption>
      <pre aria-label={`${languageLabel} code example`}>
        <code>{block.content}</code>
      </pre>
      <span aria-live="polite" className="visuallyHidden" role="status">
        {copyState === "copied"
          ? "Code copied."
          : copyState === "unavailable"
            ? "Code could not be copied from this browser."
            : ""}
      </span>
    </figure>
  );
}

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^\s*```\s*([^\s`]*)?.*$/);
    if (fence) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index] ?? "")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({
        kind: "code",
        content: codeLines.join("\n").replace(/\s+$/, ""),
        language: fence[1] ?? ""
      });
      continue;
    }

    const heading = line.match(/^\s*(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({
        kind: "heading",
        content: heading[2]?.trim() ?? "",
        level: (heading[1]?.length ?? 1) as 1 | 2 | 3
      });
      index += 1;
      continue;
    }

    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ kind: "rule" });
      index += 1;
      continue;
    }

    if (isTableRow(line) && isTableDivider(lines[index + 1] ?? "")) {
      const rows = [splitTableRow(line)];
      index += 2;
      while (index < lines.length && isTableRow(lines[index] ?? "")) {
        rows.push(splitTableRow(lines[index] ?? ""));
        index += 1;
      }
      const columnCount = rows[0]?.length ?? 0;
      blocks.push({
        kind: "table",
        rows: rows.map((row) =>
          Array.from({ length: columnCount }, (_, cellIndex) => row[cellIndex] ?? "")
        )
      });
      continue;
    }

    const listItem = matchListItem(line);
    if (listItem) {
      const items: string[] = [];
      const ordered = listItem.ordered;
      while (index < lines.length) {
        const nextItem = matchListItem(lines[index] ?? "");
        if (!nextItem || nextItem.ordered !== ordered) break;
        items.push(nextItem.content);
        index += 1;
      }
      blocks.push({ kind: "list", items, ordered });
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index] ?? "")) {
        quoteLines.push((lines[index] ?? "").replace(/^\s*>\s?/, ""));
        index += 1;
      }
      blocks.push({ kind: "quote", content: quoteLines.join("\n") });
      continue;
    }

    const paragraphLines = [line.trim()];
    index += 1;
    while (index < lines.length && !startsMarkdownBlock(lines, index)) {
      paragraphLines.push((lines[index] ?? "").trim());
      index += 1;
    }
    blocks.push({ kind: "paragraph", content: paragraphLines.filter(Boolean).join(" ") });
  }

  return blocks;
}

function startsMarkdownBlock(lines: string[], index: number) {
  const line = lines[index] ?? "";
  return (
    !line.trim() ||
    /^\s*```/.test(line) ||
    /^\s*#{1,3}\s+/.test(line) ||
    /^\s*>\s?/.test(line) ||
    /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line) ||
    (isTableRow(line) && isTableDivider(lines[index + 1] ?? "")) ||
    Boolean(matchListItem(line))
  );
}

function matchListItem(line: string) {
  const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
  if (unordered) return { content: unordered[1]?.trim() ?? "", ordered: false };
  const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
  return ordered ? { content: ordered[1]?.trim() ?? "", ordered: true } : null;
}

function isTableRow(line: string) {
  return line.includes("|");
}

function isTableDivider(line: string) {
  const cells = splitTableRow(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function splitTableRow(line: string) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function renderInlineMarkdown(content: string): ReactNode[] {
  const pattern = /(\[([^\]]+)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)|`([^`\n]+)`|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|\*([^*]+)\*|_([^_]+)_)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) nodes.push(content.slice(lastIndex, match.index));
    const [whole, , linkText, rawHref, title, inlineCode, boldA, boldB, strike, italicA, italicB] = match;
    if (rawHref && linkText) {
      const href = safeMarkdownHref(rawHref);
      nodes.push(href ? (
        <a href={href} key={`inline-${key++}`} rel="noreferrer" target="_blank" title={title}>
          {linkText}
        </a>
      ) : linkText);
    } else if (inlineCode) {
      nodes.push(<code key={`inline-${key++}`}>{inlineCode}</code>);
    } else if (boldA || boldB) {
      nodes.push(<strong key={`inline-${key++}`}>{boldA ?? boldB}</strong>);
    } else if (strike) {
      nodes.push(<del key={`inline-${key++}`}>{strike}</del>);
    } else if (italicA || italicB) {
      nodes.push(<em key={`inline-${key++}`}>{italicA ?? italicB}</em>);
    } else {
      nodes.push(whole);
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < content.length) nodes.push(content.slice(lastIndex));
  return nodes;
}

function safeMarkdownHref(href: string) {
  const trimmed = href.trim();
  return /^(https?:|mailto:|\/|#)/i.test(trimmed) ? trimmed : null;
}

function formatLanguageLabel(language: string) {
  const normalized = language.trim().toLowerCase();
  const labels: Record<string, string> = {
    css: "CSS",
    frag: "GLSL",
    glsl: "GLSL",
    html: "HTML",
    js: "JavaScript",
    javascript: "JavaScript",
    json: "JSON",
    jsx: "JSX",
    py: "Python",
    python: "Python",
    ts: "TypeScript",
    tsx: "TSX"
  };
  return labels[normalized] ?? (normalized ? normalized.toUpperCase() : "Code");
}
