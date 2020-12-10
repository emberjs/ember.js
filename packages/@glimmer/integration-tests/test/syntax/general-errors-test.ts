import { RenderTest, jitSuite, test, preprocess, syntaxErrorFor } from '../..';

class SyntaxErrors extends RenderTest {
  static suiteName = 'general syntax errors';

  @test
  'context switching using ../ is not allowed'() {
    this.assert.throws(() => {
      preprocess('<div><p>{{../value}}</p></div>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('Changing context using "../" is not supported in Glimmer', '../value', 'test-module', 1, 10));
  }

  @test
  'mixing . and / is not allowed'() {
    this.assert.throws(() => {
      preprocess('<div><p>{{a/b.c}}</p></div>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor("Mixing '.' and '/' in paths is not supported in Glimmer; use only '.' to separate property paths", 'a/b.c', 'test-module', 1, 10));
  }

  @test
  'explicit self ref with ./ is not allowed'() {
    this.assert.throws(() => {
      preprocess('<div><p>{{./value}}</p></div>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('Using "./" is not supported in Glimmer and unnecessary', './value', 'test-module', 1, 10));
  }

  @test
  'Block params in HTML syntax - Throws exception if given zero parameters'() {
    this.assert.throws(() => {
      preprocess('<x-bar as ||>foo</x-bar>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('Cannot use zero block parameters', '<x-bar as ||>foo</x-bar>', 'test-module', 1, 0));

    this.assert.throws(() => {
      preprocess('<x-bar as | |>foo</x-bar>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('Cannot use zero block parameters', '<x-bar as | |>foo</x-bar>', 'test-module', 1, 0));
  }

  @test
  'Block params in HTML syntax - Throws an error on invalid block params syntax'() {
    this.assert.throws(() => {
      preprocess('<x-bar as |x y>{{x}},{{y}}</x-bar>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor("Invalid block parameters syntax, 'as |x y'", '<x-bar as |x y>{{x}},{{y}}</x-bar>', 'test-module', 1, 0));

    this.assert.throws(() => {
      preprocess('<x-bar as |x| y>{{x}},{{y}}</x-bar>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor("Invalid block parameters syntax, 'as |x| y'", '<x-bar as |x| y>{{x}},{{y}}</x-bar>', 'test-module', 1, 0));

    this.assert.throws(() => {
      preprocess('<x-bar as |x| y|>{{x}},{{y}}</x-bar>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor("Invalid block parameters syntax, 'as |x| y|'", '<x-bar as |x| y|>{{x}},{{y}}</x-bar>', 'test-module', 1, 0));
  }

  @test
  'Block params in HTML syntax - Throws an error on invalid identifiers for params'() {
    this.assert.throws(() => {
      preprocess('<x-bar as |x foo.bar|></x-bar>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor("Invalid identifier for block parameters, 'foo.bar'", '<x-bar as |x foo.bar|></x-bar>', 'test-module', 1, 0));

    this.assert.throws(() => {
      preprocess('<x-bar as |x "foo"|></x-bar>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('" is not a valid character within attribute names', '', 'test-module', 1, 17));

    this.assert.throws(() => {
      preprocess('<x-bar as |foo[bar]|></x-bar>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor("Invalid identifier for block parameters, 'foo[bar]'", '<x-bar as |foo[bar]|></x-bar>', 'test-module', 1, 0));
  }

  @test
  'Block params in HTML syntax - Throws an error on missing `as`'() {
    this.assert.throws(() => {
      preprocess('<x-bar |x|></x-bar>', { meta: { moduleName: 'test-module' } });
    }, syntaxErrorFor('Block parameters must be preceded by the `as` keyword, detected block parameters without `as`', '<x-bar |x|></x-bar>', 'test-module', 1, 0));

    this.assert.throws(() => {
      preprocess('<x-bar><:baz |x|></:baz></x-bar>', {
        meta: { moduleName: 'test-module' },
      });
    }, syntaxErrorFor('Block parameters must be preceded by the `as` keyword, detected block parameters without `as`', '<:baz |x|></:baz>', 'test-module', 1, 7));
  }
}

jitSuite(SyntaxErrors);
