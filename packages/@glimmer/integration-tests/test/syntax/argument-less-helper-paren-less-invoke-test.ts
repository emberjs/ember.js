import { defineSimpleHelper, jitSuite, RenderTest, test } from '../..';

class ArgumentLessHelperParenLessInvokeTest extends RenderTest {
  static suiteName = 'argument-less helper paren-less invoke';

  @test
  'invoking an argument-less helper without parens in named argument position is deprecated'(
    assert: Assert
  ) {
    this.registerHelper('is-string', ([value]: readonly unknown[]) => typeof value === 'string');

    this.registerHelper('foo', () => 'Hello, world!');
    this.registerComponent('TemplateOnly', 'Bar', '[{{is-string @content}}][{{@content}}]');

    this.render('<Bar @content={{foo}} />', { foo: 'Not it!' });
    this.assertHTML('[true][Hello, world!]');
    this.assertStableRerender();

    assert.validateDeprecations(
      new RegExp(
        /The `foo` helper was used in the `\(unknown template module\)` template as /.source +
          /`@content={{foo}}`\. This is ambigious between wanting the `@content` argument /.source +
          /to be the `foo` helper itself, or the result of invoking the `foo` helper /.source +
          /\(current behavior\)\. This implicit invocation behavior has been deprecated\./.source
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
