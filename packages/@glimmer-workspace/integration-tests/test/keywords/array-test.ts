import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler/runtime';
import { array } from '@ember/helper';

class KeywordArray extends RenderTest {
  static suiteName = 'keyword helper: array';

  @test
  'it works with explicit scope'() {
    const compiled = template('{{#each (array "a" "b" "c") as |item|}}{{item}}{{/each}}', {
      strictMode: true,
      scope: () => ({
        array,
      }),
    });

    this.renderComponent(compiled);
    this.assertHTML('abc');
  }

  @test
  'it works as a keyword (no import needed)'() {
    const compiled = template('{{#each (array "a" "b" "c") as |item|}}{{item}}{{/each}}', {
      strictMode: true,
      scope: () => ({}),
    });

    this.renderComponent(compiled);
    this.assertHTML('abc');
  }

  @test
  'it works with the runtime compiler'() {
    const compiled = template('{{#each (array "a" "b" "c") as |item|}}{{item}}{{/each}}', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });

    this.renderComponent(compiled);
    this.assertHTML('abc');
  }
}

jitSuite(KeywordArray);
