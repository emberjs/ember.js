import {
  AbstractStrictTestCase,
  assertClassicComponentElement,
  assertHTML,
  buildOwner,
  clickElement,
  defComponent,
  defineComponent,
  defineSimpleHelper,
  defineSimpleModifier,
  moduleFor,
  type ClassicComponentShape,
} from 'internal-test-helpers';

import { Input, Textarea } from '@ember/component';
import { array, concat, fn, get, hash, on } from '@glimmer/runtime';
import GlimmerishComponent from '../../utils/glimmerish-component';

import { run } from '@ember/runloop';
import { associateDestroyableChild } from '@glimmer/destroyable';
import type { RenderResult } from '@glimmer/interfaces';
import { renderComponent } from '../../../lib/renderer';

class RenderComponentTestCase extends AbstractStrictTestCase {
  component: RenderResult | undefined;
  owner: object;

  constructor(assert: QUnit['assert']) {
    super(assert);

    this.owner = buildOwner({});
    associateDestroyableChild(this, this.owner);
  }

  get element() {
    return document.querySelector('#qunit-fixture')!;
  }

  renderComponent(
    component: object,
    options: { expect: string } | { classic: ClassicComponentShape }
  ) {
    let { owner } = this;

    run(() => {
      this.component = renderComponent(component, {
        owner,
        env: { document: document, isInteractive: true, hasDOM: true },
        into: this.element,
      });
      if (this.component) {
        associateDestroyableChild(this, this.component);
      }
    });

    if ('expect' in options) {
      assertHTML(options.expect);
    } else {
      assertClassicComponentElement(options.classic);
    }

    this.assertStableRerender();
  }
}

moduleFor(
  'Strict Mode - renderComponent',
  class extends RenderComponentTestCase {
    '@test Can use a component in scope'() {
      let Foo = defComponent('Hello, world!');
      let Root = defComponent('<Foo/>', { scope: { Foo } });

      this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    '@test Can use a custom helper in scope (in append position)'() {
      let foo = defineSimpleHelper(() => 'Hello, world!');
      let Root = defComponent('{{foo}}', { scope: { foo } });

      this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    '@test Can use a custom modifier in scope'() {
      let foo = defineSimpleModifier((element) => (element.innerHTML = 'Hello, world!'));
      let Root = defComponent('<div {{foo}}></div>', { scope: { foo } });

      this.renderComponent(Root, { expect: '<div>Hello, world!</div>' });
    }

    '@test Can shadow keywords'() {
      let ifComponent = defineComponent({}, 'Hello, world!');
      let Bar = defComponent('{{#if}}{{/if}}', { scope: { if: ifComponent } });

      this.renderComponent(Bar, { expect: 'Hello, world!' });
    }

    '@test Can use constant values in ambiguous helper/component position'() {
      let value = 'Hello, world!';

      let Root = defComponent('{{value}}', { scope: { value } });

      this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    '@test Can use inline if and unless in strict mode templates'() {
      let Root = defComponent('{{if true "foo" "bar"}}{{unless true "foo" "bar"}}');

      this.renderComponent(Root, { expect: 'foobar' });
    }

    '@test Can use a dynamic component definition'() {
      let Foo = defComponent('Hello, world!');
      let Root = defComponent('<this.Foo/>', {
        component: class extends GlimmerishComponent {
          Foo = Foo;
        },
      });

      this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    '@test Can use a dynamic component definition (curly)'() {
      let Foo = defComponent('Hello, world!');
      let Root = defComponent('{{this.Foo}}', {
        component: class extends GlimmerishComponent {
          Foo = Foo;
        },
      });

      this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    '@test Can use a dynamic helper definition'() {
      let foo = defineSimpleHelper(() => 'Hello, world!');
      let Root = defComponent('{{this.foo}}', {
        component: class extends GlimmerishComponent {
          foo = foo;
        },
      });

      this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    '@test Can use a curried dynamic helper'() {
      let foo = defineSimpleHelper((value) => value);
      let Foo = defComponent('{{@value}}');
      let Root = defComponent('<Foo @value={{helper foo "Hello, world!"}}/>', {
        scope: { Foo, foo },
      });

      this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    '@test Can use a curried dynamic modifier'() {
      let foo = defineSimpleModifier((element, [text]) => (element.innerHTML = text));
      let Foo = defComponent('<div {{@value}}></div>');
      let Root = defComponent('<Foo @value={{modifier foo "Hello, world!"}}/>', {
        scope: { Foo, foo },
      });

      this.renderComponent(Root, { expect: '<div>Hello, world!</div>' });
    }
  }
);

moduleFor(
  'Strict Mode - renderComponent - built ins',
  class extends RenderComponentTestCase {
    '@test Can use Input'() {
      let Root = defComponent('<Input/>', { scope: { Input } });

      this.renderComponent(Root, {
        classic: {
          tagName: 'input',
          attrs: {
            type: 'text',
            class: 'ember-text-field ember-view',
          },
        },
      });
    }

    '@test Can use Textarea'() {
      let Root = defComponent('<Textarea/>', { scope: { Textarea } });

      this.renderComponent(Root, {
        classic: {
          tagName: 'textarea',
          attrs: {
            class: 'ember-text-area ember-view',
          },
        },
      });
    }

    '@test Can use hash'() {
      let Root = defComponent(
        '{{#let (hash value="Hello, world!") as |hash|}}{{hash.value}}{{/let}}',
        { scope: { hash } }
      );

      this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    '@test Can use array'() {
      let Root = defComponent('{{#each (array "Hello, world!") as |value|}}{{value}}{{/each}}', {
        scope: { array },
      });

      this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    '@test Can use concat'() {
      let Root = defComponent('{{(concat "Hello" ", " "world!")}}', { scope: { concat } });

      this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    '@test Can use get'() {
      let Root = defComponent(
        '{{#let (hash value="Hello, world!") as |hash|}}{{(get hash "value")}}{{/let}}',
        { scope: { hash, get } }
      );

      this.renderComponent(Root, { expect: 'Hello, world!' });
    }

    '@test Can use on and fn'(assert: Assert) {
      let handleClick = (value: unknown) => {
        assert.step('handleClick');
        assert.equal(value, 123);
      };

      let Root = defComponent('<button {{on "click" (fn handleClick 123)}}>Click</button>', {
        scope: { on, fn, handleClick },
      });

      this.renderComponent(Root, { expect: '<button>Click</button>' });

      clickElement('button');

      assert.verifySteps(['handleClick']);
    }

    // Ember currently uses AST plugins to implement certain features that
    // glimmer-vm does not natively provide, such as {{#each-in}}, {{outlet}}
    // {{mount}} and some features in {{#in-element}}. These rewrites the AST
    // and insert private keywords e.g. `{{#each (-each-in)}}`. These tests
    // ensures we have _some_ basic coverage for those features in strict mode.
    //
    // Ultimately, our test coverage for strict mode is quite inadequate. This
    // is particularly important as we expect more apps to start adopting the
    // feature. Ideally we would run our entire/most of our test suite against
    // both strict and resolution modes, and these things would be implicitly
    // covered elsewhere, but until then, these coverage are essential.

    '@test Can use each-in'() {
      let obj = {
        foo: 'FOO',
        bar: 'BAR',
      };

      let Root = defComponent('{{#each-in obj as |k v|}}[{{k}}:{{v}}]{{/each-in}}', {
        scope: { obj },
      });

      this.renderComponent(Root, { expect: '[foo:FOO][bar:BAR]' });
    }

    '@test Can use in-element'() {
      let getElement = (id: string) => document.getElementById(id);

      let Foo = defComponent(
        '{{#in-element (getElement "in-element-test")}}before{{/in-element}}after',
        { scope: { getElement } }
      );
      let Root = defComponent('[<div id="in-element-test" />][<Foo/>]', { scope: { Foo } });

      this.renderComponent(Root, {
        expect: '[<div id="in-element-test">before</div>][<!---->after]',
      });
    }
  }
);
