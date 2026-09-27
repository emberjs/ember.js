import { moduleFor, RenderingTestCase } from 'internal-test-helpers';
import { compile } from '../../index';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import templateOnly from '@ember/component/template-only';

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
      let shadowInput = setComponentTemplate(
        precompileTemplate(`It's just {{yield}}`),
        templateOnly()
      );

      let Root = setComponentTemplate(
        precompileTemplate(`{{#let shadowInput as |input|}}{{#input}}an input{{/input}}{{/let}}`, {
          strictMode: true,
          scope: () => ({ shadowInput }),
        }),
        templateOnly()
      );
      this.owner.register('component:root', Root);

      this.render('<Root />');
      this.assertHTML("It's just an input");
      this.assertStableRerender();
    }

    ['@test Lexical scope values are not asserted']() {
      let input = setComponentTemplate(precompileTemplate(`It's just {{yield}}`), templateOnly());

      let Root = setComponentTemplate(
        precompileTemplate(`{{#input}}an input{{/input}}`, {
          strictMode: true,
          scope: () => ({ input }),
        }),
        templateOnly()
      );
      this.owner.register('component:root', Root);

      this.render('<Root />');
      this.assertHTML("It's just an input");
      this.assertStableRerender();
    }
  }
);
