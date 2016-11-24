import { moduleFor, RenderingTest } from '../../utils/test-case';
import { equalTokens } from '../../utils/test-helpers';
import { strip } from '../../utils/abstract-test-case';
import Component from '../../../component';
import { set } from 'ember-metal';

moduleFor('{{-render-portal}}', class extends RenderingTest {
  ['@test allows rendering into an external element'](assert) {
    let someElement = document.createElement('div');

    this.render(strip`
      {{#-render-portal someElement}}
        {{text}}
      {{/-render-portal}}
    `, {
      someElement,
      text: 'Whoop!'
    });

    equalTokens(this.element, '<!--portal-->');
    equalTokens(someElement, 'Whoop!');

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'text', 'Huzzah!!'));

    equalTokens(this.element, '<!--portal-->');
    equalTokens(someElement, 'Huzzah!!');

    this.runTask(() => set(this.context, 'text', 'Whoop!'));

    equalTokens(this.element, '<!--portal-->');
    equalTokens(someElement, 'Whoop!');
  }

  ['@test allows rendering in place'](assert) {
    let someElement = document.createElement('div');

    this.render(strip`
      {{#-render-portal someElement}}
        {{text}}
      {{/-render-portal}}
    `, {
      someElement: null,
      text: 'Whoop!'
    });

    equalTokens(this.element, '<!--portal-->Whoop!');
    equalTokens(someElement, '');

    this.assertStableRerender();

    this.runTask(() => {
      set(this.context, 'text', 'Huzzah!!');
      set(this.context, 'someElement', someElement);
    });

    equalTokens(this.element, '<!--portal-->');
    equalTokens(someElement, 'Huzzah!!');
  }

  ['@test components are cleaned up properly'](assert) {
    let hooks = [ ];

    let someElement = document.createElement('div');

    this.registerComponent('modal-display', {
      ComponentClass: Component.extend({
        didInsertElement() {
          hooks.push('didInsertElement');
        },

        willDestroyElement() {
          hooks.push('willDestroyElement');
        }
      }),

      template: `{{text}}`
    });

    this.render(strip`
      {{#if showModal}}
        {{#-render-portal someElement}}
          {{modal-display text=text}}
        {{/-render-portal}}
      {{/if}}
    `, {
      someElement,
      text: 'Whoop!',
      showModal: false
    });

    equalTokens(this.element, '<!---->');
    equalTokens(someElement, '');

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'showModal', true));

    equalTokens(this.element, '<!--portal-->');
    this.assertComponentElement(someElement.firstChild, { content: 'Whoop!' });

    this.runTask(() => set(this.context, 'text', 'Huzzah!'));

    equalTokens(this.element, '<!--portal-->');
    this.assertComponentElement(someElement.firstChild, { content: 'Huzzah!' });

    this.runTask(() => set(this.context, 'text', 'Whoop!'));

    equalTokens(this.element, '<!--portal-->');
    this.assertComponentElement(someElement.firstChild, { content: 'Whoop!' });

    this.runTask(() => set(this.context, 'showModal', false));

    equalTokens(this.element, '<!---->');
    equalTokens(someElement, '');

    assert.deepEqual(hooks, ['didInsertElement', 'willDestroyElement']);
  }
});
