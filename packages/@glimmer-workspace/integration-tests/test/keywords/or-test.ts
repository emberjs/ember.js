import { DEBUG } from '@glimmer/env';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler';
import { or } from '@ember/helper';

class KeywordOr extends RenderTest {
  static suiteName = 'keyword helper: or';

  @test
  'returns first truthy value'() {
    let a = false;
    let b = 'hello';
    const compiled = template('{{or a b}}', {
      strictMode: true,
      scope: () => ({ or, a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('hello');
  }

  @test
  'returns right-most value when all are falsy'() {
    let a = 0;
    let b = '';
    const compiled = template('{{or a b}}', {
      strictMode: true,
      scope: () => ({ or, a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('');
  }

  @test
  'works as a SubExpression with if'() {
    let a = false;
    let b = true;
    const compiled = template('{{if (or a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ or, a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('yes');
  }

  @test
  'treats empty array as falsy'() {
    let a: unknown[] = [];
    let b = false;
    const compiled = template('{{if (or a b) "yes" "no"}}', {
      strictMode: true,
      scope: () => ({ or, a, b }),
    });

    this.renderComponent(compiled);
    this.assertHTML('no');
  }

  @test({ skip: !DEBUG })
  'throws if called with less than two arguments'(assert: Assert) {
    let a = true;
    const compiled = template('{{or a}}', {
      strictMode: true,
      scope: () => ({ or, a }),
    });

    assert.throws(() => {
      this.renderComponent(compiled);
    }, /`or` expects at least two arguments/);
  }
}

jitSuite(KeywordOr);
