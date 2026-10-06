export type SyntaxTokenKind =
  | "keyword"
  | "type"
  | "string"
  | "number"
  | "comment"
  | "function"
  | "property"
  | "variable"
  | "operator"
  | "punctuation";

export type SyntaxToken = { kind: SyntaxTokenKind; text: string };

const keywordWords = new Set(
  "as async await break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return static switch throw try typeof var void while with yield def lambda pass raise global nonlocal assert elif except is not and or self struct uniform attribute varying precision highp mediump lowp layout inout out discard main true false null undefined None"
    .split(/\s+/)
);
const typeWords = new Set(
  "boolean number string any unknown never void object interface type enum implements public private protected readonly abstract declare namespace module Promise Array Map Set Record Vector Vector2 Vector3 Vector4 Matrix mat2 mat3 mat4 float int uint bool vec2 vec3 vec4 ivec2 ivec3 ivec4 sampler2D"
    .split(/\s+/)
);
const languageLiterals = new Set(["true", "false", "null", "undefined", "None", "True", "False"]);

export function tokenizeCode(source: string, language = ""): SyntaxToken[] {
  const normalizedLanguage = language.toLowerCase().replace(/^language-/, "");
  const tokens: SyntaxToken[] = [];
  let index = 0;
  let previousSignificant = "";

  const push = (kind: SyntaxTokenKind, text: string) => {
    tokens.push({ kind, text });
    if (text.trim()) previousSignificant = text;
  };

  while (index < source.length) {
    const rest = source.slice(index);
    const char = source[index] ?? "";
    const python = normalizedLanguage === "py" || normalizedLanguage === "python";
    const cssOrHtml = ["css", "html", "xml", "scss"].includes(normalizedLanguage);

    if (normalizedLanguage === "html" && rest.startsWith("<!--")) {
      const end = source.indexOf("-->", index + 4);
      const commentEnd = end === -1 ? source.length : end + 3;
      push("comment", source.slice(index, commentEnd));
      index = commentEnd;
      continue;
    }

    // the whole remaining source (the unanchored `$` dropped every comment
    // that had more lines after it).
    const lineComment = rest.match(python ? /^#[^\n]*/ : /^\/\/[^\n]*/);
    if (lineComment) {
      push("comment", lineComment[0]);
      index += lineComment[0].length;
      continue;
    }
    const blockComment = rest.match(/^\/\*[\s\S]*?(?:\*\/|$)/);
    if (blockComment) {
      push("comment", blockComment[0]);
      index += blockComment[0].length;
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      let end = index + 1;
      while (end < source.length) {
        if (source[end] === "\\") {
          end += 2;
          continue;
        }
        if (source[end] === char) {
          end += 1;
          break;
        }
        end += 1;
      }
      const stringToken = source.slice(index, end);
      push(
        normalizedLanguage === "json" && /^\s*:/.test(source.slice(end))
          ? "property"
          : "string",
        stringToken
      );
      index = end;
      continue;
    }

    const number = rest.match(/^(?:0[xX][\da-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)(?:n)?/);
    if (number) {
      push("number", number[0]);
      index += number[0].length;
      continue;
    }

    const identifier = rest.match(/^[\p{L}_$][\p{L}\p{N}_$-]*/u);
    if (identifier) {
      const word = identifier[0];
      const next = source.slice(index + word.length).match(/^\s*(.)/)?.[1] ?? "";
      const isCall = /^\s*(?:\?\.)?\s*\(/.test(source.slice(index + word.length));
      const kind = languageLiterals.has(word)
        ? "keyword"
        : cssOrHtml && /^\s*[:=]/.test(source.slice(index + word.length))
          ? "property"
        : typeWords.has(word)
          ? "type"
          : cssOrHtml && previousSignificant === "<"
            ? "type"
            : keywordWords.has(word)
              ? "keyword"
            : isCall || next === "("
              ? "function"
              : previousSignificant === "."
                ? "property"
              : "variable";
      push(kind, word);
      index += word.length;
      continue;
    }

    const operator = rest.match(/^(?:===|!==|=>|==|!=|<=|>=|\+\+|--|&&|\|\||\?\?|\+=|-=|\*=|\/=|\*\*|::|->|<<|>>|[=+*/%<>!&|^~?:-])/);
    if (operator) {
      push("operator", operator[0]);
      index += operator[0].length;
      continue;
    }

    if (/[{}()[\].,;#<>]/.test(char)) {
      push("punctuation", char);
      index += 1;
      continue;
    }

    push("punctuation", char);
    index += 1;
  }

  return tokens;
}
