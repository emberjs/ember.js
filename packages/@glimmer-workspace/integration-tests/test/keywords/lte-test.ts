import { DEBUG } from '@glimmer/env';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler';
import { lte } from '@ember/helper';

class KeywordLte extends RenderTest {
  static suiteName = 'keyword helper: lte';

  @test
  'returns true when first arg is less'() {
    let a = 1;
    let b = 2;
    const compiled = template('{{if (lte a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ lte, a, b }),
    });
    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'returns true when first arg is equal'() {
    let a = 2;
    let b = 2;
    const compiled = template('{{if (lte a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ lte, a, b }),
    });
    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'returns false when first arg is greater'() {
    let a = 3;
    let b = 2;
    const compiled = template('{{if (lte a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ lte, a, b }),
    });
    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test({ skip: !DEBUG })
  'throws if not called with exactly two arguments'(assert: Assert) {
    let a = 1;
    const compiled = template('{{lte a}}', {
      strictMode: true,
      scope: () => ({ lte, a }),
    });

    assert.throws(() => {
      this.renderComponent(compiled);
    }, /`lte` expects exactly two arguments/);
  }
}

jitSuite(KeywordLte);
