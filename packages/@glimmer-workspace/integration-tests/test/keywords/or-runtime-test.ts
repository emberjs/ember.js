import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler/runtime';

class KeywordOrRuntime extends RenderTest {
  static suiteName = 'keyword helper: or (runtime)';

  @test
  'explicit scope'() {
    const compiled = template('{{if (or a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a: false, b: true }),
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'explicit scope (shadowed)'() {
    const compiled = template('{{if (or a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ or: () => false, a: true, b: true }),
    });

    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test
  'implicit scope (eval)'() {
    let a = false;
    let b = 'hello';

    hide(a);
    hide(b);

    const compiled = template('{{if (or a b) "yes" "no"}}', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'returns no when all falsy'() {
    const compiled = template('{{if (or a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a: false, b: 0 }),
    });

    this.renderComponent(compiled);
    this.assertHTML('no');
  }
}

jitSuite(KeywordOrRuntime);

const hide = (variable: unknown) => {
  new Function(`return (${JSON.stringify(variable)});`);
};
