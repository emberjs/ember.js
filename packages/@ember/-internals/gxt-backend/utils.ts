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

/**
 * Parse {{#in-element dest insertBefore=expr}} and replace with {{#in-element dest}}.
 * Returns { result: string, insertBefore: string | null }.
 *
 * Runs on the template SOURCE before the GXT compiler parses it (the
 * `insertBefore` hash pair must be extracted structurally because the GXT
 * `$_inElement` runtime takes it out-of-band — see compile.ts, which threads
 * the extracted expression through `_inElementInsertBefore`). Lives here
 * (zero-dependency module) so the node vitest gate can unit-test it without
 * pulling in compile.ts's full module graph.
 */
export function parseInElementInsertBefore(template: string): {
  result: string;
  insertBefore: string | null;
} {
  const marker = '{{#in-element';
  let insertBefore: string | null = null;
  let idx = template.indexOf(marker);
  if (idx === -1) return { result: template, insertBefore: null };

  let result = '';
  let searchFrom = 0;
  while (idx !== -1) {
    let pos = idx + marker.length;
    // Skip whitespace
    while (pos < template.length && (template[pos] === ' ' || template[pos] === '\t')) pos++;
    // Read dest (non-whitespace, non-})
    const destStart = pos;
    while (
      pos < template.length &&
      template[pos] !== ' ' &&
      template[pos] !== '\t' &&
      template[pos] !== '}'
    )
      pos++;
    const dest = template.slice(destStart, pos);
    // Skip whitespace
    while (pos < template.length && (template[pos] === ' ' || template[pos] === '\t')) pos++;
    // Check for insertBefore=
    const ibMarker = 'insertBefore=';
    if (
      pos + ibMarker.length <= template.length &&
      template.slice(pos, pos + ibMarker.length) === ibMarker
    ) {
      pos += ibMarker.length;
      const exprStart = pos;
      // A quoted value may contain `}` or whitespace (insertBefore="a}b");
      // scan to the closing quote so a brace inside the string can neither
      // truncate the captured value nor leave `insertBefore=` residue in the
      // rewritten template. Unquoted values keep the bare-token scan.
      const quote = template[pos];
      if (quote === '"' || quote === "'") {
        pos++;
        while (pos < template.length && template[pos] !== quote) pos++;
        if (pos < template.length) pos++; // include the closing quote
      } else {
        while (
          pos < template.length &&
          template[pos] !== ' ' &&
          template[pos] !== '\t' &&
          template[pos] !== '}'
        )
          pos++;
      }
      insertBefore = template.slice(exprStart, pos);
      // Skip whitespace
      while (pos < template.length && (template[pos] === ' ' || template[pos] === '\t')) pos++;
      // Skip }}
      if (pos + 1 < template.length && template[pos] === '}' && template[pos + 1] === '}') {
        result += template.slice(searchFrom, idx) + `{{#in-element ${dest}}}`;
        searchFrom = pos + 2;
      } else {
        result += template.slice(searchFrom, pos);
        searchFrom = pos;
      }
    } else {
      // No insertBefore, leave as-is
      result += template.slice(searchFrom, pos);
      searchFrom = pos;
    }
    idx = template.indexOf(marker, searchFrom);
  }
  result += template.slice(searchFrom);
  return { result, insertBefore };
}

// Inline the style warning message to avoid importing @ember/-internals/views
// (which can cause circular dependency issues during module initialization).
export function constructStyleDeprecationMessage(affectedStyle: string): string {
  return (
    'Binding style attributes may introduce cross-site scripting vulnerabilities; ' +
    'please ensure that values being bound are properly escaped. For more information, ' +
    'including how to disable this warning, see ' +
    'https://deprecations.emberjs.com/v1.x/#toc_binding-style-attributes. ' +
    'Style affected: "' +
    affectedStyle +
    '"'
  );
}

// Helper to detect assertion-related throws that must escape catch blocks.
// The expectAssertion test helper throws a non-Error sentinel (BREAK = {})
// when a stubbed assert fires. Also re-throws actual Assertion Failed errors.
export function isAssertionLike(e: unknown): boolean {
  if (e instanceof Error) {
    return e.message?.includes('Assertion Failed') === true;
  }
  // Non-Error, non-null/undefined objects may be the BREAK sentinel from expectAssertion.
  if (e !== null && e !== undefined && typeof e === 'object') return true;
  return false;
}
