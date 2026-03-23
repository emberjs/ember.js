import { castToBrowser } from '@glimmer/debug-util';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';
import { setHelperManager, helperCapabilities } from '@glimmer/manager';

import { template } from '@ember/template-compiler/runtime';
import { fn } from '@ember/helper';

class KeywordFn extends RenderTest {
  static suiteName = 'keyword helper: fn';

  @test
  'it works with explicit scope'() {
    let greeting = (name: string) => `Hello, ${name}!`;

    const compiled = template('{{fn greeting "World"}}', {
      strictMode: true,
      scope: () => ({
        greeting,
        fn,
      }),
    });

    this.renderComponent(compiled);
    this.assertHTML('Hello, World!');
  }

  @test
  'it works as a keyword (no import needed)'() {
    let greeting = (name: string) => `Hello, ${name}!`;

    const compiled = template('{{fn greeting "World"}}', {
      strictMode: true,
      scope: () => ({
        greeting,
      }),
    });

    this.renderComponent(compiled);
    this.assertHTML('Hello, World!');
  }

  @test
  'it works with the runtime compiler'() {
    let greeting = (name: string) => `Hello, ${name}!`;

    hide(greeting);

    const compiled = template('{{fn greeting "World"}}', {
      strictMode: true,
      eval() {
        return eval(arguments[0]);
      },
    });

    this.renderComponent(compiled);
    this.assertHTML('Hello, World!');
  }

  @test
  'can be shadowed'() {
    let fn = setHelperManager(
      () => ({
        capabilities: helperCapabilities('3.23', { hasValue: true }),
        createHelper() {
          return {};
        },
        getValue() {
          return 'shadowed';
        },
      }),
      {}
    );

    const compiled = template('{{fn "anything"}}', {
      strictMode: true,
      scope: () => ({ fn }),
    });

    this.renderComponent(compiled);
    this.assertHTML('shadowed');
  }
}

jitSuite(KeywordFn);

const hide = (variable: unknown) => {
  new Function(`return (${JSON.stringify(variable)});`);
};
