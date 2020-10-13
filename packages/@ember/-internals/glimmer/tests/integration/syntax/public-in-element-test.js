import { moduleFor, RenderingTestCase, strip, equalTokens, runTask } from 'internal-test-helpers';

import { Component } from '@ember/-internals/glimmer';
import { set } from '@ember/-internals/metal';

moduleFor(
  '{{in-element}}',
  class extends RenderingTestCase {
    ['@test allows rendering into an external element']() {
      let someElement = document.createElement('div');

      this.render(
        strip`
          {{#in-element someElement}}
            {{text}}
          {{/in-element}}
        `,
        {
          someElement,
          text: 'Whoop!',
        }
      );

      equalTokens(this.element, '<!---->');
      equalTokens(someElement, 'Whoop!');

      this.assertStableRerender();

      runTask(() => set(this.context, 'text', 'Huzzah!!'));

      equalTokens(this.element, '<!---->');
      equalTokens(someElement, 'Huzzah!!');

      runTask(() => set(this.context, 'text', 'Whoop!'));

      equalTokens(this.element, '<!---->');
      equalTokens(someElement, 'Whoop!');
    }

    ["@test it replaces the external element's content by default"]() {
      let someElement = document.createElement('div');
      someElement.appendChild(document.createTextNode('foo '));

      this.render(
        strip`
          {{#in-element someElement insertBefore=undefined}}
            {{text}}
          {{/in-element}}
        `,
        {
          someElement,
          text: 'bar',
        }
      );

      equalTokens(this.element, '<!---->');
      equalTokens(someElement, 'bar');

      this.assertStableRerender();

      runTask(() => set(this.context, 'text', 'bar!!'));

      equalTokens(this.element, '<!---->');
      equalTokens(someElement, 'bar!!');

      runTask(() => set(this.context, 'text', 'bar'));

      equalTokens(this.element, '<!---->');
      equalTokens(someElement, 'bar');
    }

    ['@test allows appending to the external element with insertBefore=null']() {
      let someElement = document.createElement('div');
      someElement.appendChild(document.createTextNode('foo '));

      this.render(
        strip`
          {{#in-element someElement insertBefore=null}}
            {{text}}
          {{/in-element}}
        `,
        {
          someElement,
          text: 'bar',
        }
      );

      equalTokens(this.element, '<!---->');
      equalTokens(someElement, 'foo bar');

      this.assertStableRerender();

      runTask(() => set(this.context, 'text', 'bar!!'));

      equalTokens(this.element, '<!---->');
      equalTokens(someElement, 'foo bar!!');

      runTask(() => set(this.context, 'text', 'bar'));

      equalTokens(this.element, '<!---->');
      equalTokens(someElement, 'foo bar');
    }

    ['@test does not allow insertBefore=non-null-value']() {
      let someElement = document.createElement('div');

      expectAssertion(() => {
        this.render(
          strip`
            {{#in-element someElement insertBefore=".foo"}}
              {{text}}
            {{/in-element}}
          `,
          {
            someElement,
            text: 'Whoop!',
          }
        );
      }, /Can only pass null to insertBefore in in-element, received:/);
    }

    ['@test does not allow null as a destination element']() {
      let someElement = null;

      expectAssertion(() => {
        this.render(
          strip`
            {{#in-element someElement}}
              {{text}}
            {{/in-element}}
          `,
          {
            someElement,
            text: 'Whoop!',
          }
        );
      }, /You cannot pass a null or undefined destination element to in-element/);
    }

    ['@test does not undefined as a destination element']() {
      let someElement = undefined;

      expectAssertion(() => {
        this.render(
          strip`
            {{#in-element someElement}}
              {{text}}
            {{/in-element}}
          `,
          {
            someElement,
            text: 'Whoop!',
          }
        );
      }, /You cannot pass a null or undefined destination element to in-element/);
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
            {{#in-element someElement}}
              {{modal-display text=text}}
            {{/in-element}}
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

      runTask(() => set(this.context, 'showModal', true));

      equalTokens(this.element, '<!---->');
      this.assertComponentElement(someElement.firstChild, {
        content: 'Whoop!',
      });

      runTask(() => set(this.context, 'text', 'Huzzah!'));

      equalTokens(this.element, '<!---->');
      this.assertComponentElement(someElement.firstChild, {
        content: 'Huzzah!',
      });

      runTask(() => set(this.context, 'text', 'Whoop!'));

      equalTokens(this.element, '<!---->');
      this.assertComponentElement(someElement.firstChild, {
        content: 'Whoop!',
      });

      runTask(() => set(this.context, 'showModal', false));

      equalTokens(this.element, '<!---->');
      equalTokens(someElement, '');

      assert.deepEqual(hooks, ['didInsertElement', 'willDestroyElement']);
    }

    ['@test appending to the root element should not cause double clearing']() {
      this.render(
        strip`
          Before
          {{#in-element this.rootElement insertBefore=null}}
            {{this.text}}
          {{/in-element}}
          After
        `,
        {
          rootElement: this.element,
          text: 'Whoop!',
        }
      );

      equalTokens(this.element, 'BeforeWhoop!<!---->After');

      this.assertStableRerender();

      runTask(() => set(this.context, 'text', 'Huzzah!'));

      equalTokens(this.element, 'BeforeHuzzah!<!---->After');

      // teardown happens in afterEach and should not cause double-clearing error
    }
  }
);
