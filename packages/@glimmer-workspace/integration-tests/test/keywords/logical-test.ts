import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler/runtime';

class KeywordAnd extends RenderTest {
  static suiteName = 'keyword helper: and';

  @test
  'returns last value when all truthy'() {
    let a = 'first';
    let b = 'second';

    const compiled = template('{{and a b}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('second');
  }

  @test
  'returns first falsy value'() {
    let a = '';
    let b = 'second';

    const compiled = template('{{if (and a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test
  'it works with the runtime compiler'() {
    const compiled = template('{{if (and true true) "yes" "no"}}', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }
}

class KeywordOr extends RenderTest {
  static suiteName = 'keyword helper: or';

  @test
  'returns first truthy value'() {
    let a = '';
    let b = 'second';

    const compiled = template('{{or a b}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('second');
  }

  @test
  'returns last value when all falsy'() {
    let a = '';
    let b = 0;

    const compiled = template('{{if (or a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test
  'it works with the runtime compiler'() {
    const compiled = template('{{if (or false true) "yes" "no"}}', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }
}

class KeywordNot extends RenderTest {
  static suiteName = 'keyword helper: not';

  @test
  'negates truthy to false'() {
    const compiled = template('{{if (not true) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({}),
    });

    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test
  'negates falsy to true'() {
    const compiled = template('{{if (not false) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({}),
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'it works with the runtime compiler'() {
    const compiled = template('{{if (not false) "yes" "no"}}', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }
}

jitSuite(KeywordAnd);
jitSuite(KeywordOr);
jitSuite(KeywordNot);
