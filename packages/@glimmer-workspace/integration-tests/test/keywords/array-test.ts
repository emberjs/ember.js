import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { template } from '@ember/template-compiler';

class KeywordArray extends RenderTest {
  static suiteName = 'keyword helper: array';

  @test
  'it works'() {
    const compiled = template('{{JSON.stringify (array "hello" "goodbye")}}', {
      strictMode: true,
      scope: () => ({ JSON }),
    });

    this.renderComponent(compiled);
    this.assertHTML('["hello","goodbye"]');
  }

  @test
  'it works (shadowed)'() {
    const array = (x: string) => x.toUpperCase();
    const compiled = template('{{array "hello"}}', {
      strictMode: true,
      scope: () => ({ JSON, array }),
    });

    this.renderComponent(compiled);
    this.assertHTML('HELLO');
  }
}

jitSuite(KeywordArray);

/**
 * The transpiler removes variables that look unused.
 * Putting the variable in an expression that the transpiler keeps
 * hides it from the transpiler without doing anything else with it.
 *
 * It's a bit of a hack, but it's necessary for testing.
 *
 * @param variable The variable to hide.
 */
const hide = (variable: unknown) => {
  new Function(`return (${JSON.stringify(variable)});`);
};
