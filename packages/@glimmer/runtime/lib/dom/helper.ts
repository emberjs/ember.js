const WHITESPACE =
  /[\t\n\v\f\r \xa0\u{1680}\u{180e}\u{2000}-\u{200a}\u{2028}\u{2029}\u{202f}\u{205f}\u{3000}\u{feff}]/u;

export function isWhitespace(string: string) {
  return WHITESPACE.test(string);
}
