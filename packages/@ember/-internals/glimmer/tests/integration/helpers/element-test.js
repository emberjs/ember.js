import { set } from '@ember/object';
import { DEBUG } from '@glimmer/env';
import { RenderingTestCase, defineComponent, moduleFor, runTask } from 'internal-test-helpers';
import { element as elementHelper } from '@ember/helper';

moduleFor(
  'Helpers test: {{element}}',
  class extends RenderingTestCase {
    '@test it renders a tag with the given tag name'() {
      this.render(`{{#let (element "h1") as |Tag|}}<Tag id="content">hello world!</Tag>{{/let}}`);
      this.assertHTML('<h1 id="content">hello world!</h1>');
    }

    '@test it renders a tag in strict mode'() {
      let AComponent = defineComponent(
        { element: elementHelper },
        `{{#let (element "h1") as |Tag|}}<Tag id="content">hello world!</Tag>{{/let}}`
      );
      this.renderComponent(AComponent, { expect: '<h1 id="content">hello world!</h1>' });
    }

    '@test it does not render any tags when passed an empty string'() {
      this.render(`{{#let (element "") as |Tag|}}<Tag id="content">hello world!</Tag>{{/let}}`);
      this.assertText('hello world!');
    }

    ['@test it throws when passed null']() {
      if (!DEBUG) {
        this.assert.expect(0);
        return;
      }

      this.assert.throws(() => {
        this.render(
          `<div>{{#let (element null) as |Tag|}}<Tag id="content">hello world!</Tag>{{/let}}</div>`
        );
      }, /The argument passed to the `element` helper must be a string/);
    }

    ['@test it throws when passed undefined']() {
      if (!DEBUG) {
        this.assert.expect(0);
        return;
      }

      this.assert.throws(() => {
        this.render(
          `<div>{{#let (element undefined) as |Tag|}}<Tag id="content">hello world!</Tag>{{/let}}</div>`
        );
      }, /The argument passed to the `element` helper must be a string/);
    }

    '@test it works with element modifiers'() {
      this.render(
        `{{#let (element "button") as |Tag|}}<Tag type="button" id="action" {{on "click" this.didClick}}>hello world!</Tag>{{/let}}`,
        { didClick: () => {} }
      );

      this.assertHTML('<button type="button" id="action">hello world!</button>');
    }

    '@test it can be rendered multiple times'() {
      this.render(
        `{{#let (element "h1") as |Tag|}}<Tag id="content-1">hello</Tag><Tag id="content-2">world</Tag><Tag id="content-3">!!!!!</Tag>{{/let}}`
      );
      this.assertHTML(
        '<h1 id="content-1">hello</h1><h1 id="content-2">world</h1><h1 id="content-3">!!!!!</h1>'
      );
    }

    '@test it renders when the tag name changes'() {
      // Note: use htmlTag instead of tagName, because RenderingTestCase
      // overrides tagName on the root component context
      this.render(`{{#let (element this.htmlTag) as |Tag|}}<Tag id="content">hello</Tag>{{/let}}`, {
        htmlTag: 'h1',
      });
      this.assertHTML('<h1 id="content">hello</h1>');

      runTask(() => set(this.context, 'htmlTag', 'h2'));
      this.assertHTML('<h2 id="content">hello</h2>');

      runTask(() => set(this.context, 'htmlTag', 'h3'));
      this.assertHTML('<h3 id="content">hello</h3>');

      runTask(() => set(this.context, 'htmlTag', ''));
      this.assertText('hello');

      runTask(() => set(this.context, 'htmlTag', 'h1'));
      this.assertHTML('<h1 id="content">hello</h1>');
    }

    '@test it can be passed as argument and works with ...attributes'() {
      let Inner = defineComponent(
        { element: elementHelper },
        `{{#let @tag as |Tag|}}<Tag id="content" ...attributes>{{yield}}</Tag>{{/let}}`
      );

      this.registerComponent('inner', { ComponentClass: Inner });

      this.render(`<Inner @tag={{element this.htmlTag}} class="extra">Test</Inner>`, {
        htmlTag: 'p',
      });
      this.assertHTML('<p id="content" class="extra">Test</p>');

      runTask(() => set(this.context, 'htmlTag', 'div'));
      this.assertHTML('<div id="content" class="extra">Test</div>');

      runTask(() => set(this.context, 'htmlTag', ''));
      this.assertText('Test');

      runTask(() => set(this.context, 'htmlTag', 'p'));
      this.assertHTML('<p id="content" class="extra">Test</p>');
    }

    ['@test it requires at least one argument']() {
      if (!DEBUG) {
        this.assert.expect(0);
        return;
      }

      this.assert.throws(() => {
        this.render(
          `<div>{{#let (element) as |Tag|}}<Tag id="content">hello world!</Tag>{{/let}}</div>`
        );
      }, /The `element` helper takes a single positional argument/);
    }

    ['@test it requires no more than one argument']() {
      if (!DEBUG) {
        this.assert.expect(0);
        return;
      }

      this.assert.throws(() => {
        this.render(
          `<div>{{#let (element "h1" "h2") as |Tag|}}<Tag id="content">hello world!</Tag>{{/let}}</div>`
        );
      }, /The `element` helper takes a single positional argument/);
    }

    ['@test it does not take any named arguments']() {
      if (!DEBUG) {
        this.assert.expect(0);
        return;
      }

      this.assert.throws(() => {
        this.render(
          `<div>{{#let (element "h1" id="content") as |Tag|}}<Tag id="content">hello world!</Tag>{{/let}}</div>`
        );
      }, /The `element` helper does not take any named arguments/);
    }

    ['@test it throws when passed a number']() {
      if (!DEBUG) {
        this.assert.expect(0);
        return;
      }

      this.assert.throws(() => {
        this.render(
          `<div>{{#let (element 123) as |Tag|}}<Tag id="content">hello world!</Tag>{{/let}}</div>`
        );
      }, /The argument passed to the `element` helper must be a string \(you passed `123`\)/);
    }

    ['@test it throws when passed a boolean']() {
      if (!DEBUG) {
        this.assert.expect(0);
        return;
      }

      this.assert.throws(() => {
        this.render(
          `<div>{{#let (element false) as |Tag|}}<Tag id="content">hello world!</Tag>{{/let}}</div>`
        );
      }, /The argument passed to the `element` helper must be a string \(you passed `false`\)/);
    }

    ['@test it throws when passed an object']() {
      if (!DEBUG) {
        this.assert.expect(0);
        return;
      }

      this.assert.throws(() => {
        this.render(
          `<div>{{#let (element (hash)) as |Tag|}}<Tag id="content">hello world!</Tag>{{/let}}</div>`
        );
      }, /The argument passed to the `element` helper must be a string/);
    }
  }
);
