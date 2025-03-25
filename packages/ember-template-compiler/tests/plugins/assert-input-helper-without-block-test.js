import { defineComponent, moduleFor, RenderingTestCase } from 'internal-test-helpers';
import { compile } from '../../index';

moduleFor(
  'ember-template-compiler: assert-input-helper-without-block',
  class extends RenderingTestCase {
    ['@test Using {{#input}}{{/input}} is not valid']() {
      let expectedMessage = `The {{input}} helper cannot be used in block form. ('baz/foo-bar' @ L1:C0) `;

      expectAssertion(() => {
        compile('{{#input value="123"}}Completely invalid{{/input}}', {
          moduleName: 'baz/foo-bar',
        });
      }, expectedMessage);
    }

    ['@test Block params are not asserted']() {
      let shadowInput = defineComponent({}, `It's just {{yield}}`);

      let Root = defineComponent(
        { shadowInput },
        `{{#let shadowInput as |input|}}{{#input}}an input{{/input}}{{/let}}`
      );
      this.registerComponent('root', { ComponentClass: Root });

      this.render('<Root />');
      this.assertHTML("It's just an input");
      this.assertStableRerender();
    }

    ['@test Lexical scope values are not asserted']() {
      let input = defineComponent({}, `It's just {{yield}}`);

      let Root = defineComponent({ input }, `{{#input}}an input{{/input}}`);
      this.registerComponent('root', { ComponentClass: Root });

      this.render('<Root />');
      this.assertHTML("It's just an input");
      this.assertStableRerender();
    }
  }
);
