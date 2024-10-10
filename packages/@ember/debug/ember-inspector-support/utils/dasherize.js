const STRING_DASHERIZE_REGEXP = /[ _]/g;

export default function dasherize(str) {
  return str.replace(STRING_DASHERIZE_REGEXP, '-');
}
