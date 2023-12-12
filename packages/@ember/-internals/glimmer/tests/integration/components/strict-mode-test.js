import {
  moduleFor,
  ApplicationTestCase,
  RenderingTestCase,
  defineComponent,
  defineSimpleHelper,
  defineSimpleModifier,
} from 'internal-test-helpers';

import { Input, Textarea } from '@ember/component';
import { LinkTo } from '@ember/routing';
import { hash, array, concat, get, on, fn } from '@glimmer/runtime';
import GlimmerishComponent from '../../utils/glimmerish-component';

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
