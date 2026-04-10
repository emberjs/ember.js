import { DEBUG } from '@glimmer/env';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler';
import { neq } from '@ember/helper';

class KeywordNeq extends RenderTest {
  static suiteName = 'keyword helper: neq';

  @test
  'returns true for unequal numbers'() {
    let a = 1;
    let b = 2;
    const compiled = template('{{if (neq a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ neq, a, b }),
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
      scope: () => ({ neq, a, b }),
    });
    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test({ skip: !DEBUG })
  'throws if not called with exactly two arguments'(assert: Assert) {
    let a = 1;
    const compiled = template('{{neq a}}', {
      strictMode: true,
      scope: () => ({ neq, a }),
    });

    assert.throws(() => {
      this.renderComponent(compiled);
    }, /`neq` expects exactly two arguments/);
  }
}

jitSuite(KeywordNeq);
