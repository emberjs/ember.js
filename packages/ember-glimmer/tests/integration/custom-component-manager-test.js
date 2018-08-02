import { moduleFor, RenderingTest } from '../utils/test-case';
import { Object as EmberObject } from 'ember-runtime';
import { set, setProperties, computed } from 'ember-metal';
import {
  GLIMMER_CUSTOM_COMPONENT_MANAGER,
  EMBER_GLIMMER_ANGLE_BRACKET_INVOCATION,
} from '@ember/canary-features';
import { setComponentManager, capabilities } from 'ember-glimmer';

if (GLIMMER_CUSTOM_COMPONENT_MANAGER) {
  class ComponentManagerTest extends RenderingTest {
    constructor(assert) {
      super(...arguments);

      this.registerComponentManager(
        'basic',
        EmberObject.extend({
          capabilities: capabilities('3.4'),

          createComponent(factory, args) {
            return factory.create({ args });
          },

          didRenderLayout({ component }, bounds) {
            assert.step('didRenderLayout');
            component.bounds = bounds;
            component.didInsertElement && component.didInsertElement();
          },

          updateComponent(component, args) {
            set(component, 'args', args);
          },

          getContext(component) {
            return component;
          },
        })
      );

      this.registerComponentManager(
        'instrumented-full',
        EmberObject.extend({
          capabilities: capabilities('3.4', {
            destructor: true,
            asyncLifecycleCallbacks: true,
          }),

          createComponent(factory, args) {
            assert.step('createComponent');
            return factory.create({ args });
          },

          updateComponent(component, args) {
            assert.step('updateComponent');
            set(component, 'args', args);
          },

          destroyComponent(component) {
            assert.step('destroyComponent');
            component.destroy();
          },

          willDestroyComponent() {},

          getContext(component) {
            assert.step('getContext');
            return component;
          },

          didRenderLayout({ component }, bounds) {
            assert.step('didRenderLayout');
            component.bounds = bounds;
          },

          didCreateComponent(component) {
            assert.step('didCreateComponent');
            component.didRender();
          },

          didUpdateComponent(component) {
            assert.step('didUpdateComponent');
            component.didUpdate();
          },
        })
      );
    }
  }

  moduleFor(
    'Component Manager - Curly Invocation',
    class extends ComponentManagerTest {
      ['@test it can render a basic component with custom component manager']() {
        let ComponentClass = setComponentManager(
          'basic',
          EmberObject.extend({
            greeting: 'hello',
          })
        );

        this.registerComponent('foo-bar', {
          template: `<p>{{greeting}} world</p>`,
          ComponentClass,
        });

        this.render('{{foo-bar}}');

        this.assertHTML(`<p>hello world</p>`);
      }

      ['@test it gets the component bounds']() {
        let self = this;
        let ComponentClass = setComponentManager(
          'basic',
          EmberObject.extend({
            greeting: 'hello',
            didInsertElement() {
              self.assert.ok(true, 'Called the didInsertElement hook');
              self.assert.ok(this.bounds);
              self.assert.ok(this.bounds.firstNode);
              self.assert.ok(this.bounds.lastNode);
              self.assert.equal(this.bounds.firstNode, this.bounds.lastNode);
            },
          })
        );

        this.registerComponent('foo-bar', {
          template: `<p>{{greeting}} world</p>`,
          ComponentClass,
        });

        this.render('{{foo-bar}}');

        this.assertHTML(`<p>hello world</p>`);
      }

      ['@test firstChild and lastChild of bounds can be different']() {
        let self = this;
        let ComponentClass = setComponentManager(
          'basic',
          EmberObject.extend({
            greeting: 'hello',
            didInsertElement() {
              self.assert.equal(this.bounds.firstNode.tagName.toLowerCase(), 'h1');
              self.assert.equal(this.bounds.lastNode.tagName.toLowerCase(), 'h2');
            },
          })
        );

        this.registerComponent('foo-bar', {
          template: `<h1>Hello!</h1><h2>How are you doing?</h2>`,
          ComponentClass,
        });

        this.render('{{foo-bar}}');

        this.assertHTML(`<h1>Hello!</h1><h2>How are you doing?</h2>`);
      }

      ['@test bounds is subject to change']() {
        let component;
        let ComponentClass = setComponentManager(
          'basic',
          EmberObject.extend({
            greeting: 'hello',
            didInsertElement() {
              component = this;
            },
          })
        );

        this.registerComponent('foo-bar', {
          template: `{{#if @bar}}<h1>Hello!</h1>{{/if}}<h2>How are you doing?</h2>`,
          ComponentClass,
        });

        this.render('{{foo-bar bar=bar}}', { bar: true });

        this.assertHTML(`<h1>Hello!</h1><h2>How are you doing?</h2>`);

        this.assert.equal(component.bounds.firstNode.tagName.toLowerCase(), 'h1');
        this.assert.equal(component.bounds.lastNode.tagName.toLowerCase(), 'h2');

        this.runTask(() => set(this.context, 'bar', false));

        this.rerender();

        this.assert.equal(component.bounds.firstNode.nodeType, 8);
        this.assert.equal(component.bounds.lastNode.tagName.toLowerCase(), 'h2');
        this.assertHTML(`<!----><h2>How are you doing?</h2>`);
      }

      ['@test it can have no template context']() {
        this.registerComponentManager(
          'pseudo-template-only',
          EmberObject.extend({
            capabilities: capabilities('3.4'),

            createComponent() {
              return null;
            },

            didRenderLayout() {},

            updateComponent() {},

            getContext() {
              return null;
            },
          })
        );

        let ComponentClass = setComponentManager('pseudo-template-only', {});

        this.registerComponent('foo-bar', {
          template: `<p>{{@greeting}} world</p>`,
          ComponentClass,
        });

        this.render('{{foo-bar greeting="hello"}}');

        this.assertHTML(`<p>hello world</p>`);
      }

      ['@test it can discover component manager through inheritance - ES Classes']() {
        this.registerComponentManager(
          'test',
          EmberObject.extend({
            capabilities: capabilities('3.4'),

            createComponent(factory, args) {
              let Klass = factory.class;
              return new Klass(args);
            },

            didRenderLayout() {},

            updateComponent() {},

            getContext(component) {
              return component;
            },
          })
        );

        class Base {}
        setComponentManager('test', Base);
        class Child extends Base {}
        class Grandchild extends Child {
          constructor() {
            super();
            this.name = 'grandchild';
          }
        }

        this.registerComponent('foo-bar', {
          template: `{{this.name}}`,
          ComponentClass: Grandchild,
        });

        this.render('{{foo-bar}}');

        this.assertHTML(`grandchild`);
      }

      ['@test it can discover component manager through inheritance - Ember Object']() {
        let Parent = setComponentManager('basic', EmberObject.extend());
        let Child = Parent.extend();
        let Grandchild = Child.extend({
          init() {
            this._super(...arguments);
            this.name = 'grandchild';
          },
        });

        this.registerComponent('foo-bar', {
          template: `{{this.name}}`,
          ComponentClass: Grandchild,
        });

        this.render('{{foo-bar}}');

        this.assertHTML(`grandchild`);
      }

      ['@test it can customize the template context']() {
        let customContext = {
          greeting: 'goodbye',
        };

        this.registerComponentManager(
          'test',
          EmberObject.extend({
            capabilities: capabilities('3.4'),

            createComponent(factory) {
              return factory.create();
            },

            didRenderLayout() {},

            getContext() {
              return customContext;
            },

            updateComponent() {},
          })
        );

        let ComponentClass = setComponentManager(
          'test',
          EmberObject.extend({
            greeting: 'hello',
            count: 1234,
          })
        );

        this.registerComponent('foo-bar', {
          template: `<p>{{greeting}} world {{count}}</p>`,
          ComponentClass,
        });

        this.render('{{foo-bar}}');

        this.assertHTML(`<p>goodbye world </p>`);

        this.runTask(() => set(customContext, 'greeting', 'sayonara'));

        this.assertHTML(`<p>sayonara world </p>`);
      }

      ['@test it can set arguments on the component instance']() {
        let ComponentClass = setComponentManager(
          'basic',
          EmberObject.extend({
            salutation: computed('args.named.firstName', 'args.named.lastName', function() {
              return this.args.named.firstName + ' ' + this.args.named.lastName;
            }),
          })
        );

        this.registerComponent('foo-bar', {
          template: `<p>{{salutation}}</p>`,
          ComponentClass,
        });

        this.render('{{foo-bar firstName="Yehuda" lastName="Katz"}}');

        this.assertHTML(`<p>Yehuda Katz</p>`);
      }

      ['@test arguments are updated if they change']() {
        let ComponentClass = setComponentManager(
          'basic',
          EmberObject.extend({
            salutation: computed('args.named.firstName', 'args.named.lastName', function() {
              return this.args.named.firstName + ' ' + this.args.named.lastName;
            }),
          })
        );

        this.registerComponent('foo-bar', {
          template: `<p>{{salutation}}</p>`,
          ComponentClass,
        });

        this.render('{{foo-bar firstName=firstName lastName=lastName}}', {
          firstName: 'Yehuda',
          lastName: 'Katz',
        });

        this.assertHTML(`<p>Yehuda Katz</p>`);

        this.runTask(() =>
          setProperties(this.context, {
            firstName: 'Chad',
            lastName: 'Hietala',
          })
        );

        this.assertHTML(`<p>Chad Hietala</p>`);
      }

      ['@test it can opt-in to running destructor'](assert) {
        this.registerComponentManager(
          'test',
          EmberObject.extend({
            capabilities: capabilities('3.4', {
              destructor: true,
            }),

            createComponent(factory) {
              assert.step('createComponent');
              return factory.create();
            },

            getContext(component) {
              return component;
            },

            didRenderLayout() {},

            updateComponent() {},

            willDestroyComponent() {
              assert.step('willDestroyComponent');
            },

            destroyComponent(component) {
              assert.step('destroyComponent');
              component.destroy();
            },
          })
        );

        let ComponentClass = setComponentManager(
          'test',
          EmberObject.extend({
            greeting: 'hello',
            destroy() {
              assert.step('component.destroy()');
              this._super(...arguments);
            },
          })
        );

        this.registerComponent('foo-bar', {
          template: `<p>{{greeting}} world</p>`,
          ComponentClass,
        });

        this.render('{{#if show}}{{foo-bar}}{{/if}}', { show: true });

        this.assertHTML(`<p>hello world</p>`);

        this.runTask(() => this.context.set('show', false));

        this.assertText('');

        assert.verifySteps([
          'createComponent',
          'willDestroyComponent',
          'destroyComponent',
          'component.destroy()',
        ]);
      }

      ['@test it can opt-in to running async lifecycle hooks'](assert) {
        this.registerComponentManager(
          'test',
          EmberObject.extend({
            capabilities: capabilities('3.4', {
              asyncLifecycleCallbacks: true,
            }),

            createComponent(factory, args) {
              assert.step('createComponent');
              return factory.create({ args });
            },

            updateComponent(component, args) {
              assert.step('updateComponent');
              set(component, 'args', args);
            },

            didRenderLayout() {},

            destroyComponent(component) {
              assert.step('destroyComponent');
              component.destroy();
            },

            getContext(component) {
              assert.step('getContext');
              return component;
            },

            didCreateComponent() {
              assert.step('didCreateComponent');
            },

            didUpdateComponent() {
              assert.step('didUpdateComponent');
            },
          })
        );

        let ComponentClass = setComponentManager(
          'test',
          EmberObject.extend({
            greeting: 'hello',
          })
        );

        this.registerComponent('foo-bar', {
          template: `<p>{{greeting}} {{@name}}</p>`,
          ComponentClass,
        });

        this.render('{{foo-bar name=name}}', { name: 'world' });

        this.assertHTML(`<p>hello world</p>`);
        assert.verifySteps(['createComponent', 'getContext', 'didCreateComponent']);

        this.runTask(() => this.context.set('name', 'max'));
        this.assertHTML(`<p>hello max</p>`);
        assert.verifySteps(['updateComponent', 'didUpdateComponent']);
      }
    }
  );

  if (EMBER_GLIMMER_ANGLE_BRACKET_INVOCATION) {
    moduleFor(
      'Component Manager - Angle Invocation',
      class extends ComponentManagerTest {
        ['@test it can render a basic component with custom component manager']() {
          let ComponentClass = setComponentManager(
            'basic',
            EmberObject.extend({
              greeting: 'hello',
            })
          );

          this.registerComponent('foo-bar', {
            template: `<p>{{greeting}} world</p>`,
            ComponentClass,
          });

          this.render('<FooBar />');

          this.assertHTML(`<p>hello world</p>`);
        }

        ['@test it can set arguments on the component instance']() {
          let ComponentClass = setComponentManager(
            'basic',
            EmberObject.extend({
              salutation: computed('args.named.firstName', 'args.named.lastName', function() {
                return this.args.named.firstName + ' ' + this.args.named.lastName;
              }),
            })
          );

          this.registerComponent('foo-bar', {
            template: `<p>{{salutation}}</p>`,
            ComponentClass,
          });

          this.render('<FooBar @firstName="Yehuda" @lastName="Katz" />');

          this.assertHTML(`<p>Yehuda Katz</p>`);
        }

        ['@test it can pass attributes']() {
          let ComponentClass = setComponentManager('basic', EmberObject.extend());

          this.registerComponent('foo-bar', {
            template: `<p ...attributes>Hello world!</p>`,
            ComponentClass,
          });

          this.render('<FooBar data-test="foo" />');

          this.assertHTML(`<p data-test="foo">Hello world!</p>`);
        }

        ['@test arguments are updated if they change']() {
          let ComponentClass = setComponentManager(
            'basic',
            EmberObject.extend({
              salutation: computed('args.named.firstName', 'args.named.lastName', function() {
                return this.args.named.firstName + ' ' + this.args.named.lastName;
              }),
            })
          );

          this.registerComponent('foo-bar', {
            template: `<p>{{salutation}}</p>`,
            ComponentClass,
          });

          this.render('<FooBar @firstName={{firstName}} @lastName={{lastName}} />', {
            firstName: 'Yehuda',
            lastName: 'Katz',
          });

          this.assertHTML(`<p>Yehuda Katz</p>`);

          this.runTask(() =>
            setProperties(this.context, {
              firstName: 'Chad',
              lastName: 'Hietala',
            })
          );

          this.assertHTML(`<p>Chad Hietala</p>`);
        }

        ['@test updating attributes triggers didUpdateComponent'](assert) {
          let ComponentClass = setComponentManager(
            'instrumented-full',
            EmberObject.extend({
              didRender() {},
              didUpdate() {},
            })
          );

          this.registerComponent('foo-bar', {
            template: `<p ...attributes>Hello world!</p>`,
            ComponentClass,
          });

          this.render('<FooBar data-test={{value}} />', { value: 'foo' });

          this.assertHTML(`<p data-test="foo">Hello world!</p>`);
          assert.verifySteps([
            'createComponent',
            'getContext',
            'didRenderLayout',
            'didCreateComponent',
          ]);

          this.runTask(() => this.context.set('value', 'bar'));
          assert.verifySteps(['didUpdateComponent']);
        }
      }
    );
  }
}
