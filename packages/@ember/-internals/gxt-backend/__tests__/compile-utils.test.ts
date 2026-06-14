import { describe, it, expect } from 'vitest';
import { __test_internals as t } from '../compile';

// ============================================================
// hyphenToUnderscore
// ============================================================
describe('hyphenToUnderscore', () => {
  it('replaces hyphens with underscores', () => {
    expect(t.hyphenToUnderscore('foo-bar')).toBe('foo_bar');
  });

  it('handles multiple hyphens', () => {
    expect(t.hyphenToUnderscore('a-b-c')).toBe('a_b_c');
  });

  it('returns string without hyphens unchanged', () => {
    expect(t.hyphenToUnderscore('foobar')).toBe('foobar');
  });

  it('handles empty string', () => {
    expect(t.hyphenToUnderscore('')).toBe('');
  });
});

// ============================================================
// doubleDashToSlash
// ============================================================
describe('doubleDashToSlash', () => {
  it('replaces -- with /', () => {
    expect(t.doubleDashToSlash('foo--bar')).toBe('foo/bar');
  });

  it('handles multiple double dashes', () => {
    expect(t.doubleDashToSlash('a--b--c')).toBe('a/b/c');
  });

  it('does not replace single dashes', () => {
    expect(t.doubleDashToSlash('foo-bar')).toBe('foo-bar');
  });

  it('handles empty string', () => {
    expect(t.doubleDashToSlash('')).toBe('');
  });
});

// ============================================================
// containsWord
// ============================================================
describe('containsWord', () => {
  it('finds a word surrounded by non-word characters', () => {
    expect(t.containsWord('hello world', 'world')).toBe(true);
  });

  it('does not match word as substring of another word', () => {
    expect(t.containsWord('helloworld', 'world')).toBe(false);
  });

  it('matches word at start of string', () => {
    expect(t.containsWord('world is great', 'world')).toBe(true);
  });

  it('matches word at end of string', () => {
    expect(t.containsWord('hello world', 'world')).toBe(true);
  });

  it('matches standalone word', () => {
    expect(t.containsWord('world', 'world')).toBe(true);
  });

  it('does not match with underscore boundary', () => {
    // underscore is a word character
    expect(t.containsWord('foo_bar', 'foo')).toBe(false);
  });

  it('matches with dash boundary', () => {
    // dash is not a word character
    expect(t.containsWord('foo-bar', 'foo')).toBe(true);
  });

  it('returns false for empty text', () => {
    expect(t.containsWord('', 'word')).toBe(false);
  });

  it('matches word adjacent to special chars', () => {
    expect(t.containsWord('{{foo}}', 'foo')).toBe(true);
  });
});

// ============================================================
// countWord
// ============================================================
describe('countWord', () => {
  it('counts occurrences of a word', () => {
    expect(t.countWord('foo bar foo baz foo', 'foo')).toBe(3);
  });

  it('does not count substrings', () => {
    expect(t.countWord('foobar foo barfoo', 'foo')).toBe(1);
  });

  it('returns 0 when word not found', () => {
    expect(t.countWord('hello world', 'xyz')).toBe(0);
  });

  it('returns 0 for empty text', () => {
    expect(t.countWord('', 'foo')).toBe(0);
  });
});

// ============================================================
// replaceWord
// ============================================================
describe('replaceWord', () => {
  it('replaces word occurrences using callback', () => {
    const result = t.replaceWord('foo bar foo', 'foo', () => 'baz');
    expect(result).toBe('baz bar baz');
  });

  it('does not replace substring matches', () => {
    const result = t.replaceWord('foobar foo barfoo', 'foo', () => 'X');
    expect(result).toBe('foobar X barfoo');
  });

  it('returns original text when no match', () => {
    const result = t.replaceWord('hello world', 'xyz', () => 'Z');
    expect(result).toBe('hello world');
  });

  it('handles empty text', () => {
    const result = t.replaceWord('', 'foo', () => 'bar');
    expect(result).toBe('');
  });

  it('calls replacer for each match', () => {
    let callCount = 0;
    t.replaceWord('a b a', 'a', () => {
      callCount++;
      return String(callCount);
    });
    expect(callCount).toBe(2);
  });
});

// ============================================================
// generateUUID
// ============================================================
describe('generateUUID', () => {
  it('returns a string with UUID-like format (8-4-4-4-12 segments)', () => {
    const uuid = t.generateUUID();
    const parts = uuid.split('-');
    expect(parts.length).toBe(5);
    expect(parts[0]!.length).toBe(8);
    expect(parts[1]!.length).toBe(4);
    expect(parts[2]!.length).toBe(4);
    expect(parts[3]!.length).toBe(4);
    expect(parts[4]!.length).toBe(12);
  });

  it('contains version 4 marker', () => {
    const uuid = t.generateUUID();
    // Third segment should start with 4
    expect(uuid[14]).toBe('4');
  });

  it('only contains valid hex characters and dashes', () => {
    const uuid = t.generateUUID();
    for (const ch of uuid) {
      expect('0123456789abcdef-').toContain(ch);
    }
  });

  it('generates unique values', () => {
    const a = t.generateUUID();
    const b = t.generateUUID();
    expect(a).not.toBe(b);
  });

  it('starts with a letter (valid CSS selector)', () => {
    // Based on the template '30000000-...' first char is derived from '3'
    // which maps to a hex char — should be a-f or a digit that starts letter-like
    const uuid = t.generateUUID();
    // The function is designed to start with a letter for CSS selector validity
    const firstChar = uuid[0]!;
    expect(firstChar >= 'a' && firstChar <= 'f').toBe(true);
  });
});

// ============================================================
// extractThisPath
// ============================================================
describe('extractThisPath', () => {
  it('extracts simple property from this.foo', () => {
    expect(t.extractThisPath('return this.foo')).toBe('foo');
  });

  it('extracts optional chaining path', () => {
    expect(t.extractThisPath('return this.foo?.bar')).toBe('foo?.bar');
  });

  it('extracts nested dotted path', () => {
    expect(t.extractThisPath('return this.foo.bar.baz')).toBe('foo.bar.baz');
  });

  it('returns null when no this. found', () => {
    expect(t.extractThisPath('return value')).toBeNull();
  });

  it('returns null for bare this with no property', () => {
    expect(t.extractThisPath('return this')).toBeNull();
  });

  it('returns null when this. is followed by non-identifier', () => {
    expect(t.extractThisPath('return this. ')).toBeNull();
  });

  it('extracts path with $ in identifier', () => {
    expect(t.extractThisPath('this.$foo')).toBe('$foo');
  });

  it('stops at non-identifier character', () => {
    expect(t.extractThisPath('this.foo + 1')).toBe('foo');
  });
});

// NOTE: `hasTextAreaTag` was removed from compile.ts — the `<TextArea>` typo
// check is now the `gxtTextAreaTypoAssert` AST visitor (ElementNode.tag ===
// 'TextArea'). Its unit suite was removed with it; the assert is exercised by
// the browser-harness "Components test: <Textarea>" module.

// ============================================================
// hasBlockParamRef
// ============================================================
describe('hasBlockParamRef', () => {
  it('returns true for $_bp0', () => {
    expect(t.hasBlockParamRef('use $_bp0 here')).toBe(true);
  });

  it('returns true for $_bp9', () => {
    expect(t.hasBlockParamRef('$_bp9')).toBe(true);
  });

  it('returns false for $_bp without digit', () => {
    expect(t.hasBlockParamRef('$_bp')).toBe(false);
  });

  it('returns false for $_bpx (non-digit after)', () => {
    expect(t.hasBlockParamRef('$_bpx')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(t.hasBlockParamRef('')).toBe(false);
  });

  it('returns false for no block param ref', () => {
    expect(t.hasBlockParamRef('regular text')).toBe(false);
  });
});

// ============================================================
// findBlockParamNames
// ============================================================
describe('findBlockParamNames', () => {
  it('extracts names from as |x y|', () => {
    const names = t.findBlockParamNames('{{#each items as |item index|}}');
    expect(names).toEqual(new Set(['item', 'index']));
  });

  it('extracts single name', () => {
    const names = t.findBlockParamNames('as |value|');
    expect(names).toEqual(new Set(['value']));
  });

  it('handles multiple as | blocks', () => {
    const names = t.findBlockParamNames('as |a| stuff as |b c|');
    expect(names).toEqual(new Set(['a', 'b', 'c']));
  });

  it('returns empty set when no block params', () => {
    const names = t.findBlockParamNames('<div>hello</div>');
    expect(names.size).toBe(0);
  });

  it('requires whitespace before as', () => {
    // "has" should not match — 'as' must be preceded by whitespace or start
    const names = t.findBlockParamNames('has |foo|');
    expect(names.size).toBe(0);
  });

  it('handles whitespace between as and pipe', () => {
    const names = t.findBlockParamNames('as   |x|');
    expect(names).toEqual(new Set(['x']));
  });

  it('returns empty set for empty string', () => {
    expect(t.findBlockParamNames('').size).toBe(0);
  });
});

// ============================================================
// findDottedTags
// ============================================================
describe('findDottedTags', () => {
  it('finds <foo.Bar pattern', () => {
    const results = t.findDottedTags('<foo.Bar >');
    expect(results).toEqual([['foo', 'Bar']]);
  });

  it('finds multiple dotted tags', () => {
    const results = t.findDottedTags('<card.Header > <card.Body >');
    expect(results).toEqual([
      ['card', 'Header'],
      ['card', 'Body'],
    ]);
  });

  it('requires lowercase start for head', () => {
    // <Foo.bar should not match (starts with uppercase)
    const results = t.findDottedTags('<Foo.bar >');
    expect(results).toEqual([]);
  });

  it('requires whitespace after tail', () => {
    // <foo.bar> — the '>' is not whitespace
    const results = t.findDottedTags('<foo.bar>');
    expect(results).toEqual([]);
  });

  it('returns empty for no dotted tags', () => {
    expect(t.findDottedTags('<div>hello</div>')).toEqual([]);
  });

  it('returns empty for empty string', () => {
    expect(t.findDottedTags('')).toEqual([]);
  });
});

// NOTE: `findDottedMustaches` was removed from compile.ts — the `{{foo.bar}}`
// (free lowercase head, not in scope) assert is now the `gxtDottedMustacheAssert`
// AST visitor (the throw fires post-compile from precompileTemplate). Its unit
// suite was removed with it; the assert is exercised by the browser harness
// (e.g. "Helpers test: custom helpers" → `{{hello.world}}`).

// ============================================================
// hasAttrsInBlockParams
// ============================================================
describe('hasAttrsInBlockParams', () => {
  it('returns true when attrs is in block params', () => {
    expect(t.hasAttrsInBlockParams('as |attrs|')).toBe(true);
  });

  it('returns true when attrs is among other params', () => {
    expect(t.hasAttrsInBlockParams('as |foo attrs bar|')).toBe(true);
  });

  it('returns false when attrs is not in block params', () => {
    expect(t.hasAttrsInBlockParams('as |foo bar|')).toBe(false);
  });

  it('returns false when no block params', () => {
    expect(t.hasAttrsInBlockParams('<div>attrs</div>')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(t.hasAttrsInBlockParams('')).toBe(false);
  });
});

// ============================================================
// findAttrsPatterns
// ============================================================
describe('findAttrsPatterns', () => {
  it('finds {{attrs.name}}', () => {
    const results = t.findAttrsPatterns('{{attrs.name}}');
    expect(results).toEqual([{ propName: 'name', index: 0 }]);
  });

  it('finds multiple attrs patterns', () => {
    const results = t.findAttrsPatterns('{{attrs.foo}} {{attrs.bar}}');
    expect(results.length).toBe(2);
    expect(results[0]!.propName).toBe('foo');
    expect(results[1]!.propName).toBe('bar');
  });

  it('returns empty for no attrs patterns', () => {
    expect(t.findAttrsPatterns('{{this.name}}')).toEqual([]);
  });

  it('handles underscores in prop name', () => {
    const results = t.findAttrsPatterns('{{attrs.my_prop}}');
    expect(results[0]!.propName).toBe('my_prop');
  });

  it('returns empty for empty string', () => {
    expect(t.findAttrsPatterns('')).toEqual([]);
  });
});

// ============================================================
// findThisAttrsPatterns
// ============================================================
describe('findThisAttrsPatterns', () => {
  it('finds {{this.attrs.name}}', () => {
    const results = t.findThisAttrsPatterns('{{this.attrs.name}}');
    expect(results).toEqual([{ propName: 'name', index: 0 }]);
  });

  it('returns empty for {{attrs.name}} (no this)', () => {
    expect(t.findThisAttrsPatterns('{{attrs.name}}')).toEqual([]);
  });

  it('returns empty for empty string', () => {
    expect(t.findThisAttrsPatterns('')).toEqual([]);
  });
});

// parseInElementInsertBefore moved to ../utils (zero-dependency module);
// its tests live in utils.test.ts, which runs in the fast node vitest gate
// (this suite only runs in the full browser harness — see the DOCUMENTED
// SKIP in packages/demo/vitest.gxt-unit.config.mts).

// NOTE: `hasDynamicHelper` / `hasDynamicModifier` were removed from compile.ts —
// the dynamic `(helper)` / `(modifier)` keyword asserts (`{{helper this.x}}` /
// `(modifier this.x)`) are now the `gxtDynamicHelperAssert` /
// `gxtDynamicModifierAssert` AST visitors (asserts fire post-compile from
// precompileTemplate). Their unit suites were removed with them; the asserts are
// exercised by the browser harness ("Helpers test: custom helpers" and the
// dynamic-modifiers integration module).
