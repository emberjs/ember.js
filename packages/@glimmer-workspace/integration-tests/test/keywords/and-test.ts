import { DEBUG } from '@glimmer/env';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler';
import { and } from '@ember/helper';

class KeywordAnd extends RenderTest {
  static suiteName = 'keyword helper: and';

  @test
  'returns right-most value when all are truthy'() {
    let a = 1;
    let b = 'hello';
    const compiled = template('{{and a b}}', {
      strictMode: true,
      scope: () => ({ and, a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('hello');
  }

  @test
  'returns first falsy value'() {
    let a = 0;
    let b = 'hello';
    const compiled = template('{{and a b}}', {
      strictMode: true,
      scope: () => ({ and, a, b }),
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
      scope: () => ({ and, a, b }),
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
      scope: () => ({ and, a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test({ skip: !DEBUG })
  'throws if called with less than two arguments'(assert: Assert) {
    let a = true;
    const compiled = template('{{and a}}', {
      strictMode: true,
      scope: () => ({ and, a }),
    });

    assert.throws(() => {
      this.renderComponent(compiled);
    }, /`and` expects at least two arguments/);
  }
}

jitSuite(KeywordAnd);
