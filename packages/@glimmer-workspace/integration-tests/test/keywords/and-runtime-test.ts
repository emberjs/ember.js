import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler/runtime';

class KeywordAndRuntime extends RenderTest {
  static suiteName = 'keyword helper: and (runtime)';

  @test
  'explicit scope'() {
    const compiled = template('{{if (and a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a: true, b: true }),
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'explicit scope (shadowed)'() {
    const compiled = template('{{if (and a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ and: () => false, a: true, b: true }),
    });

    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test
  'implicit scope (eval)'() {
    let a = true;
    let b = 'hello';

    hide(a);
    hide(b);

    const compiled = template('{{if (and a b) "yes" "no"}}', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'returns falsy when one arg is falsy'() {
    const compiled = template('{{if (and a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a: true, b: 0 }),
    });

    this.renderComponent(compiled);
    this.assertHTML('no');
  }
}

jitSuite(KeywordAndRuntime);

const hide = (variable: unknown) => {
  new Function(`return (${JSON.stringify(variable)});`);
};
