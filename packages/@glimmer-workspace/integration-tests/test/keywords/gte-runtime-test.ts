import {
  GlimmerishComponent,
  jitSuite,
  RenderTest,
  test,
} from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler/runtime';

class KeywordGteRuntime extends RenderTest {
  static suiteName = 'keyword helper: gte (runtime)';

  @test
  'explicit scope'() {
    const compiled = template('{{if (gte a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a: 2, b: 2 }),
    });
    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'explicit scope (shadowed)'() {
    const compiled = template('{{if (gte a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ gte: () => false, a: 2, b: 2 }),
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
    const compiled = template('{{if (gte a b) "yes" "no"}}', {
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
        template('{{if (gte this.a this.b) "yes" "no"}}', {
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

jitSuite(KeywordGteRuntime);

const hide = (variable: unknown) => {
  new Function(`return (${JSON.stringify(variable)});`);
};
