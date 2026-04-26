import { castToBrowser } from '@glimmer/debug-util';
import {
  GlimmerishComponent,
  jitSuite,
  RenderTest,
  test,
} from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler/runtime';

class KeywordElementRuntime extends RenderTest {
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
  'explicit scope (shadowed)'() {
    const compiled = template('{{element "h1"}}', {
      strictMode: true,
      scope: () => ({ element: () => 'surprise' }),
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

jitSuite(KeywordElementRuntime);
