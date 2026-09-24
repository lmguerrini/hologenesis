const technicalPrefixes = /^(?:p5(?:\.|\b)|three\.js\b|glsl\b)/i;

/* Leading words that stay uppercase after de-snake-casing; everything else
 * ("NOT_AVAILABLE" reads "Not available") is ordinary label copy. */
const leadingAcronyms = new Set([
  "AI",
  "API",
  "CSS",
  "GPU",
  "HTML",
  "HTTP",
  "JS",
  "JSON",
  "SQL",
  "TS",
  "UI",
  "URL",
  "UX"
]);


export function formatUiStatusLabel(value: string) {
  if (!value || technicalPrefixes.test(value.trim())) {
    return value;
  }

  return value.replace(/^(\s*)(\p{Ll})/u, (_match, spacing: string, letter: string) =>
    `${spacing}${letter.toLocaleUpperCase()}`
  );
}


export function formatEnumLabel(value: string) {
  const normalized = value.trim().toLowerCase().replace(/_/g, " ");
  if (technicalPrefixes.test(normalized)) {
    return normalized;
  }

  const firstWord = value.trim().split(/[\s_]+/)[0] ?? "";
  if (leadingAcronyms.has(firstWord)) {
    return `${firstWord}${normalized.slice(firstWord.length)}`;
  }

  return formatUiStatusLabel(normalized);
}
