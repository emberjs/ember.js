import { DEBUG } from '@glimmer/env';
import { tracked } from '@glimmer/tracking';
import { RenderingTestCase, moduleFor, runTask } from 'internal-test-helpers';
import { element as elementHelper, hash } from '@ember/helper';
import { on } from '@ember/modifier';
import { template } from '@ember/template-compiler/runtime';

moduleFor(
  'Helpers test: {{element}}',
  class extends RenderingTestCase {
    '@test it renders a tag with the given tag name'() {
      let AComponent = template(
        `{{#let (element "h1") as |Tag|}}<Tag id="content">hello world!</Tag>{{/let}}`,
        { scope: () => ({ element: elementHelper }) }
      );
      this.renderComponent(AComponent, { expect: '<h1 id="content">hello world!</h1>' });
    }

    '@test it does not render any tags when passed an empty string'() {
      let AComponent = template(
        `{{#let (element "") as |Tag|}}<Tag id="content">hello world!</Tag>{{/let}}`,
        { scope: () => ({ element: elementHelper }) }
      );
      this.renderComponent(AComponent, { expect: 'hello world!' });
    }

    ['@test it throws when passed null']() {
      if (!DEBUG) {
        this.assert.expect(0);
        return;
      }

      let nil = null;
      this.assert.throws(() => {
        let AComponent = template(`{{#let (element nil) as |Tag|}}<Tag>hello</Tag>{{/let}}`, {
          scope: () => ({ element: elementHelper, nil }),
        });
        this.renderComponent(AComponent, { expect: '' });
      }, /The argument passed to the `element` helper must be a string/);
    }

    ['@test it throws when passed undefined']() {
      if (!DEBUG) {
        this.assert.expect(0);
        return;
      }

      let undef = undefined;
      this.assert.throws(() => {
        let AComponent = template(`{{#let (element undef) as |Tag|}}<Tag>hello</Tag>{{/let}}`, {
          scope: () => ({ element: elementHelper, undef }),
        });
        this.renderComponent(AComponent, { expect: '' });
      }, /The argument passed to the `element` helper must be a string/);
    }

    '@test it works with element modifiers'() {
      let didClick = () => {};
      let AComponent = template(
        `{{#let (element "button") as |Tag|}}<Tag type="button" id="action" {{on "click" didClick}}>hello world!</Tag>{{/let}}`,
        { scope: () => ({ element: elementHelper, on, didClick }) }
      );
      this.renderComponent(AComponent, {
        expect: '<button type="button" id="action">hello world!</button>',
      });
    }

    '@test it can be rendered multiple times'() {
      let AComponent = template(
        `{{#let (element "h1") as |Tag|}}<Tag id="content-1">hello</Tag><Tag id="content-2">world</Tag><Tag id="content-3">!!!!!</Tag>{{/let}}`,
        { scope: () => ({ element: elementHelper }) }
      );
      this.renderComponent(AComponent, {
        expect:
          '<h1 id="content-1">hello</h1><h1 id="content-2">world</h1><h1 id="content-3">!!!!!</h1>',
      });
    }

    '@test it renders when the tag name changes'() {
      class State {
        @tracked htmlTag = 'h1';
      }

      let state = new State();

      let AComponent = template(
        `{{#let (element state.htmlTag) as |Tag|}}<Tag id="content">hello</Tag>{{/let}}`,
        { scope: () => ({ element: elementHelper, state }) }
      );
      this.renderComponent(AComponent, {
        expect: '<h1 id="content">hello</h1>',
      });

      runTask(() => (state.htmlTag = 'h2'));
      this.assertHTML('<h2 id="content">hello</h2>');

      runTask(() => (state.htmlTag = 'h3'));
      this.assertHTML('<h3 id="content">hello</h3>');

      runTask(() => (state.htmlTag = ''));
      this.assertText('hello');

      runTask(() => (state.htmlTag = 'h1'));
      this.assertHTML('<h1 id="content">hello</h1>');
    }

    '@test it can be passed as argument and works with ...attributes'() {
      let Inner = template(
        `{{#let @tag as |Tag|}}<Tag id="content" ...attributes>{{yield}}</Tag>{{/let}}`,
        { scope: () => ({ element: elementHelper }) }
      );

      let Outer = template(`<Inner @tag={{element "p"}} class="extra">Test</Inner>`, {
        scope: () => ({ Inner, element: elementHelper }),
      });

      this.renderComponent(Outer, { expect: '<p id="content" class="extra">Test</p>' });
    }

    ['@test it requires at least one argument']() {
      if (!DEBUG) {
        this.assert.expect(0);
        return;
      }

      this.assert.throws(() => {
        let AComponent = template(`{{#let (element) as |Tag|}}<Tag>hello</Tag>{{/let}}`, {
          scope: () => ({ element: elementHelper }),
        });
        this.renderComponent(AComponent, { expect: '' });
      }, /The `element` helper takes a single positional argument/);
    }

    ['@test it requires no more than one argument']() {
      if (!DEBUG) {
        this.assert.expect(0);
        return;
      }

      this.assert.throws(() => {
        let AComponent = template(`{{#let (element "h1" "h2") as |Tag|}}<Tag>hello</Tag>{{/let}}`, {
          scope: () => ({ element: elementHelper }),
        });
        this.renderComponent(AComponent, { expect: '' });
      }, /The `element` helper takes a single positional argument/);
    }

    ['@test it does not take any named arguments']() {
      if (!DEBUG) {
        this.assert.expect(0);
        return;
      }

      this.assert.throws(() => {
        let AComponent = template(
          `{{#let (element "h1" id="content") as |Tag|}}<Tag>hello</Tag>{{/let}}`,
          { scope: () => ({ element: elementHelper }) }
        );
        this.renderComponent(AComponent, { expect: '' });
      }, /The `element` helper does not take any named arguments/);
    }

    ['@test it throws when passed a number']() {
      if (!DEBUG) {
        this.assert.expect(0);
        return;
      }

      let num = 123;
      this.assert.throws(() => {
        let AComponent = template(`{{#let (element num) as |Tag|}}<Tag>hello</Tag>{{/let}}`, {
          scope: () => ({ element: elementHelper, num }),
        });
        this.renderComponent(AComponent, { expect: '' });
      }, /The argument passed to the `element` helper must be a string \(you passed `123`\)/);
    }

    ['@test it throws when passed a boolean']() {
      if (!DEBUG) {
        this.assert.expect(0);
        return;
      }

      let bool = false;
      this.assert.throws(() => {
        let AComponent = template(`{{#let (element bool) as |Tag|}}<Tag>hello</Tag>{{/let}}`, {
          scope: () => ({ element: elementHelper, bool }),
        });
        this.renderComponent(AComponent, { expect: '' });
      }, /The argument passed to the `element` helper must be a string \(you passed `false`\)/);
    }

    ['@test it throws when passed an object']() {
      if (!DEBUG) {
        this.assert.expect(0);
        return;
      }

      this.assert.throws(() => {
        let AComponent = template(`{{#let (element (hash)) as |Tag|}}<Tag>hello</Tag>{{/let}}`, {
          scope: () => ({ element: elementHelper, hash }),
        });
        this.renderComponent(AComponent, { expect: '' });
      }, /The argument passed to the `element` helper must be a string/);
    }
  }
);
