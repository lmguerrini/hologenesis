import { describe, expect, it } from "vitest";
import { tokenizeCode } from "./syntax-highlight";

describe("tokenizeCode", () => {
  it("highlights JavaScript and TypeScript token families without changing source text", () => {
    const source = "const amount: number = scene.count; draw(12); // frame count";
    const tokens = tokenizeCode(source, "typescript");

    expect(tokens.map((token) => token.text).join("")).toBe(source);
    expect(tokens).toEqual(expect.arrayContaining([
      { kind: "keyword", text: "const" },
      { kind: "type", text: "number" },
      { kind: "property", text: "count" },
      { kind: "function", text: "draw" },
      { kind: "number", text: "12" },
      { kind: "comment", text: "// frame count" }
    ]));
  });

  it("recognizes Python comments, functions and strings", () => {
    const tokens = tokenizeCode("def render():\n  return tone.play('ready') # start", "python");

    expect(tokens).toEqual(expect.arrayContaining([
      { kind: "keyword", text: "def" },
      { kind: "function", text: "render" },
      { kind: "function", text: "play" },
      { kind: "string", text: "'ready'" },
      { kind: "comment", text: "# start" }
    ]));
  });

  it("colors JSON values and preserves JSON punctuation", () => {
    const source = '{"visible": true, "count": 3}';
    const tokens = tokenizeCode(source, "json");

    expect(tokens.map((token) => token.text).join("")).toBe(source);
    expect(tokens).toEqual(expect.arrayContaining([
      { kind: "property", text: '"visible"' },
      { kind: "keyword", text: "true" },
      { kind: "number", text: "3" }
    ]));
  });

  it("recognizes GLSL types and operators for an unknown language fallback", () => {
    const tokens = tokenizeCode("vec3 color = normalize(position);", "glsl");

    expect(tokens).toEqual(expect.arrayContaining([
      { kind: "type", text: "vec3" },
      { kind: "function", text: "normalize" },
      { kind: "operator", text: "=" }
    ]));
  });

  it("handles CSS properties and HTML tags, attributes and comments", () => {
    const css = tokenizeCode(".panel { color: red; }", "css");
    const html = tokenizeCode("<!-- card --><main class='panel'>", "html");

    expect(css).toContainEqual({ kind: "property", text: "color" });
    expect(html).toEqual(expect.arrayContaining([
      { kind: "comment", text: "<!-- card -->" },
      { kind: "type", text: "main" },
      { kind: "property", text: "class" },
      { kind: "string", text: "'panel'" }
    ]));
  });
});
