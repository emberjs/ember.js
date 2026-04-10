import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler/runtime';

class KeywordNotRuntime extends RenderTest {
  static suiteName = 'keyword helper: not (runtime)';

  @test
  'explicit scope without import'() {
    const compiled = template('{{if (not a) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a: false }),
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'implicit scope (eval)'() {
    let a = false;

    hide(a);

    const compiled = template('{{if (not a) "yes" "no"}}', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'returns no for truthy'() {
    const compiled = template('{{if (not a) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a: 'hello' }),
    });

    this.renderComponent(compiled);
    this.assertHTML('no');
  }
}

jitSuite(KeywordNotRuntime);

const hide = (variable: unknown) => {
  new Function(`return (${JSON.stringify(variable)});`);
};
