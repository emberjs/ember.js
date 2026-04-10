import { castToBrowser } from '@glimmer/debug-util';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler';
import { element } from '@ember/helper';

class KeywordElement extends RenderTest {
  static suiteName = 'keyword helper: element';

  @test
  'it works as a SubExpression'(assert: Assert) {
    const compiled = template('{{#let (element "h1") as |Tag|}}<Tag>Hello</Tag>{{/let}}', {
      strictMode: true,
      scope: () => ({ element }),
    });

    this.renderComponent(compiled);

    let h1 = castToBrowser(this.element, 'div').querySelector('h1');
    assert.ok(h1, 'h1 element exists');
    assert.strictEqual(h1!.textContent, 'Hello');
  }

  @test
  'it works with the runtime compiler'(assert: Assert) {
    hide(element);

    const compiled = template('{{#let (element "h1") as |Tag|}}<Tag>Hello</Tag>{{/let}}', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });

    this.renderComponent(compiled);

    let h1 = castToBrowser(this.element, 'div').querySelector('h1');
    assert.ok(h1, 'h1 element exists');
    assert.strictEqual(h1!.textContent, 'Hello');
  }

  @test
  'it works as a MustacheStatement'(assert: Assert) {
    const Child = template('{{#let @tag as |Tag|}}<Tag>World</Tag>{{/let}}', {
      strictMode: true,
      scope: () => ({}),
    });

    const compiled = template('<Child @tag={{element "span"}} />', {
      strictMode: true,
      scope: () => ({
        element,
        Child,
      }),
    });

    this.renderComponent(compiled);

    let span = castToBrowser(this.element, 'div').querySelector('span');
    assert.ok(span, 'span element exists');
    assert.strictEqual(span!.textContent, 'World');
  }
}

jitSuite(KeywordElement);

/**
 * This function is used to hide a variable from the transpiler, so that it
 * doesn't get removed as "unused". It does not actually do anything with the
 * variable, it just makes it be part of an expression that the transpiler
 * won't remove.
 *
 * It's a bit of a hack, but it's necessary for testing.
 *
 * @param variable The variable to hide.
 */
const hide = (variable: unknown) => {
  new Function(`return (${JSON.stringify(variable)});`);
};
