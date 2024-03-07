import { jitSuite, preprocess, RenderTest, syntaxErrorFor, test } from '../..';

class SyntaxErrors extends RenderTest {
  static suiteName = 'general syntax errors';

  @test
  'context switching using ../ is not allowed'() {
    this.assert.throws(
      () => {
        preprocess('<div><p>{{../value}}</p></div>', { meta: { moduleName: 'test-module' } });
      },
      syntaxErrorFor(
        'Changing context using "../" is not supported in Glimmer',
        '../value',
        'test-module',
        1,
        10
      )
    );
  }

  @test
  'mixing . and / is not allowed'() {
    this.assert.throws(
      () => {
        preprocess('<div><p>{{a/b.c}}</p></div>', { meta: { moduleName: 'test-module' } });
      },
      syntaxErrorFor(
        "Mixing '.' and '/' in paths is not supported in Glimmer; use only '.' to separate property paths",
        'a/b.c',
        'test-module',
        1,
        10
      )
    );
  }

  @test
  'explicit self ref with ./ is not allowed'() {
    this.assert.throws(
      () => {
        preprocess('<div><p>{{./value}}</p></div>', { meta: { moduleName: 'test-module' } });
      },
      syntaxErrorFor(
        'Using "./" is not supported in Glimmer and unnecessary',
        './value',
        'test-module',
        1,
        10
      )
    );
  }

  @test
  'Block params in HTML syntax - requires a space between as and pipes'() {
    this.assert.throws(
      () => {
        preprocess('<x-bar as|foo|>foo</x-bar>', { meta: { moduleName: 'test-module' } });
      },
      syntaxErrorFor(
        'Invalid block parameters syntax: expecting at least one space character between "as" and "|"',
        'as|',
        'test-module',
        1,
        7
      )
    );
  }

  @test
  'Block params in HTML syntax - Throws exception if given zero parameters'() {
    this.assert.throws(
      () => {
        preprocess('<x-bar as ||>foo</x-bar>', { meta: { moduleName: 'test-module' } });
      },
      syntaxErrorFor(
        'Invalid block parameters syntax: empty parameters list, expecting at least one identifier',
        'as ||',
        'test-module',
        1,
        7
      )
    );

    this.assert.throws(
      () => {
        preprocess('<x-bar as | |>foo</x-bar>', { meta: { moduleName: 'test-module' } });
      },
      syntaxErrorFor(
        'Invalid block parameters syntax: empty parameters list, expecting at least one identifier',
        'as | |',
        'test-module',
        1,
        7
      )
    );
  }

  @test
  'Block params in HTML syntax - invalid mustaches in block params list'() {
    this.assert.throws(
      () => {
        preprocess('<x-bar as |{{foo}}|>foo</x-bar>', { meta: { moduleName: 'test-module' } });
      },
      syntaxErrorFor(
        'Invalid block parameters syntax: mustaches cannot be used inside parameters list',
        '{{foo}}',
        'test-module',
        1,
        11
      )
    );

    this.assert.throws(
      () => {
        preprocess('<x-bar as |foo{{bar}}|>foo</x-bar>', { meta: { moduleName: 'test-module' } });
      },
      syntaxErrorFor(
        'Invalid block parameters syntax: mustaches cannot be used inside parameters list',
        '{{bar}}',
        'test-module',
        1,
        14
      )
    );

    this.assert.throws(
      () => {
        preprocess('<x-bar as |foo {{bar}}|>foo</x-bar>', { meta: { moduleName: 'test-module' } });
      },
      syntaxErrorFor(
        'Invalid block parameters syntax: mustaches cannot be used inside parameters list',
        '{{bar}}',
        'test-module',
        1,
        15
      )
    );

    this.assert.throws(
      () => {
        preprocess('<x-bar as |foo| {{bar}}>foo</x-bar>', { meta: { moduleName: 'test-module' } });
      },
      syntaxErrorFor(
        'Invalid block parameters syntax: modifiers cannot follow parameters list',
        '{{bar}}',
        'test-module',
        1,
        16
      )
    );
  }

  @test
  'Block params in HTML syntax - EOF in block params list'() {
    this.assert.throws(
      () => {
        preprocess('<x-bar as |', { meta: { moduleName: 'test-module' } });
      },
      syntaxErrorFor(
        'Invalid block parameters syntax: expecting the tag to be closed with ">" or "/>" after parameters list',
        'as |',
        'test-module',
        1,
        7
      )
    );

    this.assert.throws(
      () => {
        preprocess('<x-bar as |foo', { meta: { moduleName: 'test-module' } });
      },
      syntaxErrorFor(
        'Invalid block parameters syntax: expecting the tag to be closed with ">" or "/>" after parameters list',
        'as |foo',
        'test-module',
        1,
        7
      )
    );

    this.assert.throws(
      () => {
        preprocess('<x-bar as |foo|', { meta: { moduleName: 'test-module' } });
      },
      syntaxErrorFor(
        'Invalid block parameters syntax: expecting the tag to be closed with ">" or "/>" after parameters list',
        'as |foo|',
        'test-module',
        1,
        7
      )
    );
  }

  @test
  'Block params in HTML syntax - Throws an error on invalid block params syntax'() {
    this.assert.throws(
      () => {
        preprocess('<x-bar as |x y>{{x}},{{y}}</x-bar>', { meta: { moduleName: 'test-module' } });
      },
      syntaxErrorFor(
        'Invalid block parameters syntax: expecting "|" but the tag was closed prematurely',
        'as |x y>',
        'test-module',
        1,
        7
      )
    );

    this.assert.throws(
      () => {
        preprocess('<x-bar as |x| wat>{{x}},{{y}}</x-bar>', {
          meta: { moduleName: 'test-module' },
        });
      },
      syntaxErrorFor(
        'Invalid block parameters syntax: expecting the tag to be closed with ">" or "/>" after parameters list',
        'wat',
        'test-module',
        1,
        14
      )
    );

    this.assert.throws(
      () => {
        preprocess('<x-bar as |x| y|>{{x}},{{y}}</x-bar>', { meta: { moduleName: 'test-module' } });
      },
      syntaxErrorFor(
        'Invalid block parameters syntax: expecting the tag to be closed with ">" or "/>" after parameters list',
        'y|',
        'test-module',
        1,
        14
      )
    );
  }

  @test
  'Block params in HTML syntax - Throws an error on invalid identifiers for params'() {
    this.assert.throws(
      () => {
        preprocess('<x-bar as |x foo.bar|></x-bar>', { meta: { moduleName: 'test-module' } });
      },
      syntaxErrorFor(
        'Invalid block parameters syntax: invalid identifier name `foo.bar`',
        'foo.bar',
        'test-module',
        1,
        13
      )
    );

    this.assert.throws(
      () => {
        preprocess('<x-bar as |x "foo"|></x-bar>', { meta: { moduleName: 'test-module' } });
      },
      syntaxErrorFor(
        'Invalid block parameters syntax: invalid identifier name `"foo"`',
        '"foo"',
        'test-module',
        1,
        13
      )
    );

    this.assert.throws(
      () => {
        preprocess('<x-bar as |foo[bar]|></x-bar>', { meta: { moduleName: 'test-module' } });
      },
      syntaxErrorFor(
        'Invalid block parameters syntax: invalid identifier name `foo[bar]`',
        'foo[bar]',
        'test-module',
        1,
        11
      )
    );
  }

  @test
  'Block params in HTML syntax - Throws an error on missing `as`'() {
    this.assert.throws(
      () => {
        preprocess('<x-bar |x|></x-bar>', { meta: { moduleName: 'test-module' } });
      },
      syntaxErrorFor(
        'Invalid block parameters syntax: block parameters must be preceded by the `as` keyword',
        '|x|',
        'test-module',
        1,
        7
      )
    );

    this.assert.throws(
      () => {
        preprocess('<x-bar><:baz |x|></:baz></x-bar>', {
          meta: { moduleName: 'test-module' },
        });
      },
      syntaxErrorFor(
        'Invalid block parameters syntax: block parameters must be preceded by the `as` keyword',
        '|x|',
        'test-module',
        1,
        13
      )
    );
  }
}

jitSuite(SyntaxErrors);
