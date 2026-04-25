/**
 * Shared utility functions for the GXT compat layer.
 * All functions are regex-free.
 */

/** Convert PascalCase/camelCase to kebab-case without regex */
export function pascalToKebab(str: string): string {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]!;
    if (ch >= 'A' && ch <= 'Z') {
      if (i > 0 && str[i - 1]! >= 'a' && str[i - 1]! <= 'z') result += '-';
      if (i > 0 && str[i - 1]! >= '0' && str[i - 1]! <= '9') result += '-';
      if (
        i > 0 &&
        str[i - 1]! >= 'A' &&
        str[i - 1]! <= 'Z' &&
        i + 1 < str.length &&
        str[i + 1]! >= 'a' &&
        str[i + 1]! <= 'z'
      )
        result += '-';
      result += ch.toLowerCase();
    } else {
      result += ch;
    }
  }
  return result;
}

/** Check if a string is all digits without regex */
export function isAllDigits(str: string): boolean {
  if (str.length === 0) return false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i]!;
    if (c < '0' || c > '9') return false;
  }
  return true;
}

/** Check if a string contains any uppercase letter without regex */
export function hasUpperCase(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    const c = str[i]!;
    if (c >= 'A' && c <= 'Z') return true;
  }
  return false;
}

/** Dasherize a camelCase string without regex: 'fooBar' -> 'foo-bar'
 * Only inserts a dash when the previous char is a lowercase letter or digit,
 * matching the behavior of str.replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase()
 */
export function dasherize(str: string): string {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]!;
    if (ch >= 'A' && ch <= 'Z') {
      if (i > 0) {
        const prev = str[i - 1]!;
        if ((prev >= 'a' && prev <= 'z') || (prev >= '0' && prev <= '9')) {
          result += '-';
        }
      }
      result += ch.toLowerCase();
    } else {
      result += ch;
    }
  }
  return result;
}

/** Split a string by whitespace, filtering empty entries, without regex */
export function splitWhitespace(str: string): string[] {
  const result: string[] = [];
  let current = '';
  for (let i = 0; i < str.length; i++) {
    const c = str[i]!;
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      if (current.length > 0) {
        result.push(current);
        current = '';
      }
    } else {
      current += c;
    }
  }
  if (current.length > 0) {
    result.push(current);
  }
  return result;
}

/** Replace all occurrences of '::' with '/' without regex */
export function doubleColonToSlash(str: string): string {
  return str.split('::').join('/');
}
