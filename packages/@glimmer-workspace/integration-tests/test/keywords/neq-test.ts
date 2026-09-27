import { DEBUG } from '@glimmer/env';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler';

class KeywordNeq extends RenderTest {
  static suiteName = 'keyword helper: neq';

  @test
  'explicit scope'() {
    let a = 1;
    let b = 2;

    const compiled = template('{{neq a b}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('true');
  }

  @test
  'explicit scope (shadowed)'() {
    let a = 1;
    let b = 1;
    let neq = () => 'surprise';
    const compiled = template('{{neq a b}}', {
      strictMode: true,
      scope: () => ({ neq, a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('surprise');
  }

  @test
  'implicit scope (eval)'() {
    let a = 1;
    let b = 2;

    hide(a);
    hide(b);

    const compiled = template('{{if (neq a b) "yes" "no"}}', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'returns true for unequal numbers'() {
    let a = 1;
    let b = 2;
    const compiled = template('{{if (neq a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });
    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'returns false for equal numbers'() {
    let a = 1;
    let b = 1;
    const compiled = template('{{if (neq a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });
    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test({ skip: !DEBUG })
  'throws if not called with exactly two arguments'(assert: Assert) {
    let a = 1;
    const compiled = template('{{neq a}}', {
      strictMode: true,
      scope: () => ({ a }),
    });

    assert.throws(() => {
      this.renderComponent(compiled);
    }, /`neq` expects exactly two arguments/);
  }
}

jitSuite(KeywordNeq);

const hide = (variable: unknown) => {
  new Function(`return (${JSON.stringify(variable)});`);
};
