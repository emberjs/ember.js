const STRING_CLASSIFY_REGEXP_1 = /^(\-|_)+(.)?/;
const STRING_CLASSIFY_REGEXP_2 = /(.)(\-|\_|\.|\s)+(.)?/g;
const STRING_CLASSIFY_REGEXP_3 = /(^|\/|\.)([a-z])/g;

export default function classify(str) {
  let replace1 = (_match, _separator, chr) =>
    chr ? `_${chr.toUpperCase()}` : '';
  let replace2 = (_match, initialChar, _separator, chr) =>
    initialChar + (chr ? chr.toUpperCase() : '');
  let parts = str.split('/');

  for (let i = 0; i < parts.length; i++) {
    parts[i] = parts[i]
      .replace(STRING_CLASSIFY_REGEXP_1, replace1)
      .replace(STRING_CLASSIFY_REGEXP_2, replace2);
  }

  return parts
    .join('/')
    .replace(STRING_CLASSIFY_REGEXP_3, (match /*, separator, chr */) =>
      match.toUpperCase()
    );
}
