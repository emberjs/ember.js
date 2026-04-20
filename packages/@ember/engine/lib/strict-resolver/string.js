const STRING_DASHERIZE_REGEXP = /[ _]/g;
const STRING_DECAMELIZE_REGEXP = /([a-z\d])([A-Z])/g;

export function dasherize(str) {
  return str
    .replace(STRING_DECAMELIZE_REGEXP, '$1_$2')
    .toLowerCase()
    .replace(STRING_DASHERIZE_REGEXP, '-');
}
