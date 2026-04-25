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

// ============================================================
// hasTextAreaTag
// ============================================================
describe('hasTextAreaTag', () => {
  it('returns true for <TextArea>', () => {
    expect(t.hasTextAreaTag('<TextArea>')).toBe(true);
  });

  it('returns true for <TextArea />', () => {
    expect(t.hasTextAreaTag('<TextArea />')).toBe(true);
  });

  it('returns true for <TextArea with attributes', () => {
    expect(t.hasTextAreaTag('<TextArea class="foo">')).toBe(true);
  });

  it('returns false for <Textarea (lowercase a)', () => {
    // 'TextArea' is exact match — 'Textarea' won't match '<TextArea'
    expect(t.hasTextAreaTag('<Textarea>')).toBe(false);
  });

  it('returns false when no TextArea tag', () => {
    expect(t.hasTextAreaTag('<div>hello</div>')).toBe(false);
  });

  it('returns false for TextArea not preceded by <', () => {
    expect(t.hasTextAreaTag('TextArea')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(t.hasTextAreaTag('')).toBe(false);
  });

  it('returns false for <TextAreaExtra (text continues)', () => {
    expect(t.hasTextAreaTag('<TextAreaExtra>')).toBe(false);
  });
});

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

// ============================================================
// findDottedMustaches
// ============================================================
describe('findDottedMustaches', () => {
  it('finds {{foo.bar}}', () => {
    const results = t.findDottedMustaches('{{foo.bar}}');
    expect(results).toEqual([{ head: 'foo', tail: 'bar' }]);
  });

  it('finds multiple dotted mustaches', () => {
    const results = t.findDottedMustaches('{{a.b}} and {{c.d}}');
    expect(results).toEqual([
      { head: 'a', tail: 'b' },
      { head: 'c', tail: 'd' },
    ]);
  });

  it('requires lowercase head start', () => {
    // {{Foo.bar}} should not match — head must start lowercase
    const results = t.findDottedMustaches('{{Foo.bar}}');
    expect(results).toEqual([]);
  });

  it('handles multi-segment tail', () => {
    const results = t.findDottedMustaches('{{foo.bar.baz}}');
    expect(results).toEqual([{ head: 'foo', tail: 'bar.baz' }]);
  });

  it('returns empty for no dotted mustaches', () => {
    expect(t.findDottedMustaches('{{simple}}')).toEqual([]);
  });

  it('returns empty for empty string', () => {
    expect(t.findDottedMustaches('')).toEqual([]);
  });

  it('requires closing }}', () => {
    expect(t.findDottedMustaches('{{foo.bar')).toEqual([]);
  });
});

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

// ============================================================
// parseInElementInsertBefore
// ============================================================
describe('parseInElementInsertBefore', () => {
  it('extracts insertBefore and removes it from template', () => {
    const input = '{{#in-element dest insertBefore=null}}content{{/in-element}}';
    const { result, insertBefore } = t.parseInElementInsertBefore(input);
    expect(insertBefore).toBe('null');
    expect(result).toContain('{{#in-element dest}}');
    expect(result).not.toContain('insertBefore');
  });

  it('returns null insertBefore when not present', () => {
    const input = '{{#in-element dest}}content{{/in-element}}';
    const { result, insertBefore } = t.parseInElementInsertBefore(input);
    expect(insertBefore).toBeNull();
    expect(result).toContain('{{#in-element dest}}');
  });

  it('returns original string when no in-element', () => {
    const input = '<div>hello</div>';
    const { result, insertBefore } = t.parseInElementInsertBefore(input);
    expect(result).toBe(input);
    expect(insertBefore).toBeNull();
  });

  it('handles empty string', () => {
    const { result, insertBefore } = t.parseInElementInsertBefore('');
    expect(result).toBe('');
    expect(insertBefore).toBeNull();
  });
});

// ============================================================
// hasDynamicHelper
// ============================================================
describe('hasDynamicHelper', () => {
  it('returns true for {{helper this.myHelper}}', () => {
    expect(t.hasDynamicHelper('{{helper this.myHelper}}')).toBe(true);
  });

  it('returns true for {{helper @myHelper}}', () => {
    expect(t.hasDynamicHelper('{{helper @myHelper}}')).toBe(true);
  });

  it('returns false for {{helper "string-name"}}', () => {
    expect(t.hasDynamicHelper('{{helper "string-name"}}')).toBe(false);
  });

  it('returns false when no helper keyword', () => {
    expect(t.hasDynamicHelper('{{this.myHelper}}')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(t.hasDynamicHelper('')).toBe(false);
  });

  it('returns true for this. path with dots', () => {
    expect(t.hasDynamicHelper('{{helper this.foo.bar}}')).toBe(true);
  });
});

// ============================================================
// hasDynamicModifier
// ============================================================
describe('hasDynamicModifier', () => {
  it('returns true for (modifier this.myMod)', () => {
    expect(t.hasDynamicModifier('(modifier this.myMod)')).toBe(true);
  });

  it('returns true for (modifier @myMod)', () => {
    expect(t.hasDynamicModifier('(modifier @myMod)')).toBe(true);
  });

  it('returns false for (modifier "string-name")', () => {
    expect(t.hasDynamicModifier('(modifier "string-name")')).toBe(false);
  });

  it('returns false when no modifier keyword', () => {
    expect(t.hasDynamicModifier('(helper this.foo)')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(t.hasDynamicModifier('')).toBe(false);
  });

  it('returns true for this. path with dots', () => {
    expect(t.hasDynamicModifier('(modifier this.foo.bar)')).toBe(true);
  });
});
