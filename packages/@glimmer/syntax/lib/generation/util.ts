const enum Char {
  NBSP = 0xa0,
  QUOT = 0x22,
  LT = 0x3c,
  GT = 0x3e,
  AMP = 0x26,
}

const ATTR_VALUE_REGEX_TEST = /[\xA0"&]/;
const ATTR_VALUE_REGEX_REPLACE = new RegExp(ATTR_VALUE_REGEX_TEST.source, 'g');

const TEXT_REGEX_TEST = /[\xA0&<>]/;
const TEXT_REGEX_REPLACE = new RegExp(TEXT_REGEX_TEST.source, 'g');

function attrValueReplacer(char: string) {
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

function textReplacer(char: string) {
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

export function escapeAttrValue(attrValue: string) {
  if (ATTR_VALUE_REGEX_TEST.test(attrValue)) {
    return attrValue.replace(ATTR_VALUE_REGEX_REPLACE, attrValueReplacer);
  }
  return attrValue;
}

export function escapeText(text: string) {
  if (TEXT_REGEX_TEST.test(text)) {
    return text.replace(TEXT_REGEX_REPLACE, textReplacer);
  }
  return text;
}
