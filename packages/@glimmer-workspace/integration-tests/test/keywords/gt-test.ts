import { DEBUG } from '@glimmer/env';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler';
import { gt } from '@ember/helper';

class KeywordGt extends RenderTest {
  static suiteName = 'keyword helper: gt';

  @test
  'returns true when first arg is greater'() {
    let a = 3;
    let b = 2;
    const compiled = template('{{if (gt a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ gt, a, b }),
    });
    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'returns false when first arg is equal'() {
    let a = 2;
    let b = 2;
    const compiled = template('{{if (gt a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ gt, a, b }),
    });
    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test
  'returns false when first arg is less'() {
    let a = 1;
    let b = 2;
    const compiled = template('{{if (gt a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ gt, a, b }),
    });
    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test({ skip: !DEBUG })
  'throws if not called with exactly two arguments'(assert: Assert) {
    let a = 1;
    const compiled = template('{{gt a}}', {
      strictMode: true,
      scope: () => ({ gt, a }),
    });

    assert.throws(() => {
      this.renderComponent(compiled);
    }, /`gt` expects exactly two arguments/);
  }
}

jitSuite(KeywordGt);
