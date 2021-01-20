import { RenderingTestCase, moduleFor, strip, runTask } from 'internal-test-helpers';

import { set } from '@ember/-internals/metal';

moduleFor(
  'syntax refinements',
  class extends RenderingTestCase {
    ['@test block params should not be refined']() {
      this.registerHelper('foo', () => 'bar helper');

      this.render(
        strip`
      {{#let var as |foo|}}
        {{foo}}
      {{/let}}

      ---

      {{#let var as |outlet|}}
        {{outlet}}
      {{/let}}

      ---

      {{#let var as |mount|}}
        {{mount}}
      {{/let}}

      ---

      {{#let var as |component|}}
        {{component}}
      {{/let}}

      ---

      {{#let var as |input|}}
        {{input}}
      {{/let}}

      ---

      {{#let var as |-with-dynamic-vars|}}
        {{-with-dynamic-vars}}
      {{/let}}

      ---

      {{#let var as |-in-element|}}
        {{-in-element}}
      {{/let}}`,
        { var: 'var' }
      );

      this.assertText('var---var---var---var---var---var---var');

      runTask(() => set(this.context, 'var', 'RARRR!!!'));

      this.assertText('RARRR!!!---RARRR!!!---RARRR!!!---RARRR!!!---RARRR!!!---RARRR!!!---RARRR!!!');

      runTask(() => set(this.context, 'var', 'var'));

      this.assertText('var---var---var---var---var---var---var');
    }
  }
);
