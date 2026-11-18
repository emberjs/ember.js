import type * as ASTv1 from '../v1/api';

const Char = {
  NBSP: 0xa0,
  QUOT: 0x22,
  LT: 0x3c,
  GT: 0x3e,
  AMP: 0x26,
};

// \x26 is ampersand, \xa0 is non-breaking space
const ATTR_VALUE_REGEX_TEST = /["\x26\xa0]/u;
const ATTR_VALUE_REGEX_REPLACE = new RegExp(ATTR_VALUE_REGEX_TEST.source, 'gu');

const TEXT_REGEX_TEST = /[&<>\xa0]/u;
const TEXT_REGEX_REPLACE = new RegExp(TEXT_REGEX_TEST.source, 'gu');

function attrValueReplacer(char: string): string {
  switch (char.charCodeAt(0)) {
    case Char.NBSP:
      return '&nbsp;';
    case Char.QUOT:
      return '&quot;';
    case Char.AMP:
      return '&amp;';
    default:
      return char;
  }
}

function textReplacer(char: string): string {
  switch (char.charCodeAt(0)) {
    case Char.NBSP:
      return '&nbsp;';
    case Char.AMP:
      return '&amp;';
    case Char.LT:
      return '&lt;';
    case Char.GT:
      return '&gt;';
    default:
      return char;
  }
}

export function escapeAttrValue(attrValue: string): string {
  if (ATTR_VALUE_REGEX_TEST.test(attrValue)) {
    return attrValue.replace(ATTR_VALUE_REGEX_REPLACE, attrValueReplacer);
  }
  return attrValue;
}

export function escapeText(text: string): string {
  if (TEXT_REGEX_TEST.test(text)) {
    return text.replace(TEXT_REGEX_REPLACE, textReplacer);
  }
  return text;
}

/**
 * What the printer writes on one side of a run of text.
 *
 * - `mustache`: `{{` or `}}` of a statement
 * - `escaped`: text that starts with `{{`, which prints as `\{{`
 * - `other`: anything else, or nothing
 */
export type TextNeighbor = 'mustache' | 'escaped' | 'other';

/**
 * Handlebars reads text before HTML does:
 *
 *   `{{x}}`   → a mustache
 *   `\{{x}}`  → the text `{{x}}`
 *   `\\{{x}}` → the text `\`, then a mustache
 *
 * Text that Handlebars cannot express (a `\` right before a literal `{{`,
 * a `{` right before a mustache, a `}` right after one)
 * uses an HTML entity.
 */
export function escapeMustaches(text: string, before: TextNeighbor, after: TextNeighbor): string {
  let pieces = text.split('{{');
  let last = pieces.length - 1;
  let result = '';

  for (let i = 0; i <= last; i++) {
    let piece = pieces[i] as string;

    if (i === 0 && before === 'mustache' && piece.startsWith('}')) {
      piece = `&#125;${piece.slice(1)}`;
    }

    if (i < last) {
      result += `${encodeTrailing(piece, '\\', '&#92;')}\\{{`;
    } else if (after === 'mustache') {
      result += piece.endsWith('\\') ? `${piece}\\` : encodeTrailing(piece, '{', '&#123;');
    } else if (after === 'escaped') {
      result += encodeTrailing(piece, '\\', '&#92;');
    } else {
      result += piece;
    }
  }

  return result;
}

function encodeTrailing(piece: string, char: string, entity: string): string {
  return piece.endsWith(char) ? `${piece.slice(0, -1)}${entity}` : piece;
}

/**
 * A Handlebars ID token: any run of characters that are not syntax.
 *
 * Literal keywords and numbers lex as literals, not IDs.
 */
const ID_SEGMENT = /^[^\s!"#%-,./;->@[-^`{-~]+$/u;
const LITERAL_SEGMENT = /^(?:true|false|null|undefined|-?\d+)$/u;

/**
 * Wraps a path segment in `[...]` when it is not a plain ID,
 * for example `[bar baz]`, `[bar.baz]`, or `[0]`.
 */
export function printPathSegment(segment: string): string {
  if (ID_SEGMENT.test(segment) && !LITERAL_SEGMENT.test(segment)) {
    return segment;
  }

  return `[${segment.replace(/[\\\]]/gu, '\\$&')}]`;
}

export function sortByLoc(a: ASTv1.Node, b: ASTv1.Node): -1 | 0 | 1 {
  // If either is invisible, don't try to order them
  if (a.loc.isInvisible || b.loc.isInvisible) {
    return 0;
  }

  if (a.loc.startPosition.line < b.loc.startPosition.line) {
    return -1;
  }

  if (
    a.loc.startPosition.line === b.loc.startPosition.line &&
    a.loc.startPosition.column < b.loc.startPosition.column
  ) {
    return -1;
  }

  if (
    a.loc.startPosition.line === b.loc.startPosition.line &&
    a.loc.startPosition.column === b.loc.startPosition.column
  ) {
    return 0;
  }

  return 1;
}
