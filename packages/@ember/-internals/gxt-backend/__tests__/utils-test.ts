/**
 * The string helpers of the compat backend's `utils.ts`: the name
 * conversions the resolver and the template compiler use.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import {
  dasherize,
  doubleColonToSlash,
  hasUpperCase,
  isAllDigits,
  pascalToKebab,
  splitWhitespace,
} from '../utils';

QUnit.module('Compat: utils.ts', function () {
  QUnit.module('pascalToKebab()', function () {
    QUnit.test('converts PascalCase to kebab-case', function (assert) {
      assert.strictEqual(pascalToKebab('FooBar'), 'foo-bar');
    });

    QUnit.test(
      'handles consecutive uppercase followed by lowercase (HTMLElement)',
      function (assert) {
        assert.strictEqual(pascalToKebab('HTMLElement'), 'html-element');
      }
    );

    QUnit.test('converts a single PascalCase word', function (assert) {
      assert.strictEqual(pascalToKebab('Foo'), 'foo');
    });

    QUnit.test('handles a consecutive uppercase abbreviation before lowercase', function (assert) {
      assert.strictEqual(pascalToKebab('ABCDef'), 'abc-def');
    });

    QUnit.test('returns an already-kebab string unchanged', function (assert) {
      assert.strictEqual(pascalToKebab('link-to'), 'link-to');
    });

    QUnit.test('lowercases a single uppercase word', function (assert) {
      assert.strictEqual(pascalToKebab('Hello'), 'hello');
    });

    QUnit.test('returns all-lowercase input unchanged', function (assert) {
      assert.strictEqual(pascalToKebab('foobar'), 'foobar');
    });

    QUnit.test('returns an empty string for empty input', function (assert) {
      assert.strictEqual(pascalToKebab(''), '');
    });

    QUnit.test('handles a single character', function (assert) {
      assert.strictEqual(pascalToKebab('A'), 'a');
      assert.strictEqual(pascalToKebab('a'), 'a');
    });

    QUnit.test('inserts a dash between a digit and an uppercase letter', function (assert) {
      assert.strictEqual(pascalToKebab('item1Foo'), 'item1-foo');
    });

    QUnit.test('handles XBlah (a common component prefix)', function (assert) {
      assert.strictEqual(pascalToKebab('XBlah'), 'x-blah');
    });
  });

  QUnit.module('isAllDigits()', function () {
    QUnit.test('returns true for an all-digit string', function (assert) {
      assert.true(isAllDigits('123'));
    });

    QUnit.test('returns false for a mixed string', function (assert) {
      assert.false(isAllDigits('12a'));
    });

    QUnit.test('returns false for an empty string', function (assert) {
      assert.false(isAllDigits(''));
    });

    QUnit.test('returns true for a single zero', function (assert) {
      assert.true(isAllDigits('0'));
    });

    QUnit.test('returns true for a single digit', function (assert) {
      assert.true(isAllDigits('9'));
    });

    QUnit.test('returns false for letters only', function (assert) {
      assert.false(isAllDigits('abc'));
    });

    QUnit.test('returns false for space-padded digits', function (assert) {
      assert.false(isAllDigits(' 123 '));
    });
  });

  QUnit.module('hasUpperCase()', function () {
    QUnit.test('returns true when the string starts with uppercase', function (assert) {
      assert.true(hasUpperCase('Foo'));
    });

    QUnit.test('returns false for all-lowercase', function (assert) {
      assert.false(hasUpperCase('foo'));
    });

    QUnit.test('returns true for camelCase', function (assert) {
      assert.true(hasUpperCase('fooBar'));
    });

    QUnit.test('returns false for an empty string', function (assert) {
      assert.false(hasUpperCase(''));
    });

    QUnit.test('returns false for digits only', function (assert) {
      assert.false(hasUpperCase('123'));
    });

    QUnit.test('returns true for a single uppercase letter', function (assert) {
      assert.true(hasUpperCase('A'));
    });
  });

  QUnit.module('dasherize()', function () {
    QUnit.test('converts camelCase to kebab-case', function (assert) {
      assert.strictEqual(dasherize('camelCase'), 'camel-case');
    });

    QUnit.test('converts multiword camelCase', function (assert) {
      assert.strictEqual(dasherize('fooBarBaz'), 'foo-bar-baz');
    });

    QUnit.test('returns a lowercase string unchanged', function (assert) {
      assert.strictEqual(dasherize('foo'), 'foo');
    });

    QUnit.test('returns an empty string for empty input', function (assert) {
      assert.strictEqual(dasherize(''), '');
    });

    QUnit.test(
      'adds no leading dash for a leading uppercase letter (PascalCase)',
      function (assert) {
        assert.strictEqual(dasherize('FooBar'), 'foo-bar');
      }
    );

    QUnit.test('handles a digit before an uppercase letter', function (assert) {
      assert.strictEqual(dasherize('item1Foo'), 'item1-foo');
    });

    QUnit.test('inserts no dashes between consecutive uppercase letters', function (assert) {
      // Only a lowercase-to-uppercase boundary gets a dash.
      assert.strictEqual(dasherize('ABC'), 'abc');
    });
  });

  QUnit.module('splitWhitespace()', function () {
    QUnit.test('splits on spaces', function (assert) {
      assert.deepEqual(splitWhitespace('a b c'), ['a', 'b', 'c']);
    });

    QUnit.test('trims and collapses whitespace', function (assert) {
      assert.deepEqual(splitWhitespace('  a  '), ['a']);
    });

    QUnit.test('returns an empty array for an empty string', function (assert) {
      assert.deepEqual(splitWhitespace(''), []);
    });

    QUnit.test('returns an empty array for a whitespace-only string', function (assert) {
      assert.deepEqual(splitWhitespace('   '), []);
    });

    QUnit.test('handles tabs and newlines', function (assert) {
      assert.deepEqual(splitWhitespace('a\tb\nc'), ['a', 'b', 'c']);
    });

    QUnit.test('handles a single word', function (assert) {
      assert.deepEqual(splitWhitespace('hello'), ['hello']);
    });

    QUnit.test('handles several spaces between words', function (assert) {
      assert.deepEqual(splitWhitespace('a    b'), ['a', 'b']);
    });
  });

  QUnit.module('doubleColonToSlash()', function () {
    QUnit.test('replaces :: with /', function (assert) {
      assert.strictEqual(doubleColonToSlash('Foo::Bar'), 'Foo/Bar');
    });

    QUnit.test('returns a string without colons unchanged', function (assert) {
      assert.strictEqual(doubleColonToSlash('no-colons'), 'no-colons');
    });

    QUnit.test('handles several :: separators', function (assert) {
      assert.strictEqual(doubleColonToSlash('A::B::C'), 'A/B/C');
    });

    QUnit.test('handles an empty string', function (assert) {
      assert.strictEqual(doubleColonToSlash(''), '');
    });

    QUnit.test('does not replace single colons', function (assert) {
      assert.strictEqual(doubleColonToSlash('a:b'), 'a:b');
    });

    QUnit.test('handles :: at the start and the end', function (assert) {
      assert.strictEqual(doubleColonToSlash('::Foo::'), '/Foo/');
    });
  });
});
