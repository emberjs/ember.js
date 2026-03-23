import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler/runtime';

class KeywordLt extends RenderTest {
  static suiteName = 'keyword helper: lt';

  @test
  'returns true when a < b'() {
    let a = 1;
    let b = 2;

    const compiled = template('{{if (lt a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'returns false when a >= b'() {
    let a = 2;
    let b = 2;

    const compiled = template('{{if (lt a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test
  'it works with the runtime compiler'() {
    let a = 5;
    let b = 10;

    hide(a, b);

    const compiled = template('{{if (lt a b) "yes" "no"}}', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }
}

class KeywordLte extends RenderTest {
  static suiteName = 'keyword helper: lte';

  @test
  'returns true when a <= b'() {
    let a = 2;
    let b = 2;

    const compiled = template('{{if (lte a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'returns false when a > b'() {
    let a = 3;
    let b = 2;

    const compiled = template('{{if (lte a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('no');
  }
}

class KeywordGt extends RenderTest {
  static suiteName = 'keyword helper: gt';

  @test
  'returns true when a > b'() {
    let a = 3;
    let b = 2;

    const compiled = template('{{if (gt a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'returns false when a <= b'() {
    let a = 2;
    let b = 2;

    const compiled = template('{{if (gt a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('no');
  }
}

class KeywordGte extends RenderTest {
  static suiteName = 'keyword helper: gte';

  @test
  'returns true when a >= b'() {
    let a = 2;
    let b = 2;

    const compiled = template('{{if (gte a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'returns false when a < b'() {
    let a = 1;
    let b = 2;

    const compiled = template('{{if (gte a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test
  'it works with the runtime compiler'() {
    let a = 10;
    let b = 5;

    hide(a, b);

    const compiled = template('{{if (gte a b) "yes" "no"}}', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }
}

jitSuite(KeywordLt);
jitSuite(KeywordLte);
jitSuite(KeywordGt);
jitSuite(KeywordGte);

const hide = (...variables: unknown[]) => {
  new Function(`return (${JSON.stringify(variables)});`);
};
