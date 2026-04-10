import { DEBUG } from '@glimmer/env';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler';
import { lt } from '@ember/helper';

class KeywordLt extends RenderTest {
  static suiteName = 'keyword helper: lt';

  @test
  'returns true when first arg is less'() {
    let a = 1;
    let b = 2;
    const compiled = template('{{if (lt a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ lt, a, b }),
    });
    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'returns false when first arg is equal'() {
    let a = 2;
    let b = 2;
    const compiled = template('{{if (lt a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ lt, a, b }),
    });
    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test
  'returns false when first arg is greater'() {
    let a = 3;
    let b = 2;
    const compiled = template('{{if (lt a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ lt, a, b }),
    });
    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test({ skip: !DEBUG })
  'throws if not called with exactly two arguments'(assert: Assert) {
    let a = 1;
    const compiled = template('{{lt a}}', {
      strictMode: true,
      scope: () => ({ lt, a }),
    });

    assert.throws(() => {
      this.renderComponent(compiled);
    }, /`lt` expects exactly two arguments/);
  }
}

jitSuite(KeywordLt);
