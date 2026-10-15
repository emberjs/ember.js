import { EntityParser, HTML5NamedCharRefs as namedCharRefs } from 'simple-html-tokenizer';

const HEX_CHAR_REF = /^#[xX]([A-Fa-f0-9]+)$/u;
const DECIMAL_CHAR_REF = /^#([0-9]+)$/u;

// https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state
// Code points 0x80-0x9F are reinterpreted as Windows-1252, as browsers do.
const C1_REPLACEMENTS: Record<number, number> = {
  0x80: 0x20ac,
  0x82: 0x201a,
  0x83: 0x0192,
  0x84: 0x201e,
  0x85: 0x2026,
  0x86: 0x2020,
  0x87: 0x2021,
  0x88: 0x02c6,
  0x89: 0x2030,
  0x8a: 0x0160,
  0x8b: 0x2039,
  0x8c: 0x0152,
  0x8e: 0x017d,
  0x91: 0x2018,
  0x92: 0x2019,
  0x93: 0x201c,
  0x94: 0x201d,
  0x95: 0x2022,
  0x96: 0x2013,
  0x97: 0x2014,
  0x98: 0x02dc,
  0x99: 0x2122,
  0x9a: 0x0161,
  0x9b: 0x203a,
  0x9c: 0x0153,
  0x9e: 0x017e,
  0x9f: 0x0178,
};

export function decodeNumericCharRef(codePoint: number): string {
  if (codePoint === 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
    return '\uFFFD';
  }

  return String.fromCodePoint(C1_REPLACEMENTS[codePoint] ?? codePoint);
}

/**
 * simple-html-tokenizer decodes numeric character references with
 * `String.fromCharCode`, which truncates astral code points to 16 bits and
 * skips the replacements browsers apply. This decodes them the way an HTML
 * parser does, so `&#128512;` in a template means the same thing it means in
 * an `.html` file.
 */
export class HTMLEntityParser extends EntityParser {
  constructor() {
    super(namedCharRefs);
  }

  override parse(entity: string): string | undefined {
    let match = HEX_CHAR_REF.exec(entity);
    if (match) return decodeNumericCharRef(parseInt(match[1] as string, 16));

    match = DECIMAL_CHAR_REF.exec(entity);
    if (match) return decodeNumericCharRef(parseInt(match[1] as string, 10));

    return super.parse(entity);
  }
}
