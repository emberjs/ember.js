import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

class TryTest extends RenderTest {
  static suiteName = '{{#try}} keyword';

  beforeEach() {
    this.registerHelper('throw-if', ([condition, message]) => {
      if (condition) {
        throw new Error(String(message ?? 'boom'));
      }

      return '';
    });
  }

  @test
  'renders the try branch when nothing throws'() {
    this.render(`{{#try}}hello {{this.name}}{{else catch as |e|}}caught {{e.message}}{{/try}}`, {
      name: 'world',
    });

    this.assertHTML('hello world');
    this.assertStableRerender();

    this.rerender({ name: 'glimmer' });
    this.assertHTML('hello glimmer');
  }

  @test
  'renders the catch branch when the try branch throws during initial render'() {
    this.render(
      `{{#try}}before {{throw-if true "kaboom"}} after{{else catch as |e|}}caught: {{e.message}}{{/try}}`
    );

    this.assertHTML('caught: kaboom');
    this.assertStableRerender();
  }

  @test
  'rolls back partially-rendered DOM, including open elements'() {
    this.render(
      `<ul>{{#try}}<li>first</li><li>{{throw-if true "mid-element"}}</li>{{else catch as |e|}}<li>error: {{e.message}}</li>{{/try}}</ul>`
    );

    this.assertHTML('<ul><li>error: mid-element</li></ul>');
    this.assertStableRerender();
  }

  @test
  'content around the try region is unaffected'() {
    this.render(`before-{{#try}}{{throw-if true "x"}}{{else catch}}fallback{{/try}}-after`);

    this.assertHTML('before-fallback-after');
    this.assertStableRerender();
  }

  @test
  'a plain else block works as a catch branch'() {
    this.render(`{{#try}}{{throw-if true "x"}}{{else}}fallback{{/try}}`);

    this.assertHTML('fallback');
    this.assertStableRerender();
  }

  @test
  'a try region with no catch branch renders nothing on error'() {
    this.render(`a{{#try}}{{throw-if true "x"}}{{/try}}b`);

    this.assertHTML('a<!---->b');
    this.assertStableRerender();
  }

  @test
  'catches errors thrown during update'() {
    this.render(
      `{{#try}}value: {{throw-if this.shouldThrow "later"}}ok{{else catch as |e|}}caught: {{e.message}}{{/try}}`,
      { shouldThrow: false }
    );

    this.assertHTML('value: ok');

    this.rerender({ shouldThrow: true });
    this.assertHTML('caught: later');
  }

  @test
  'recovers when a dependency of the failed render changes back'() {
    this.render(
      `{{#try}}value: {{throw-if this.shouldThrow "later"}}ok{{else catch as |e|}}caught: {{e.message}}{{/try}}`,
      { shouldThrow: false }
    );

    this.assertHTML('value: ok');

    this.rerender({ shouldThrow: true });
    this.assertHTML('caught: later');

    this.rerender({ shouldThrow: false });
    this.assertHTML('value: ok');
  }

  @test
  'catches errors thrown during initial render and recovers on change'() {
    this.render(
      `{{#try}}value: {{throw-if this.shouldThrow "early"}}ok{{else catch as |e|}}caught: {{e.message}}{{/try}}`,
      { shouldThrow: true }
    );

    this.assertHTML('caught: early');

    this.rerender({ shouldThrow: false });
    this.assertHTML('value: ok');
  }

  @test
  'nested try regions catch independently'() {
    this.render(
      `{{#try}}outer-start {{#try}}{{throw-if true "inner"}}{{else catch as |e|}}inner-caught: {{e.message}}{{/try}} outer-end{{else catch}}outer-caught{{/try}}`
    );

    this.assertHTML('outer-start inner-caught: inner outer-end');
    this.assertStableRerender();
  }

  @test
  'an error outside any try region still propagates'() {
    this.assert.throws(() => {
      this.render(`{{throw-if true "unhandled"}}`);
    }, /unhandled/u);
  }

  @test
  'conditionals inside the try branch keep working after recovery'() {
    this.render(
      `{{#try}}{{throw-if this.shouldThrow "x"}}{{#if this.cond}}yes{{else}}no{{/if}}{{else catch}}caught{{/try}}`,
      { shouldThrow: false, cond: true }
    );

    this.assertHTML('yes');

    this.rerender({ shouldThrow: true });
    this.assertHTML('caught');

    this.rerender({ shouldThrow: false, cond: false });
    this.assertHTML('no');

    this.rerender({ cond: true });
    this.assertHTML('yes');
  }
}

jitSuite(TryTest);
