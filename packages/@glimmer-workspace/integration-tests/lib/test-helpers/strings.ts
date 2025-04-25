export function strip(strings: TemplateStringsArray, ...args: string[]) {
  return strings
    .map((str: string, i: number) => {
      return `${str
        .split('\n')
        .map((s) => s.trim())
        .join('')}${args[i] ? args[i] : ''}`;
    })
    .join('');
}

export function stripTight(strings: TemplateStringsArray) {
  const [first] = strings;
  if (!first) return '';

  return first
    .split('\n')
    .map((s) => s.trim())
    .join('');
}

export function trimLines(strings: TemplateStringsArray) {
  const [first] = strings;
  if (!first) return '';

  return first
    .trim()
    .split('\n')
    .map((s) => s.trim())
    .join('\n');
}
