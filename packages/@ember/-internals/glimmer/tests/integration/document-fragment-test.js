import { moduleFor, RenderingTestCase, strip, equalTokens, runTask } from 'internal-test-helpers';

import { Component } from '@ember/-internals/glimmer';
import { set } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';

moduleFor(
  '{{documentFragment}}',
  class extends RenderingTestCase {
    ['@test it renders the children of a fragment']() {
      let fragment = document.createDocumentFragment();
      fragment.appendChild(document.createTextNode('hello'));

      this.render('<div>{{this.fragment}}</div>', { fragment });

      equalTokens(this.element, '<div><!---->hello<!----></div>');
      this.assertStableRerender();
      this.assert.strictEqual(fragment.childNodes.length, 0, 'the fragment is empty after render');
    }

    ['@test content rendered into the fragment afterwards stays reactive']() {
      let fragment = document.createDocumentFragment();

      this.render(
        strip`
          <div>{{this.fragment}}</div>
          {{#in-element this.fragment}}[{{this.text}}]{{/in-element}}
        `,
        {
          fragment,
          text: 'Whoop!',
        }
      );

      equalTokens(this.element, '<div><!---->[Whoop!]<!----></div><!---->');
      this.assertStableRerender();

      runTask(() => set(this.context, 'text', 'Huzzah!!'));
      equalTokens(this.element, '<div><!---->[Huzzah!!]<!----></div><!---->');

      runTask(() => set(this.context, 'text', 'Whoop!'));
      equalTokens(this.element, '<div><!---->[Whoop!]<!----></div><!---->');
    }

    ['@test content in a fragment survives the fragment leaving the DOM'](assert) {
      let hooks = [];
      let fragment = document.createDocumentFragment();

      this.owner.register(
        'component:counter',
        setComponentTemplate(
          precompileTemplate('[counter]'),
          class extends Component {
            tagName = '';

            didInsertElement() {
              hooks.push('didInsertElement');
            }

            willDestroyElement() {
              hooks.push('willDestroyElement');
            }
          }
        )
      );

      this.render(
        strip`
          <div>{{#if this.show}}{{this.fragment}}{{/if}}</div>
          {{#in-element this.fragment}}<Counter />{{/in-element}}
        `,
        {
          fragment,
          show: true,
        }
      );

      equalTokens(this.element, '<div><!---->[counter]<!----></div><!---->');
      assert.deepEqual(hooks, ['didInsertElement'], 'the component rendered once');

      runTask(() => set(this.context, 'show', false));

      equalTokens(this.element, '<div><!----></div><!---->');
      assert.strictEqual(fragment.textContent, '[counter]', 'the content is back in the fragment');
      assert.deepEqual(hooks, ['didInsertElement'], 'the component was not destroyed');

      runTask(() => set(this.context, 'show', true));

      equalTokens(this.element, '<div><!---->[counter]<!----></div><!---->');
      assert.deepEqual(hooks, ['didInsertElement'], 'the component was not created again');
    }

    ['@test content survives when the fragment renders inside a yielded block'](assert) {
      let fragment = document.createDocumentFragment();

      this.owner.register(
        'component:toggler',
        setComponentTemplate(
          precompileTemplate('{{#if @shown}}{{yield}}{{/if}}'),
          class extends Component {
            tagName = '';
          }
        )
      );

      this.render(
        strip`
          <div><Toggler @shown={{this.show}}>{{this.fragment}}</Toggler></div>
          {{#in-element this.fragment}}[{{this.text}}]{{/in-element}}
        `,
        {
          fragment,
          show: true,
          text: 'Whoop!',
        }
      );

      equalTokens(this.element, '<div><!---->[Whoop!]<!----></div><!---->');

      runTask(() => set(this.context, 'show', false));
      assert.strictEqual(fragment.textContent, '[Whoop!]', 'the content is back in the fragment');

      runTask(() => set(this.context, 'show', true));
      equalTokens(this.element, '<div><!---->[Whoop!]<!----></div><!---->');

      runTask(() => set(this.context, 'text', 'Huzzah!!'));
      equalTokens(this.element, '<div><!---->[Huzzah!!]<!----></div><!---->');
    }

    ['@test two fragments render as siblings and keep their own content']() {
      let first = document.createDocumentFragment();
      let second = document.createDocumentFragment();

      this.render(
        strip`
          <div>{{this.first}}{{this.second}}</div>
          {{#in-element this.first}}[first:{{this.one}}]{{/in-element}}
          {{#in-element this.second}}[second:{{this.two}}]{{/in-element}}
        `,
        {
          first,
          second,
          one: 'a',
          two: 'b',
        }
      );

      equalTokens(
        this.element,
        '<div><!---->[first:a]<!----><!---->[second:b]<!----></div><!----><!---->'
      );
      this.assertStableRerender();

      runTask(() => set(this.context, 'one', 'c'));
      equalTokens(
        this.element,
        '<div><!---->[first:c]<!----><!---->[second:b]<!----></div><!----><!---->'
      );
    }
  }
);
