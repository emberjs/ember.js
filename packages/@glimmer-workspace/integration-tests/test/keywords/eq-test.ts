import { DEBUG } from '@glimmer/env';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler';

class KeywordEq extends RenderTest {
  static suiteName = 'keyword helper: eq';

  @test
  'explicit scope'() {
    let a = 1;
    let b = 1;

    const compiled = template('{{eq a b}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('true');
  }

  @test
  'explicit scope (shadowed)'() {
    let a = 1;
    let b = 2;
    let eq = () => 'surprise';
    const compiled = template('{{eq a b}}', {
      strictMode: true,
      scope: () => ({ eq, a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('surprise');
  }

  @test
  'implicit scope (eval)'() {
    let a = 1;
    let b = 1;

    hide(a);
    hide(b);

    const compiled = template('{{if (eq a b) "yes" "no"}}', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'returns true for equal numbers'() {
    let a = 1;
    let b = 1;
    const compiled = template('{{if (eq a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });
    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'returns false for unequal numbers'() {
    let a = 1;
    let b = 2;
    const compiled = template('{{if (eq a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });
    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test
  'returns true for equal strings'() {
    let a = 'hello';
    let b = 'hello';
    const compiled = template('{{if (eq a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });
    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test({ skip: !DEBUG })
  'throws if not called with exactly two arguments'(assert: Assert) {
    let a = 1;
    const compiled = template('{{eq a}}', {
      strictMode: true,
      scope: () => ({ a }),
    });

    assert.throws(() => {
      this.renderComponent(compiled);
    }, /`eq` expects exactly two arguments/);
  }
}

jitSuite(KeywordEq);

const hide = (variable: unknown) => {
  new Function(`return (${JSON.stringify(variable)});`);
};
