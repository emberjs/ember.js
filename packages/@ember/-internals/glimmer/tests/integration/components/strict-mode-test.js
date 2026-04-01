import {
  compile,
  moduleFor,
  ApplicationTestCase,
  RenderingTestCase,
  defineSimpleHelper,
  defineSimpleModifier,
} from 'internal-test-helpers';

import { Input, Textarea } from '@ember/component';
import { LinkTo } from '@ember/routing';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import templateOnly from '@ember/component/template-only';
import { hash, array, concat, get, on, fn } from '@glimmer/runtime';
import GlimmerishComponent from '../../utils/glimmerish-component';

moduleFor(
  'Strict Mode',
  class extends RenderingTestCase {
    '@test Can use a component in scope'() {
      let Foo = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());
      let Bar = setComponentTemplate(
        precompileTemplate('<Foo/>', { strictMode: true, scope: () => ({ Foo }) }),
        templateOnly()
      );

      this.owner.register('component:bar', Bar);

      this.render('<Bar/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use a custom helper in scope (in append position)'() {
      let foo = defineSimpleHelper(() => 'Hello, world!');
      let Bar = setComponentTemplate(
        precompileTemplate('{{foo}}', { strictMode: true, scope: () => ({ foo }) }),
        templateOnly()
      );

      this.owner.register('component:bar', Bar);

      this.render('<Bar/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use a custom modifier in scope'() {
      let foo = defineSimpleModifier((element) => (element.innerHTML = 'Hello, world!'));
      let Bar = setComponentTemplate(
        precompileTemplate('<div {{foo}}></div>', { strictMode: true, scope: () => ({ foo }) }),
        templateOnly()
      );

      this.owner.register('component:bar', Bar);

      this.render('<Bar/>');
      this.assertHTML('<div>Hello, world!</div>');
      this.assertStableRerender();
    }

    '@test Can shadow keywords'() {
      let ifComponent = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());
      let Bar = setComponentTemplate(
        compile('{{#if}}{{/if}}', { strictMode: true }, { if: ifComponent }),
        templateOnly()
      );

      this.owner.register('component:bar', Bar);

      this.render('<Bar/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use constant values in ambiguous helper/component position'() {
      let value = 'Hello, world!';

      let Foo = setComponentTemplate(
        precompileTemplate('{{value}}', { strictMode: true, scope: () => ({ value }) }),
        templateOnly()
      );

      this.owner.register('component:foo', Foo);

      this.render('<Foo/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use inline if and unless in strict mode templates'() {
      let Foo = setComponentTemplate(
        precompileTemplate('{{if true "foo" "bar"}}{{unless true "foo" "bar"}}'),
        templateOnly()
      );

      this.owner.register('component:foo', Foo);

      this.render('<Foo/>');
      this.assertHTML('foobar');
      this.assertStableRerender();
    }

    '@test Can use a dynamic component definition'() {
      let Foo = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());
      let Bar = setComponentTemplate(
        precompileTemplate('<this.Foo/>'),
        class extends GlimmerishComponent {
          Foo = Foo;
        }
      );

      this.owner.register('component:bar', Bar);

      this.render('<Bar/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use a dynamic component definition (curly)'() {
      let Foo = setComponentTemplate(precompileTemplate('Hello, world!'), templateOnly());
      let Bar = setComponentTemplate(
        precompileTemplate('{{this.Foo}}'),
        class extends GlimmerishComponent {
          Foo = Foo;
        }
      );

      this.owner.register('component:bar', Bar);

      this.render('<Bar/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use a dynamic helper definition'() {
      let foo = defineSimpleHelper(() => 'Hello, world!');
      let Bar = setComponentTemplate(
        precompileTemplate('{{this.foo}}'),
        class extends GlimmerishComponent {
          foo = foo;
        }
      );

      this.owner.register('component:bar', Bar);

      this.render('<Bar/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use a curried dynamic helper'() {
      let foo = defineSimpleHelper((value) => value);
      let Foo = setComponentTemplate(precompileTemplate('{{@value}}'), templateOnly());
      let Bar = setComponentTemplate(
        precompileTemplate('<Foo @value={{helper foo "Hello, world!"}}/>', {
          strictMode: true,
          scope: () => ({ Foo, foo }),
        }),
        templateOnly()
      );

      this.owner.register('component:bar', Bar);

      this.render('<Bar/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use a curried dynamic modifier'() {
      let foo = defineSimpleModifier((element, [text]) => (element.innerHTML = text));
      let Foo = setComponentTemplate(precompileTemplate('<div {{@value}}></div>'), templateOnly());
      let Bar = setComponentTemplate(
        precompileTemplate('<Foo @value={{modifier foo "Hello, world!"}}/>', {
          strictMode: true,
          scope: () => ({ Foo, foo }),
        }),
        templateOnly()
      );

      this.owner.register('component:bar', Bar);

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
      let Foo = setComponentTemplate(
        precompileTemplate('<Input/>', { strictMode: true, scope: () => ({ Input }) }),
        templateOnly()
      );

      this.owner.register('component:foo', Foo);

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
      let Foo = setComponentTemplate(
        precompileTemplate('<Textarea/>', { strictMode: true, scope: () => ({ Textarea }) }),
        templateOnly()
      );

      this.owner.register('component:foo', Foo);

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
      let Foo = setComponentTemplate(
        precompileTemplate(
          '{{#let (hash value="Hello, world!") as |hash|}}{{hash.value}}{{/let}}',
          { strictMode: true, scope: () => ({ hash }) }
        ),
        templateOnly()
      );

      this.owner.register('component:foo', Foo);

      this.render('<Foo/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use array'() {
      let Foo = setComponentTemplate(
        precompileTemplate('{{#each (array "Hello, world!") as |value|}}{{value}}{{/each}}', {
          strictMode: true,
          scope: () => ({ array }),
        }),
        templateOnly()
      );

      this.owner.register('component:foo', Foo);

      this.render('<Foo/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use concat'() {
      let Foo = setComponentTemplate(
        precompileTemplate('{{(concat "Hello" ", " "world!")}}', {
          strictMode: true,
          scope: () => ({ concat }),
        }),
        templateOnly()
      );

      this.owner.register('component:foo', Foo);

      this.render('<Foo/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use get'() {
      let Foo = setComponentTemplate(
        precompileTemplate(
          '{{#let (hash value="Hello, world!") as |hash|}}{{(get hash "value")}}{{/let}}',
          { strictMode: true, scope: () => ({ hash, get }) }
        ),
        templateOnly()
      );

      this.owner.register('component:foo', Foo);

      this.render('<Foo/>');
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    '@test Can use on and fn'(assert) {
      assert.expect(1);

      let handleClick = (value) => {
        assert.equal(value, 123);
      };

      let Foo = setComponentTemplate(
        precompileTemplate('<button {{on "click" (fn handleClick 123)}}>Click</button>', {
          strictMode: true,
          scope: () => ({ on, fn, handleClick }),
        }),
        templateOnly()
      );

      this.owner.register('component:foo', Foo);

      this.render('<Foo/>');
      this.click('button');
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

      let Foo = setComponentTemplate(
        precompileTemplate('{{#each-in obj as |k v|}}[{{k}}:{{v}}]{{/each-in}}', {
          strictMode: true,
          scope: () => ({ obj }),
        }),
        templateOnly()
      );

      this.owner.register('component:foo', Foo);

      this.render('<Foo/>');
      this.assertHTML('[foo:FOO][bar:BAR]');
      this.assertStableRerender();
    }

    '@test Can use in-element'() {
      let getElement = (id) => document.getElementById(id);

      let Foo = setComponentTemplate(
        precompileTemplate(
          '{{#in-element (getElement "in-element-test")}}before{{/in-element}}after',
          { strictMode: true, scope: () => ({ getElement }) }
        ),
        templateOnly()
      );

      this.owner.register('component:foo', Foo);

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
      let Foo = setComponentTemplate(
        precompileTemplate('<LinkTo @route="index">Index</LinkTo>', {
          strictMode: true,
          scope: () => ({ LinkTo }),
        }),
        templateOnly()
      );

      this.add('component:foo', Foo);
      this.add('template:index', precompileTemplate(`<Foo/>`));

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
