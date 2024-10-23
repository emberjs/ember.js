const STRING_DASHERIZE_REGEXP = /[ _]/g;

export default function dasherize(str: string) {
  return str.replace(STRING_DASHERIZE_REGEXP, '-');
}
