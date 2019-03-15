export function strip(strings: TemplateStringsArray, ...args: string[]) {
  return strings
    .map((str: string, i: number) => {
      return `${str
        .split('\n')
        .map(s => s.trim())
        .join('')}${args[i] ? args[i] : ''}`;
    })
    .join('');
}

export function stripTight(strings: TemplateStringsArray) {
  return strings[0]
    .split('\n')
    .map(s => s.trim())
    .join('');
}

export function trimLines(strings: TemplateStringsArray) {
  return strings[0]
    .trim()
    .split('\n')
    .map(s => s.trim())
    .join('\n');
}
