import { castToBrowser } from '@glimmer/debug-util';
import {
  GlimmerishComponent,
  jitSuite,
  RenderTest,
  test,
} from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler/runtime';

class KeywordElement extends RenderTest {
  static suiteName = 'keyword helper: element (runtime)';

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
  'implicit scope'(assert: Assert) {
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
  'MustacheStatement with explicit scope'(assert: Assert) {
    const Child = template('{{#let @tag as |Tag|}}<Tag>World</Tag>{{/let}}', {
      strictMode: true,
      scope: () => ({}),
    });

    const compiled = template('<Child @tag={{element "span"}} />', {
      strictMode: true,
      scope: () => ({
        Child,
      }),
    });

    this.renderComponent(compiled);

    let span = castToBrowser(this.element, 'div').querySelector('span');
    assert.ok(span, 'span element exists');
    assert.strictEqual(span!.textContent, 'World');
  }

  @test
  'no eval and no scope'(assert: Assert) {
    class Foo extends GlimmerishComponent {
      static {
        template('{{#let (element "h1") as |Tag|}}<Tag>Hello</Tag>{{/let}}', {
          strictMode: true,
          component: this,
        });
      }
    }

    this.renderComponent(Foo);

    let h1 = castToBrowser(this.element, 'div').querySelector('h1');
    assert.ok(h1, 'h1 element exists');
    assert.strictEqual(h1!.textContent, 'Hello');
  }
}

jitSuite(KeywordElement);
