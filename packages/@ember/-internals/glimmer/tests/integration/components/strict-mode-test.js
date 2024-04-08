import {
  moduleFor,
  ApplicationTestCase,
  RenderingTestCase,
  defineComponent,
  defineSimpleHelper,
  defineSimpleModifier,
  testUnless,
} from 'internal-test-helpers';

import { Input, Textarea } from '@ember/component';
import { action } from '@ember/object';
import { LinkTo } from '@ember/routing';
import { hash, array, concat, get, on, fn } from '@glimmer/runtime';
import GlimmerishComponent from '../../utils/glimmerish-component';
import { DEPRECATIONS } from '../../../../deprecations';

moduleFor(
  'Strict Mode',
  class extends RenderingTestCase {
    '@test Can use a component in scope'() {
      let Foo = defineComponent({}, 'Hello, world!');
      let Bar = defineComponent({ Foo }, '<Foo/>');

      this.registerComponent('bar', { ComponentClass: Bar });

      this.render('<Bar/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use a custom helper in scope (in append position)'() {
      let foo = defineSimpleHelper(() => 'Hello, world!');
      let Bar = defineComponent({ foo }, '{{foo}}');

      this.registerComponent('bar', { ComponentClass: Bar });

      this.render('<Bar/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use a custom modifier in scope'() {
      let foo = defineSimpleModifier((element) => (element.innerHTML = 'Hello, world!'));
      let Bar = defineComponent({ foo }, '<div {{foo}}></div>');

      this.registerComponent('bar', { ComponentClass: Bar });

      this.render('<Bar/>');
      this.assertHTML('<div>Hello, world!</div>');
      this.assertStableRerender();
    }

    '@test Can shadow keywords'() {
      let ifComponent = defineComponent({}, 'Hello, world!');
      let Bar = defineComponent({ if: ifComponent }, '{{#if}}{{/if}}');

      this.registerComponent('bar', { ComponentClass: Bar });

      this.render('<Bar/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use constant values in ambiguous helper/component position'() {
      let value = 'Hello, world!';

      let Foo = defineComponent({ value }, '{{value}}');

      this.registerComponent('foo', { ComponentClass: Foo });

      this.render('<Foo/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use inline if and unless in strict mode templates'() {
      let Foo = defineComponent({}, '{{if true "foo" "bar"}}{{unless true "foo" "bar"}}');

      this.registerComponent('foo', { ComponentClass: Foo });

      this.render('<Foo/>');
      this.assertHTML('foobar');
      this.assertStableRerender();
    }

    '@test Can use a dynamic component definition'() {
      let Foo = defineComponent({}, 'Hello, world!');
      let Bar = defineComponent(
        {},
        '<this.Foo/>',
        class extends GlimmerishComponent {
          Foo = Foo;
        }
      );

      this.registerComponent('bar', { ComponentClass: Bar });

      this.render('<Bar/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use a dynamic component definition (curly)'() {
      let Foo = defineComponent({}, 'Hello, world!');
      let Bar = defineComponent(
        {},
        '{{this.Foo}}',
        class extends GlimmerishComponent {
          Foo = Foo;
        }
      );

      this.registerComponent('bar', { ComponentClass: Bar });

      this.render('<Bar/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use a dynamic helper definition'() {
      let foo = defineSimpleHelper(() => 'Hello, world!');
      let Bar = defineComponent(
        {},
        '{{this.foo}}',
        class extends GlimmerishComponent {
          foo = foo;
        }
      );

      this.registerComponent('bar', { ComponentClass: Bar });

      this.render('<Bar/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use a curried dynamic helper'() {
      let foo = defineSimpleHelper((value) => value);
      let Foo = defineComponent({}, '{{@value}}');
      let Bar = defineComponent({ Foo, foo }, '<Foo @value={{helper foo "Hello, world!"}}/>');

      this.registerComponent('bar', { ComponentClass: Bar });

      this.render('<Bar/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use a curried dynamic modifier'() {
      let foo = defineSimpleModifier((element, [text]) => (element.innerHTML = text));
      let Foo = defineComponent({}, '<div {{@value}}></div>');
      let Bar = defineComponent({ Foo, foo }, '<Foo @value={{modifier foo "Hello, world!"}}/>');

      this.registerComponent('bar', { ComponentClass: Bar });

      this.render('<Bar/>');
      this.assertHTML('<div>Hello, world!</div>');
      this.assertStableRerender();
    }
  }
);

moduleFor(
  'Strict Mode - built ins',
  class extends RenderingTestCase {
    '@test Can use Input'() {
      let Foo = defineComponent({ Input }, '<Input/>');

      this.registerComponent('foo', { ComponentClass: Foo });

      this.render('<Foo/>');
      this.assertComponentElement(this.firstChild, {
        tagName: 'input',
        attrs: {
          type: 'text',
          class: 'ember-text-field ember-view',
        },
      });
      this.assertStableRerender();
    }

    '@test Can use Textarea'() {
      let Foo = defineComponent({ Textarea }, '<Textarea/>');

      this.registerComponent('foo', { ComponentClass: Foo });

      this.render('<Foo/>');
      this.assertComponentElement(this.firstChild, {
        tagName: 'textarea',
        attrs: {
          class: 'ember-text-area ember-view',
        },
      });
      this.assertStableRerender();
    }

    '@test Can use hash'() {
      let Foo = defineComponent(
        { hash },
        '{{#let (hash value="Hello, world!") as |hash|}}{{hash.value}}{{/let}}'
      );

      this.registerComponent('foo', { ComponentClass: Foo });

      this.render('<Foo/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use array'() {
      let Foo = defineComponent(
        { array },
        '{{#each (array "Hello, world!") as |value|}}{{value}}{{/each}}'
      );

      this.registerComponent('foo', { ComponentClass: Foo });

      this.render('<Foo/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use concat'() {
      let Foo = defineComponent({ concat }, '{{(concat "Hello" ", " "world!")}}');

      this.registerComponent('foo', { ComponentClass: Foo });

      this.render('<Foo/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use get'() {
      let Foo = defineComponent(
        { hash, get },
        '{{#let (hash value="Hello, world!") as |hash|}}{{(get hash "value")}}{{/let}}'
      );

      this.registerComponent('foo', { ComponentClass: Foo });

      this.render('<Foo/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use on and fn'(assert) {
      assert.expect(1);

      let handleClick = (value) => {
        assert.equal(value, 123);
      };

      let Foo = defineComponent(
        { on, fn, handleClick },
        '<button {{on "click" (fn handleClick 123)}}>Click</button>'
      );

      this.registerComponent('foo', { ComponentClass: Foo });

      this.render('<Foo/>');
      this.click('button');
    }

    // Test some of the additional keywords not built-in to glimmer-vm (those
    // we specifically enable them when calling `precompile`)

    [`${testUnless(DEPRECATIONS.DEPRECATE_TEMPLATE_ACTION.isRemoved)} Can use action helper`](
      assert
    ) {
      let called = 0;

      let Foo = defineComponent(
        { on },
        '<button {{on "click" (action "foo")}}>Click</button>',
        class extends GlimmerishComponent {
          @action
          foo() {
            called++;
          }
        }
      );

      this.registerComponent('foo', { ComponentClass: Foo });

      this.render('<Foo/>');
      assert.strictEqual(called, 0);
      this.assertStableRerender();
      assert.strictEqual(called, 0);
      this.click('button');
      assert.strictEqual(called, 1);
    }

    [`${testUnless(DEPRECATIONS.DEPRECATE_TEMPLATE_ACTION.isRemoved)} Can use action modifier`](
      assert
    ) {
      let called = 0;

      let Foo = defineComponent(
        {},
        '<button {{action "foo"}}>Click</button>',
        class extends GlimmerishComponent {
          @action
          foo() {
            called++;
          }
        }
      );

      this.registerComponent('foo', { ComponentClass: Foo });

      this.render('<Foo/>');
      assert.strictEqual(called, 0);
      this.assertStableRerender();
      assert.strictEqual(called, 0);
      this.click('button');
      assert.strictEqual(called, 1);
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

      let Foo = defineComponent({ obj }, '{{#each-in obj as |k v|}}[{{k}}:{{v}}]{{/each-in}}');

      this.registerComponent('foo', { ComponentClass: Foo });

      this.render('<Foo/>');
      this.assertHTML('[foo:FOO][bar:BAR]');
      this.assertStableRerender();
    }

    '@test Can use in-element'() {
      let getElement = (id) => document.getElementById(id);

      let Foo = defineComponent(
        { getElement },
        '{{#in-element (getElement "in-element-test")}}before{{/in-element}}after'
      );

      this.registerComponent('foo', { ComponentClass: Foo });

      this.render('[<div id="in-element-test" />][<Foo/>]');
      this.assertText('[before][after]');
      this.assertStableRerender();
    }
  }
);

moduleFor(
  'Strict Mode - LinkTo',
  class extends ApplicationTestCase {
    '@test Can use LinkTo'() {
      let Foo = defineComponent({ LinkTo }, '<LinkTo @route="index">Index</LinkTo>');

      this.addComponent('foo', { ComponentClass: Foo });
      this.addTemplate('index', `<Foo/>`);

      return this.visit('/').then(() => {
        this.assertComponentElement(this.firstChild, {
          tagName: 'a',
          attrs: { href: '/', class: 'ember-view active' },
          content: 'Index',
        });
      });
    }
  }
);
