import { DEBUG } from '@glimmer/env';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler';

class KeywordAnd extends RenderTest {
  static suiteName = 'keyword helper: and';

  @test
  'explicit scope'() {
    let a = 'yes';
    let b = 'second';

    const compiled = template('{{and a b}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('second');
  }

  @test
  'explicit scope (shadowed)'() {
    let a = 'yes';
    let b = true;
    let and = () => 'surprise';
    const compiled = template('{{and a b}}', {
      strictMode: true,
      scope: () => ({ and, a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('surprise');
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
  'returns first falsy value'() {
    let a = 0;
    let b = 'hello';
    const compiled = template('{{and a b}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('0');
  }

  @test
  'works as a SubExpression with if'() {
    let a = true;
    let b = true;
    const compiled = template('{{if (and a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'treats empty array as falsy'() {
    let a = true;
    let b: unknown[] = [];
    const compiled = template('{{if (and a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test({ skip: !DEBUG })
  'throws if called with less than two arguments'(assert: Assert) {
    let a = true;
    const compiled = template('{{and a}}', {
      strictMode: true,
      scope: () => ({ a }),
    });

    assert.throws(() => {
      this.renderComponent(compiled);
    }, /`and` expects at least two arguments/);
  }
}

jitSuite(KeywordAnd);

const hide = (variable: unknown) => {
  new Function(`return (${JSON.stringify(variable)});`);
};
