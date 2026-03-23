import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler/runtime';

class KeywordEq extends RenderTest {
  static suiteName = 'keyword helper: eq';

  @test
  'it returns true for equal values'() {
    const compiled = template('{{if (eq "a" "a") "yes" "no"}}', {
      strictMode: true,
      scope: () => ({}),
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'it returns false for non-equal values'() {
    const compiled = template('{{if (eq "a" "b") "yes" "no"}}', {
      strictMode: true,
      scope: () => ({}),
    });

    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test
  'it uses strict equality'() {
    let a = 1;
    let b = '1';

    const compiled = template('{{if (eq a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test
  'it works with the runtime compiler'() {
    const compiled = template('{{if (eq "hello" "hello") "match" "no match"}}', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });

    this.renderComponent(compiled);
    this.assertHTML('match');
  }
}

class KeywordNeq extends RenderTest {
  static suiteName = 'keyword helper: neq';

  @test
  'it returns true for non-equal values'() {
    const compiled = template('{{if (neq "a" "b") "yes" "no"}}', {
      strictMode: true,
      scope: () => ({}),
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'it returns false for equal values'() {
    const compiled = template('{{if (neq "a" "a") "yes" "no"}}', {
      strictMode: true,
      scope: () => ({}),
    });

    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test
  'it works with the runtime compiler'() {
    const compiled = template('{{if (neq "a" "b") "different" "same"}}', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });

    this.renderComponent(compiled);
    this.assertHTML('different');
  }
}

jitSuite(KeywordEq);
jitSuite(KeywordNeq);
