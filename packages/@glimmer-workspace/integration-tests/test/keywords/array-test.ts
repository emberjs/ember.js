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
 * This function is used to hide a variable from the transpiler, so that it
 * doesn't get removed as "unused". It does not actually do anything with the
 * variable, it just makes it be part of an expression that the transpiler
 * won't remove.
 *
 * It's a bit of a hack, but it's necessary for testing.
 *
 * @param variable The variable to hide.
 */
const hide = (variable: unknown) => {
  new Function(`return (${JSON.stringify(variable)});`);
};
