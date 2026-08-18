import { moduleFor, RenderingTestCase, strip, equalTokens, runTask } from 'internal-test-helpers';

import { set } from '@ember/object';

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
