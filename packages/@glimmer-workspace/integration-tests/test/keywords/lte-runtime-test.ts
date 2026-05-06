import {
  GlimmerishComponent,
  jitSuite,
  RenderTest,
  test,
} from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler/runtime';

class KeywordLteRuntime extends RenderTest {
  static suiteName = 'keyword helper: lte (runtime)';

  @test
  'explicit scope'() {
    const compiled = template('{{if (lte a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a: 2, b: 2 }),
    });
    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'explicit scope (shadowed)'() {
    const compiled = template('{{if (lte a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ lte: () => false, a: 2, b: 2 }),
    });
    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test
  'implicit scope (eval)'() {
    let a = 2;
    let b = 2;
    hide(a);
    hide(b);
    const compiled = template('{{if (lte a b) "yes" "no"}}', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });
    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'no eval and no scope'() {
    class Foo extends GlimmerishComponent {
      static {
        template('{{if (lte this.a this.b) "yes" "no"}}', {
          strictMode: true,
          component: this,
        });
      }
      a = 2;
      b = 2;
    }
    this.renderComponent(Foo);
    this.assertHTML('yes');
  }
}

jitSuite(KeywordLteRuntime);

const hide = (variable: unknown) => {
  new Function(`return (${JSON.stringify(variable)});`);
};
