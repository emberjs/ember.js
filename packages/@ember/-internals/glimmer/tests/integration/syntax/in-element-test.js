import { moduleFor, RenderingTestCase } from '../../utils/test-case';
import { equalTokens } from '../../utils/test-helpers';
import { strip } from '../../utils/abstract-test-case';
import { Component } from '@ember/-internals/glimmer';
import { set } from '@ember/-internals/metal';

moduleFor(
  '{{-in-element}}',
  class extends RenderingTestCase {
    ['@test using {{#in-element whatever}} asserts']() {
      // the in-element keyword is not yet public API this test should be removed
      // once https://github.com/emberjs/rfcs/pull/287 lands and is enabled

      let el = document.createElement('div');
      expectAssertion(() => {
        this.render(strip`{{#in-element el}}{{/in-element}}`, { el });
      }, /The {{in-element}} helper cannot be used. \('-top-level' @ L1:C0\)/);
    }

    ['@test allows rendering into an external element']() {
      let someElement = document.createElement('div');

      this.render(
        strip`
      {{#-in-element someElement}}
        {{text}}
      {{/-in-element}}
    `,
        {
          someElement,
          text: 'Whoop!',
        }
      );

      equalTokens(this.element, '<!---->');
      equalTokens(someElement, 'Whoop!');

      this.assertStableRerender();

      this.runTask(() => set(this.context, 'text', 'Huzzah!!'));

      equalTokens(this.element, '<!---->');
      equalTokens(someElement, 'Huzzah!!');

      this.runTask(() => set(this.context, 'text', 'Whoop!'));

      equalTokens(this.element, '<!---->');
      equalTokens(someElement, 'Whoop!');
    }

    ['@test components are cleaned up properly'](assert) {
      let hooks = [];

      let someElement = document.createElement('div');

      this.registerComponent('modal-display', {
        ComponentClass: Component.extend({
          didInsertElement() {
            hooks.push('didInsertElement');
          },

          willDestroyElement() {
            hooks.push('willDestroyElement');
          },
        }),

        template: `{{text}}`,
      });

      this.render(
        strip`
      {{#if showModal}}
        {{#-in-element someElement}}
          {{modal-display text=text}}
        {{/-in-element}}
      {{/if}}
    `,
        {
          someElement,
          text: 'Whoop!',
          showModal: false,
        }
      );

      equalTokens(this.element, '<!---->');
      equalTokens(someElement, '');

      this.assertStableRerender();

      this.runTask(() => set(this.context, 'showModal', true));

      equalTokens(this.element, '<!---->');
      this.assertComponentElement(someElement.firstChild, {
        content: 'Whoop!',
      });

      this.runTask(() => set(this.context, 'text', 'Huzzah!'));

      equalTokens(this.element, '<!---->');
      this.assertComponentElement(someElement.firstChild, {
        content: 'Huzzah!',
      });

      this.runTask(() => set(this.context, 'text', 'Whoop!'));

      equalTokens(this.element, '<!---->');
      this.assertComponentElement(someElement.firstChild, {
        content: 'Whoop!',
      });

      this.runTask(() => set(this.context, 'showModal', false));

      equalTokens(this.element, '<!---->');
      equalTokens(someElement, '');

      assert.deepEqual(hooks, ['didInsertElement', 'willDestroyElement']);
    }
  }
);
