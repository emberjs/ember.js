export const OPEN: { marker: 'open-block' } = { marker: 'open-block' };
export const CLOSE: { marker: 'close-block' } = { marker: 'close-block' };
export const SEP: { marker: '|' } = { marker: '|' };
export const EMPTY: { marker: ' ' } = { marker: ' ' };
export type Content = string | typeof OPEN | typeof CLOSE | typeof SEP | typeof EMPTY;

export function content(list: Content[]): string {
  let out: string[] = [];
  let depth = 0;

  list.forEach((item) => {
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

/**
 * Loose templates are rendered as a component's layout (`renderLooseTemplate`), and a component
 * invocation opens a block of its own in the serialize builder. SSR markers are implementation
 * defined, so this is the one place that knows about it: block ids of expected output (which
 * are written as if the template were the root) move up by one.
 */
export function shiftBlockIds(expected: string): string {
  return expected.replace(/<!--%([+-])b:(\d+)%-->/gu, (_m, sign: string, id: string) =>
    Number(id) === 0 ? _m : `<!--%${sign}b:${Number(id) + 1}%-->`
  );
}

/**
 * Wraps expected server output in the root component's block pair: `+b:0 ... -b:0` becomes
 * `+b:0 +b:1 ... -b:1 -b:0`, and the ids between shift by one (`shiftBlockIds`).
 */
export function withRoot(expected: string): string {
  let shifted = shiftBlockIds(expected);
  let open = '<!--%+b:0%-->';
  let close = '<!--%-b:0%-->';
  let first = shifted.indexOf(open);
  let last = shifted.lastIndexOf(close);

  if (first === -1 || last === -1) return shifted;

  return (
    shifted.slice(0, first + open.length) +
    '<!--%+b:1%-->' +
    shifted.slice(first + open.length, last) +
    '<!--%-b:1%-->' +
    shifted.slice(last)
  );
}
