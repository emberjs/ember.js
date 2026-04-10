import {
  GlimmerishComponent,
  jitSuite,
  RenderTest,
  test,
} from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler/runtime';

class KeywordLtRuntime extends RenderTest {
  static suiteName = 'keyword helper: lt (runtime)';

  @test
  'explicit scope'() {
    const compiled = template('{{if (lt a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a: 1, b: 2 }),
    });
    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'implicit scope (eval)'() {
    let a = 1;
    let b = 2;
    hide(a);
    hide(b);
    const compiled = template('{{if (lt a b) "yes" "no"}}', {
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
      a = 1;
      b = 2;
      static {
        template('{{if (lt this.a this.b) "yes" "no"}}', {
          strictMode: true,
          component: this,
        });
      }
    }
    this.renderComponent(Foo);
    this.assertHTML('yes');
  }
}

jitSuite(KeywordLtRuntime);

const hide = (variable: unknown) => {
  new Function(`return (${JSON.stringify(variable)});`);
};
