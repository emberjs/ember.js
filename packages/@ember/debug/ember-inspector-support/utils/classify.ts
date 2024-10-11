const STRING_CLASSIFY_REGEXP_1 = /^([-_])+(.)?/;
const STRING_CLASSIFY_REGEXP_2 = /(.)(-|_|\.|\s)+(.)?/g;
const STRING_CLASSIFY_REGEXP_3 = /(^|\/|\.)([a-z])/g;

export default function classify(str: string) {
  let replace1 = (_match: string, _separator: string, chr?: string) =>
    chr ? `_${chr.toUpperCase()}` : '';
  let replace2 = (_match: string, initialChar: string, _separator: string, chr?: string) =>
    initialChar + (chr ? chr.toUpperCase() : '');
  let parts = str.split('/');

  for (let i = 0; i < parts.length; i++) {
    parts[i] = parts[i]!.replace(STRING_CLASSIFY_REGEXP_1, replace1).replace(
      STRING_CLASSIFY_REGEXP_2,
      replace2
    );
  }

  return parts
    .join('/')
    .replace(STRING_CLASSIFY_REGEXP_3, (match: string /*, separator, chr */) =>
      match.toUpperCase()
    );
}
