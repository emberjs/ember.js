export const OPEN: { marker: 'open-block' } = { marker: 'open-block' };
export const CLOSE: { marker: 'close-block' } = { marker: 'close-block' };
export const SEP: { marker: '|' } = { marker: '|' };
export const EMPTY: { marker: ' ' } = { marker: ' ' };
export type Content = string | typeof OPEN | typeof CLOSE | typeof SEP | typeof EMPTY;

export function content(list: Content[]): string {
  let out: string[] = [];
  let depth = 0;

  list.forEach(item => {
    if (typeof item === 'string') {
      out.push(item);
    } else if (item.marker === 'open-block') {
      out.push(`<!--%+b:${depth++}%-->`);
    } else if (item.marker === 'close-block') {
      out.push(`<!--%-b:${--depth}%-->`);
    } else {
      out.push(`<!--%${item.marker}%-->`);
    }
  });

  return out.join('');
}
