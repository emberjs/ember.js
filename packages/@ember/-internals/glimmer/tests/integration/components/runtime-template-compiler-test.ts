/* eslint-disable @typescript-eslint/no-unused-vars */
import { template } from '@ember/template-compiler/runtime';
import { RenderingTestCase, defineSimpleModifier, moduleFor } from 'internal-test-helpers';
import GlimmerishComponent from '../../utils/glimmerish-component';

moduleFor(
  'Strict Mode - Runtime Template Compiler',
  class extends RenderingTestCase {
    async '@test Can use a component in scope'() {
      await this.renderComponentModule(() => {
        let Foo = template('Hello, world!', {
          eval: function () {
            return eval(arguments[0]);
          },
        });

        return template('<Foo />', {
          eval: function () {
            return eval(arguments[0]);
          },
        });
      });

      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    async '@test Can use a custom helper in scope (in append position)'() {
      await this.renderComponentModule(() => {
        let foo = () => 'Hello, world!';

        return template('{{foo}}', {
          eval: function () {
            return eval(arguments[0]);
          },
        });
      });

      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    async '@test Can use a custom modifier in scope'() {
      await this.renderComponentModule(() => {
        let foo = defineSimpleModifier((element: Element) => (element.innerHTML = 'Hello, world!'));
        return template('<div {{foo}}></div>', {
          eval: function () {
            return eval(arguments[0]);
          },
        });
      });

      this.assertHTML('<div>Hello, world!</div>');
      this.assertStableRerender();
    }

    async '@test Can shadow keywords'() {
      await this.renderComponentModule(() => {
        let each = template(`{{yield}}`, {
          eval: function () {
            return eval(arguments[0]);
          },
        });

        return template(`{{#each}}Hello, world!{{/each}}`, {
          eval: function () {
            return eval(arguments[0]);
          },
        });
      });

      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    async '@test Can use constant values in ambiguous helper/component position'() {
      await this.renderComponentModule(() => {
        let value = 'Hello, world!';

        return template(`{{value}}`, {
          eval: function () {
            return eval(arguments[0]);
          },
        });
      });

      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    async '@test Can use inline if and unless in strict mode templates'() {
      await this.renderComponentModule(() => {
        return template('{{if true "foo" "bar"}}{{unless true "foo" "bar"}}', {
          eval: function () {
            return eval(arguments[0]);
          },
        });
      });

      this.assertHTML('foobar');
      this.assertStableRerender();
    }

    async '@test Can use a dynamic component definition'() {
      await this.renderComponentModule(() => {
        let Foo = template('Hello, world!', {
          eval: function () {
            return eval(arguments[0]);
          },
        });

        return class extends GlimmerishComponent {
          static {
            template('<this.Foo />', {
              component: this,
              eval: function () {
                return eval(arguments[0]);
              },
            });
          }

          Foo = Foo;
        };
      });

      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    async '@test Can use a dynamic component definition (curly)'() {
      await this.renderComponentModule(() => {
        let Foo = template('Hello, world!', {
          eval: function () {
            return eval(arguments[0]);
          },
        });

        return class extends GlimmerishComponent {
          static {
            template('{{this.Foo}}', {
              component: this,
              eval: function () {
                return eval(arguments[0]);
              },
            });
          }

          Foo = Foo;
        };
      });

      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    async '@test Can use a dynamic helper definition'() {
      await this.renderComponentModule(() => {
        let foo = () => 'Hello, world!';

        return class extends GlimmerishComponent {
          static {
            template('{{this.foo}}', {
              component: this,
              eval: function () {
                return eval(arguments[0]);
              },
            });
          }

          foo = foo;
        };
      });

      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    async '@test Can use a curried dynamic helper'() {
      await this.renderComponentModule(() => {
        let foo = (v: string) => v;

        let Foo = template('{{@value}}', {
          eval: function () {
            return eval(arguments[0]);
          },
        });

        return template('<Foo @value={{helper foo "Hello, world!"}}/>', {
          eval: function () {
            return eval(arguments[0]);
          },
        });
      });
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    async '@test Can use a curried dynamic modifier'() {
      await this.renderComponentModule(() => {
        let foo = defineSimpleModifier(
          (element: Element, [text]: [string]) => (element.innerHTML = text)
        );

        let Foo = template('<div {{@value}}></div>', {
          eval: function () {
            return eval(arguments[0]);
          },
        });

        return template('<Foo @value={{modifier foo "Hello, world!"}}/>', {
          eval: function () {
            return eval(arguments[0]);
          },
        });
      });
      this.assertHTML('<div>Hello, world!</div>');
      this.assertStableRerender();
    }
  }
);

moduleFor(
  'Strict Mode - Runtime Template Compiler - built ins',
  class extends RenderingTestCase {
    async '@test Can use Input'() {
      const { Input } = await import('@ember/component');

      await this.renderComponentModule(() => {
        return template('<Input/>', {
          eval: function () {
            return eval(arguments[0]);
          },
        });
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'input',
        attrs: {
          type: 'text',
          class: 'ember-text-field ember-view',
        },
      });
      this.assertStableRerender();
    }

    async '@test Can use Textarea'() {
      const { Textarea } = await import('@ember/component');

      await this.renderComponentModule(() => {
        return template('<Textarea/>', {
          eval: function () {
            return eval(arguments[0]);
          },
        });
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'textarea',
        attrs: {
          class: 'ember-text-area ember-view',
        },
      });
      this.assertStableRerender();
    }

    async '@test Can use hash'() {
      const { hash } = await import('@glimmer/runtime');

      await this.renderComponentModule(() => {
        return template('{{#let (hash value="Hello, world!") as |hash|}}{{hash.value}}{{/let}}', {
          eval: function () {
            return eval(arguments[0]);
          },
        });
      });

      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    async '@test Can use array'() {
      const { array } = await import('@glimmer/runtime');

      await this.renderComponentModule(() => {
        return template('{{#each (array "Hello, world!") as |value|}}{{value}}{{/each}}', {
          eval: function () {
            return eval(arguments[0]);
          },
        });
      });
      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    async '@test Can use concat'() {
      const { concat } = await import('@glimmer/runtime');

      await this.renderComponentModule(() => {
        return template('{{(concat "Hello" ", " "world!")}}', {
          eval: function () {
            return eval(arguments[0]);
          },
        });
      });

      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    async '@test Can use get'() {
      const { hash, get } = await import('@glimmer/runtime');

      await this.renderComponentModule(() => {
        return template(
          '{{#let (hash value="Hello, world!") as |hash|}}{{(get hash "value")}}{{/let}}',
          {
            eval: function () {
              return eval(arguments[0]);
            },
          }
        );
      });

      this.assertHTML('Hello, world!');
      this.assertStableRerender();
    }

    async '@test Can use on and fn'(assert: QUnit['assert']) {
      assert.expect(1);

      await this.renderComponentModule(() => {
        let handleClick = (value: unknown) => {
          assert.equal(value, 123);
        };

        return template('<button {{on "click" (fn handleClick 123)}}>Click</button>', {
          eval: function () {
            return eval(arguments[0]);
          },
        });
      });

      this.click('button');
    }

    // Test some of the additional keywords not built-in to glimmer-vm (those
    // we specifically enable them when calling `precompile`)

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

    async '@test Can use each-in'() {
      let obj = {
        foo: 'FOO',
        bar: 'BAR',
      };

      await this.renderComponentModule(() => {
        return template('{{#each-in obj as |k v|}}[{{k}}:{{v}}]{{/each-in}}', {
          eval: function () {
            return eval(arguments[0]);
          },
        });
      });

      this.assertHTML('[foo:FOO][bar:BAR]');
      this.assertStableRerender();
    }

    async '@test Can use in-element'() {
      const fixture = document.querySelector('#qunit-fixture')!;
      const element: HTMLTemplateElement = document.createElement('template');
      element.innerHTML = '[<div id="in-element-test"></div>]';
      fixture.appendChild(element.content);

      const getElement = (id: string) => document.querySelector(`#${id}`)!;

      await this.renderComponentModule(() => {
        return template(
          '{{#in-element (getElement "in-element-test")}}before{{/in-element}}after',
          {
            eval: function () {
              return eval(arguments[0]);
            },
          }
        );
      });

      this.assertText('[before]after');
      this.assertStableRerender();
    }
  }
);
