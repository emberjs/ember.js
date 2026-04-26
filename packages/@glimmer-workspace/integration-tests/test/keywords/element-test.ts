import { castToBrowser } from '@glimmer/debug-util';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler';

class KeywordElement extends RenderTest {
  static suiteName = 'keyword helper: element';

  @test
  'explicit scope'(assert: Assert) {
    const compiled = template('{{#let (element "h1") as |Tag|}}<Tag>Hello</Tag>{{/let}}', {
      strictMode: true,
      scope: () => ({}),
    });

    this.renderComponent(compiled);

    let h1 = castToBrowser(this.element, 'div').querySelector('h1');
    assert.ok(h1, 'h1 element exists');
    assert.strictEqual(h1!.textContent, 'Hello');
  }

  @test
  'explicit scope (shadowed)'() {
    let element = () => 'surprise';
    const compiled = template('{{element "h1"}}', {
      strictMode: true,
      scope: () => ({ element }),
    });

    this.renderComponent(compiled);
    this.assertHTML('surprise');
  }

  @test
  'implicit scope (eval)'(assert: Assert) {
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
  'MustacheStatement'(assert: Assert) {
    const Child = template('{{#let @tag as |Tag|}}<Tag>World</Tag>{{/let}}', {
      strictMode: true,
      scope: () => ({}),
    });

    const compiled = template('<Child @tag={{element "span"}} />', {
      strictMode: true,
      scope: () => ({ Child }),
    });

    this.renderComponent(compiled);

    let span = castToBrowser(this.element, 'div').querySelector('span');
    assert.ok(span, 'span element exists');
    assert.strictEqual(span!.textContent, 'World');
  }
}

jitSuite(KeywordElement);
