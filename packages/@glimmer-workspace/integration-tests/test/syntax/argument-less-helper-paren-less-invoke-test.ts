import { defineSimpleHelper, jitSuite, preprocess, RenderTest, syntaxErrorFor, test } from '../..';

class ArgumentLessHelperParenLessInvokeTest extends RenderTest {
  static suiteName = 'argument-less helper paren-less invoke';

  @test
  'invoking an argument-less helper without parens in named argument position is a syntax error'(
    assert: Assert
  ) {
    assert.throws(
      () => {
        preprocess('<Bar @content={{foo}} />', {
          meta: { moduleName: 'test-module' },
        });
      },
      syntaxErrorFor(
        'You attempted to pass a path as argument (`@content={{foo}}`) but foo was not in scope. Try:\n' +
          '* `@content={{this.foo}}` if this is meant to be a property lookup, or\n' +
          '* `@content={{(foo)}}` if this is meant to invoke the resolved helper, or\n' +
          '* `@content={{helper "foo"}}` if this is meant to pass the resolved helper by value',
        `@content={{foo}}`,
        'test-module',
        1,
        5
      )
    );
  }

  @test
  'invoking an argument-less helper with parens in named argument position is not deprecated'() {
    this.registerHelper('is-string', ([value]: readonly unknown[]) => typeof value === 'string');

    this.registerHelper('foo', () => 'Hello, world!');
    this.registerComponent('TemplateOnly', 'Bar', '[{{is-string @content}}][{{@content}}]');

    this.render('<Bar @content={{(foo)}} />');
    this.assertHTML('[true][Hello, world!]');
    this.assertStableRerender();
  }

  @test
  'invoking an argument-less helper with quotes in named argument position is not deprecated'() {
    this.registerHelper('is-string', ([value]: readonly unknown[]) => typeof value === 'string');

    this.registerHelper('foo', () => 'Hello, world!');
    this.registerComponent('TemplateOnly', 'Bar', '[{{is-string @content}}][{{@content}}]');

    this.render('<Bar @content="{{foo}}" />');
    this.assertHTML('[true][Hello, world!]');
    this.assertStableRerender();
  }

  @test
  'passing a local helper in named argument position is not deprecated'() {
    this.registerHelper('is-string', ([value]: readonly unknown[]) => typeof value === 'string');

    const foo = defineSimpleHelper(() => 'Hello, world!');

    this.registerComponent('TemplateOnly', 'Bar', '[{{is-string @content}}][{{@content}}]');

    this.render('{{#let this.foo as |foo|}}<Bar @content={{foo}} />{{/let}}', { foo });
    this.assertHTML('[false][Hello, world!]');
    this.assertStableRerender();
  }

  @test
  'invoking a local helper with parens in named argument position is not deprecated'() {
    this.registerHelper('is-string', ([value]: readonly unknown[]) => typeof value === 'string');

    const foo = defineSimpleHelper(() => 'Hello, world!');

    this.registerComponent('TemplateOnly', 'Bar', '[{{is-string @content}}][{{@content}}]');

    this.render('{{#let this.foo as |foo|}}<Bar @content={{(foo)}} />{{/let}}', { foo });
    this.assertHTML('[true][Hello, world!]');
    this.assertStableRerender();
  }

  // TODO: this should work, but doesn't

  // @test
  // 'invoking a helper with quotes in named argument position is not deprecated'() {
  //   this.registerHelper('is-string', ([value]: readonly unknown[]) => typeof value === 'string');

  //   const foo = defineSimpleHelper(() => 'Hello, world!');

  //   this.registerComponent('TemplateOnly', 'Bar', '[{{is-string @content}}][{{@content}}]');

  //   this.render('{{#let this.foo as |foo|}}<Bar @content="{{foo}}" />{{/let}}', { foo });
  //   this.assertHTML('[true][Hello, world!]');
  //   this.assertStableRerender();
  // }
}

jitSuite(ArgumentLessHelperParenLessInvokeTest);
