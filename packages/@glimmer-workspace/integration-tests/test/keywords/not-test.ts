import { DEBUG } from '@glimmer/env';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler';
import { not } from '@ember/helper';

class KeywordNot extends RenderTest {
  static suiteName = 'keyword helper: not';

  @test
  'returns true for falsy value'() {
    let a = false;
    const compiled = template('{{if (not a) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ not, a }),
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'returns false for truthy value'() {
    let a = true;
    const compiled = template('{{if (not a) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ not, a }),
    });

    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test
  'works with MustacheStatement'() {
    let a = false;
    const compiled = template('{{not a}}', {
      strictMode: true,
      scope: () => ({ not, a }),
    });

    this.renderComponent(compiled);
    this.assertHTML('true');
  }

  @test({ skip: !DEBUG })
  'throws if called with more than one argument'(assert: Assert) {
    let a = true;
    let b = false;
    const compiled = template('{{not a b}}', {
      strictMode: true,
      scope: () => ({ not, a, b }),
    });

    assert.throws(() => {
      this.renderComponent(compiled);
    }, /`not` expects exactly one argument/);
  }
}

jitSuite(KeywordNot);
