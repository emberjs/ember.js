import { describe, it, expect } from 'vitest';
import {
  pascalToKebab,
  isAllDigits,
  hasUpperCase,
  dasherize,
  splitWhitespace,
  doubleColonToSlash,
} from '../utils';

describe('pascalToKebab', () => {
  it('converts PascalCase to kebab-case', () => {
    expect(pascalToKebab('FooBar')).toBe('foo-bar');
  });

  it('handles consecutive uppercase followed by lowercase (HTMLElement)', () => {
    expect(pascalToKebab('HTMLElement')).toBe('html-element');
  });

  it('converts single PascalCase word', () => {
    expect(pascalToKebab('Foo')).toBe('foo');
  });

  it('handles consecutive uppercase abbreviation before lowercase', () => {
    expect(pascalToKebab('ABCDef')).toBe('abc-def');
  });

  it('returns already-kebab strings unchanged', () => {
    expect(pascalToKebab('link-to')).toBe('link-to');
  });

  it('lowercases a single uppercase word', () => {
    expect(pascalToKebab('Hello')).toBe('hello');
  });

  it('handles all-lowercase input unchanged', () => {
    expect(pascalToKebab('foobar')).toBe('foobar');
  });

  it('returns empty string for empty input', () => {
    expect(pascalToKebab('')).toBe('');
  });

  it('handles single character', () => {
    expect(pascalToKebab('A')).toBe('a');
    expect(pascalToKebab('a')).toBe('a');
  });

  it('inserts dash between digit and uppercase', () => {
    expect(pascalToKebab('item1Foo')).toBe('item1-foo');
  });

  it('handles XBlah (common component prefix)', () => {
    expect(pascalToKebab('XBlah')).toBe('x-blah');
  });
});

describe('isAllDigits', () => {
  it('returns true for all-digit strings', () => {
    expect(isAllDigits('123')).toBe(true);
  });

  it('returns false for mixed string', () => {
    expect(isAllDigits('12a')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isAllDigits('')).toBe(false);
  });

  it('returns true for single zero', () => {
    expect(isAllDigits('0')).toBe(true);
  });

  it('returns true for single digit', () => {
    expect(isAllDigits('9')).toBe(true);
  });

  it('returns false for letters only', () => {
    expect(isAllDigits('abc')).toBe(false);
  });

  it('returns false for space-padded digits', () => {
    expect(isAllDigits(' 123 ')).toBe(false);
  });
});

describe('hasUpperCase', () => {
  it('returns true when string starts with uppercase', () => {
    expect(hasUpperCase('Foo')).toBe(true);
  });

  it('returns false for all-lowercase', () => {
    expect(hasUpperCase('foo')).toBe(false);
  });

  it('returns true for camelCase', () => {
    expect(hasUpperCase('fooBar')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(hasUpperCase('')).toBe(false);
  });

  it('returns false for digits only', () => {
    expect(hasUpperCase('123')).toBe(false);
  });

  it('returns true for single uppercase letter', () => {
    expect(hasUpperCase('A')).toBe(true);
  });
});

describe('dasherize', () => {
  it('converts camelCase to kebab-case', () => {
    expect(dasherize('camelCase')).toBe('camel-case');
  });

  it('converts multiword camelCase', () => {
    expect(dasherize('fooBarBaz')).toBe('foo-bar-baz');
  });

  it('returns lowercase string unchanged', () => {
    expect(dasherize('foo')).toBe('foo');
  });

  it('returns empty string for empty input', () => {
    expect(dasherize('')).toBe('');
  });

  it('handles leading uppercase (PascalCase) without leading dash', () => {
    // Leading uppercase does NOT get a dash before it
    expect(dasherize('FooBar')).toBe('foo-bar');
  });

  it('handles digit before uppercase', () => {
    expect(dasherize('item1Foo')).toBe('item1-foo');
  });

  it('does not insert dashes between consecutive uppercase', () => {
    // Consecutive uppercase chars: only inserts dash between lowercase->uppercase
    expect(dasherize('ABC')).toBe('abc');
  });
});

describe('splitWhitespace', () => {
  it('splits on spaces', () => {
    expect(splitWhitespace('a b c')).toEqual(['a', 'b', 'c']);
  });

  it('trims and collapses whitespace', () => {
    expect(splitWhitespace('  a  ')).toEqual(['a']);
  });

  it('returns empty array for empty string', () => {
    expect(splitWhitespace('')).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(splitWhitespace('   ')).toEqual([]);
  });

  it('handles tabs and newlines', () => {
    expect(splitWhitespace("a\tb\nc")).toEqual(['a', 'b', 'c']);
  });

  it('handles single word', () => {
    expect(splitWhitespace('hello')).toEqual(['hello']);
  });

  it('handles multiple consecutive spaces between words', () => {
    expect(splitWhitespace('a    b')).toEqual(['a', 'b']);
  });
});

describe('doubleColonToSlash', () => {
  it('replaces :: with /', () => {
    expect(doubleColonToSlash('Foo::Bar')).toBe('Foo/Bar');
  });

  it('returns string with no colons unchanged', () => {
    expect(doubleColonToSlash('no-colons')).toBe('no-colons');
  });

  it('handles multiple :: separators', () => {
    expect(doubleColonToSlash('A::B::C')).toBe('A/B/C');
  });

  it('handles empty string', () => {
    expect(doubleColonToSlash('')).toBe('');
  });

  it('does not replace single colons', () => {
    expect(doubleColonToSlash('a:b')).toBe('a:b');
  });

  it('handles :: at start and end', () => {
    expect(doubleColonToSlash('::Foo::')).toBe('/Foo/');
  });
});
