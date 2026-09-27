import { DEBUG } from '@glimmer/env';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler';

class KeywordNot extends RenderTest {
  static suiteName = 'keyword helper: not';

  @test
  'explicit scope'() {
    let a = false;

    const compiled = template('{{not a}}', {
      strictMode: true,
      scope: () => ({ a }),
    });

    this.renderComponent(compiled);
    this.assertHTML('true');
  }

  @test
  'explicit scope (shadowed)'() {
    let a = false;
    let not = () => 'surprise';
    const compiled = template('{{not a}}', {
      strictMode: true,
      scope: () => ({ not, a }),
    });

    this.renderComponent(compiled);
    this.assertHTML('surprise');
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
  'returns true for falsy value'() {
    let a = false;
    const compiled = template('{{if (not a) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a }),
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'returns false for truthy value'() {
    let a = true;
    const compiled = template('{{if (not a) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a }),
    });

    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test({ skip: !DEBUG })
  'throws if called with more than one argument'(assert: Assert) {
    let a = true;
    let b = false;
    const compiled = template('{{not a b}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });

    assert.throws(() => {
      this.renderComponent(compiled);
    }, /`not` expects exactly one argument/);
  }
}

jitSuite(KeywordNot);

const hide = (variable: unknown) => {
  new Function(`return (${JSON.stringify(variable)});`);
};
