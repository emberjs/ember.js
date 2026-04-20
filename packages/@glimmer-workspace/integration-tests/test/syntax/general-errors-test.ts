import {
  jitSuite,
  parseErrorFor,
  preprocess,
  RenderTest,
  test,
} from '@glimmer-workspace/integration-tests';

class SyntaxErrors extends RenderTest {
  static suiteName = 'general syntax errors';

  @test
  'context switching using ../ is not allowed'() {
    this.assert.throws(
      () => {
        preprocess('<div><p>{{../value}}</p></div>', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        'Changing context using "../" is not supported in Glimmer',
        '<div><p>{{../value}}</p></div>',
        'test-module',
        1,
        10,
        1
      )
    );
  }

  @test
  'mixing . and / is not allowed'() {
    this.assert.throws(
      () => {
        preprocess('<div><p>{{a/b.c}}</p></div>', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        "Mixing '.' and '/' in paths is not supported in Glimmer; use only '.' to separate property paths",
        '<div><p>{{a/b.c}}</p></div>',
        'test-module',
        1,
        10,
        1
      )
    );
  }

  @test
  'explicit self ref with ./ is not allowed'() {
    this.assert.throws(
      () => {
        preprocess('<div><p>{{./value}}</p></div>', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        'Using "./" is not supported in Glimmer and unnecessary',
        '<div><p>{{./value}}</p></div>',
        'test-module',
        1,
        10,
        1
      )
    );
  }

  @test
  'Block params in HTML syntax - requires a space between as and pipes'() {
    this.assert.throws(
      () => {
        preprocess('<x-bar as|foo|>foo</x-bar>', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        'Invalid block parameters syntax: expecting at least one space character between "as" and "|"',
        '<x-bar as|foo|>foo</x-bar>',
        'test-module',
        1,
        7,
        1
      )
    );
  }

  @test
  'Block params in HTML syntax - Throws exception if given zero parameters'() {
    this.assert.throws(
      () => {
        preprocess('<x-bar as ||>foo</x-bar>', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        'Invalid block parameters syntax: empty parameters list, expecting at least one identifier',
        '<x-bar as ||>foo</x-bar>',
        'test-module',
        1,
        7,
        1
      )
    );

    this.assert.throws(
      () => {
        preprocess('<x-bar as | |>foo</x-bar>', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        'Invalid block parameters syntax: empty parameters list, expecting at least one identifier',
        '<x-bar as | |>foo</x-bar>',
        'test-module',
        1,
        7,
        1
      )
    );
  }

  @test
  'Block params in HTML syntax - invalid mustaches in block params list'() {
    this.assert.throws(
      () => {
        preprocess('<x-bar as |{{foo}}|>foo</x-bar>', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        'Invalid block parameters syntax: mustaches cannot be used inside parameters list',
        '<x-bar as |{{foo}}|>foo</x-bar>',
        'test-module',
        1,
        11,
        1
      )
    );

    this.assert.throws(
      () => {
        preprocess('<x-bar as |foo{{bar}}|>foo</x-bar>', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        'Invalid block parameters syntax: mustaches cannot be used inside parameters list',
        '<x-bar as |foo{{bar}}|>foo</x-bar>',
        'test-module',
        1,
        14,
        1
      )
    );

    this.assert.throws(
      () => {
        preprocess('<x-bar as |foo {{bar}}|>foo</x-bar>', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        'Invalid block parameters syntax: mustaches cannot be used inside parameters list',
        '<x-bar as |foo {{bar}}|>foo</x-bar>',
        'test-module',
        1,
        15,
        1
      )
    );

    this.assert.throws(
      () => {
        preprocess('<x-bar as |foo| {{bar}}>foo</x-bar>', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        'Invalid block parameters syntax: modifiers cannot follow parameters list',
        '<x-bar as |foo| {{bar}}>foo</x-bar>',
        'test-module',
        1,
        16,
        1
      )
    );
  }

  @test
  'Block params in HTML syntax - EOF in block params list'() {
    this.assert.throws(
      () => {
        preprocess('<x-bar as |', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        'Invalid block parameters syntax: expecting the tag to be closed with ">" or "/>" after parameters list',
        '<x-bar as |',
        'test-module',
        1,
        7,
        1
      )
    );

    this.assert.throws(
      () => {
        preprocess('<x-bar as |foo', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        'Invalid block parameters syntax: expecting the tag to be closed with ">" or "/>" after parameters list',
        '<x-bar as |foo',
        'test-module',
        1,
        7,
        1
      )
    );

    this.assert.throws(
      () => {
        preprocess('<x-bar as |foo|', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        'Invalid block parameters syntax: expecting the tag to be closed with ">" or "/>" after parameters list',
        '<x-bar as |foo|',
        'test-module',
        1,
        7,
        1
      )
    );
  }

  @test
  'Block params in HTML syntax - Throws an error on invalid block params syntax'() {
    this.assert.throws(
      () => {
        preprocess('<x-bar as |x y>{{x}},{{y}}</x-bar>', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        'Invalid block parameters syntax: expecting "|" but the tag was closed prematurely',
        '<x-bar as |x y>{{x}},{{y}}</x-bar>',
        'test-module',
        1,
        7,
        1
      )
    );

    this.assert.throws(
      () => {
        preprocess('<x-bar as |x| wat>{{x}},{{y}}</x-bar>', {
          meta: { moduleName: 'test-module' },
        });
      },
      parseErrorFor(
        'Invalid block parameters syntax: expecting the tag to be closed with ">" or "/>" after parameters list',
        '<x-bar as |x| wat>{{x}},{{y}}</x-bar>',
        'test-module',
        1,
        14,
        1
      )
    );

    this.assert.throws(
      () => {
        preprocess('<x-bar as |x| y|>{{x}},{{y}}</x-bar>', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        'Invalid block parameters syntax: expecting the tag to be closed with ">" or "/>" after parameters list',
        '<x-bar as |x| y|>{{x}},{{y}}</x-bar>',
        'test-module',
        1,
        14,
        1
      )
    );
  }

  @test
  'Block params in HTML syntax - Throws an error on invalid identifiers for params'() {
    this.assert.throws(
      () => {
        preprocess('<x-bar as |x foo.bar|></x-bar>', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        'Invalid block parameters syntax: invalid identifier name `foo.bar`',
        '<x-bar as |x foo.bar|></x-bar>',
        'test-module',
        1,
        13,
        1
      )
    );

    this.assert.throws(
      () => {
        preprocess('<x-bar as |x "foo"|></x-bar>', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        'Invalid block parameters syntax: invalid identifier name `"foo"`',
        '<x-bar as |x "foo"|></x-bar>',
        'test-module',
        1,
        13,
        1
      )
    );

    this.assert.throws(
      () => {
        preprocess('<x-bar as |foo[bar]|></x-bar>', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        'Invalid block parameters syntax: invalid identifier name `foo[bar]`',
        '<x-bar as |foo[bar]|></x-bar>',
        'test-module',
        1,
        11,
        1
      )
    );
  }

  @test
  'Block params in HTML syntax - Throws an error on missing `as`'() {
    this.assert.throws(
      () => {
        preprocess('<x-bar |x|></x-bar>', { meta: { moduleName: 'test-module' } });
      },
      parseErrorFor(
        'Invalid block parameters syntax: block parameters must be preceded by the `as` keyword',
        '<x-bar |x|></x-bar>',
        'test-module',
        1,
        7,
        1
      )
    );

    this.assert.throws(
      () => {
        preprocess('<x-bar><:baz |x|></:baz></x-bar>', {
          meta: { moduleName: 'test-module' },
        });
      },
      parseErrorFor(
        'Invalid block parameters syntax: block parameters must be preceded by the `as` keyword',
        '<x-bar><:baz |x|></:baz></x-bar>',
        'test-module',
        1,
        13,
        1
      )
    );
  }
}

jitSuite(SyntaxErrors);
