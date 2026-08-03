const technicalPrefixes = /^(?:p5(?:\.|\b)|three\.js\b|glsl\b)/i;


export function formatUiStatusLabel(value: string) {
  if (!value || technicalPrefixes.test(value.trim())) {
    return value;
  }

  return value.replace(/^(\s*)(\p{Ll})/u, (_match, spacing: string, letter: string) =>
    `${spacing}${letter.toLocaleUpperCase()}`
  );
}
