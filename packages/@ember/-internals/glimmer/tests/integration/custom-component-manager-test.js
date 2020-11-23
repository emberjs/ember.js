import { DEBUG } from '@glimmer/env';
import { moduleFor, RenderingTestCase, runTask, strip } from 'internal-test-helpers';

import { Object as EmberObject } from '@ember/-internals/runtime';
import { set, setProperties, computed, tracked } from '@ember/-internals/metal';
import { setComponentManager, capabilities } from '@ember/-internals/glimmer';

const BasicComponentManager = EmberObject.extend({
  capabilities: capabilities('3.4'),

  createComponent(factory, args) {
    return factory.create({ args });
  },

  updateComponent(component, args) {
    set(component, 'args', args);
  },

  getContext(component) {
    return component;
  },
});

/* eslint-disable */
function createBasicManager(owner) {
  return BasicComponentManager.create({ owner });
}

function createInstrumentedManager(owner) {
  return InstrumentedComponentManager.create({ owner });
}
/* eslint-enable */

let InstrumentedComponentManager;

class ComponentManagerTest extends RenderingTestCase {
  constructor(assert) {
    super(...arguments);

    InstrumentedComponentManager = EmberObject.extend({
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

      getContext(component) {
        assert.step('getContext');
        return component;
      },

      didCreateComponent(component) {
        assert.step('didCreateComponent');
        component.didRender();
      },

      didUpdateComponent(component) {
        assert.step('didUpdateComponent');
        component.didUpdate();
      },
    });
  }
}

moduleFor(
  'Component Manager - Curly Invocation',
  class extends ComponentManagerTest {
    ['@test the string based version of setComponentManager is deprecated']() {
      expectDeprecation(() => {
        setComponentManager(
          'basic',
          EmberObject.extend({
            greeting: 'hello',
          })
        );
      }, 'Passing the name of the component manager to "setupComponentManager" is deprecated. Please pass a function that produces an instance of the manager.');
    }

    ['@test it can render a basic component with custom component manager']() {
      let ComponentClass = setComponentManager(
        createBasicManager,
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

    ['@test it can render a basic component with custom component manager with a factory']() {
      let ComponentClass = setComponentManager(
        () => BasicComponentManager.create(),
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

    ['@test it can have no template context']() {
      let ComponentClass = setComponentManager(() => {
        return EmberObject.create({
          capabilities: capabilities('3.4'),

          createComponent() {
            return null;
          },

          updateComponent() {},

          getContext() {
            return null;
          },
        });
      }, {});

      this.registerComponent('foo-bar', {
        template: `<p>{{@greeting}} world</p>`,
        ComponentClass,
      });

      this.render('{{foo-bar greeting="hello"}}');

      this.assertHTML(`<p>hello world</p>`);
    }

    ['@test it can discover component manager through inheritance - ES Classes']() {
      class Base {}
      setComponentManager(() => {
        return EmberObject.create({
          capabilities: capabilities('3.4'),

          createComponent(Factory, args) {
            return new Factory(args);
          },

          updateComponent() {},

          getContext(component) {
            return component;
          },
        });
      }, Base);
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
      let Parent = setComponentManager(createBasicManager, EmberObject.extend());
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

      let ComponentClass = setComponentManager(
        () => {
          return EmberObject.create({
            capabilities: capabilities('3.4'),

            createComponent(factory) {
              return factory.create();
            },

            getContext() {
              return customContext;
            },

            updateComponent() {},
          });
        },
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

      runTask(() => set(customContext, 'greeting', 'sayonara'));

      this.assertHTML(`<p>sayonara world </p>`);
    }

    ['@test it can set arguments on the component instance']() {
      let ComponentClass = setComponentManager(
        createBasicManager,
        EmberObject.extend({
          salutation: computed('args.named.firstName', 'args.named.lastName', function () {
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
        createBasicManager,
        EmberObject.extend({
          salutation: computed('args.named.firstName', 'args.named.lastName', function () {
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

      runTask(() =>
        setProperties(this.context, {
          firstName: 'Chad',
          lastName: 'Hietala',
        })
      );

      this.assertHTML(`<p>Chad Hietala</p>`);
    }

    ['@test it can set positional params on the component instance']() {
      let ComponentClass = setComponentManager(
        createBasicManager,
        EmberObject.extend({
          salutation: computed('args.positional.[]', function () {
            return this.args.positional[0] + ' ' + this.args.positional[1];
          }),
        })
      );

      this.registerComponent('foo-bar', {
        template: `<p>{{salutation}}</p>`,
        ComponentClass,
      });

      this.render('{{foo-bar "Yehuda" "Katz"}}');

      this.assertHTML(`<p>Yehuda Katz</p>`);
    }

    ['@test positional params are updated if they change (computed, arr tag)']() {
      let ComponentClass = setComponentManager(
        createBasicManager,
        EmberObject.extend({
          salutation: computed('args.positional.[]', function () {
            return this.args.positional[0] + ' ' + this.args.positional[1];
          }),
        })
      );

      this.registerComponent('foo-bar', {
        template: `<p>{{salutation}}</p>`,
        ComponentClass,
      });

      this.render('{{foo-bar firstName lastName}}', {
        firstName: 'Yehuda',
        lastName: 'Katz',
      });

      this.assertHTML(`<p>Yehuda Katz</p>`);

      runTask(() =>
        setProperties(this.context, {
          firstName: 'Chad',
          lastName: 'Hietala',
        })
      );

      this.assertHTML(`<p>Chad Hietala</p>`);
    }

    ['@test positional params are updated if they change (computed, individual tags)']() {
      let ComponentClass = setComponentManager(
        createBasicManager,
        EmberObject.extend({
          salutation: computed('args.positional.0', 'args.positional.1', function () {
            return this.args.positional[0] + ' ' + this.args.positional[1];
          }),
        })
      );

      this.registerComponent('foo-bar', {
        template: `<p>{{salutation}}</p>`,
        ComponentClass,
      });

      this.render('{{foo-bar firstName lastName}}', {
        firstName: 'Yehuda',
        lastName: 'Katz',
      });

      this.assertHTML(`<p>Yehuda Katz</p>`);

      runTask(() =>
        setProperties(this.context, {
          firstName: 'Chad',
          lastName: 'Hietala',
        })
      );

      this.assertHTML(`<p>Chad Hietala</p>`);
    }

    ['@test positional params are updated if they change (native)']() {
      let ComponentClass = setComponentManager(
        createBasicManager,
        class extends EmberObject {
          get salutation() {
            return this.args.positional[0] + ' ' + this.args.positional[1];
          }
        }
      );

      this.registerComponent('foo-bar', {
        template: `<p>{{salutation}}</p>`,
        ComponentClass,
      });

      this.render('{{foo-bar firstName lastName}}', {
        firstName: 'Yehuda',
        lastName: 'Katz',
      });

      this.assertHTML(`<p>Yehuda Katz</p>`);

      runTask(() =>
        setProperties(this.context, {
          firstName: 'Chad',
          lastName: 'Hietala',
        })
      );

      this.assertHTML(`<p>Chad Hietala</p>`);
    }

    ['@test it can opt-in to running destructor'](assert) {
      let ComponentClass = setComponentManager(
        () => {
          return EmberObject.create({
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

            updateComponent() {},

            destroyComponent(component) {
              assert.step('destroyComponent');
              component.destroy();
            },
          });
        },
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

      runTask(() => this.context.set('show', false));

      this.assertText('');

      assert.verifySteps(['createComponent', 'destroyComponent', 'component.destroy()']);
    }

    ['@test it can opt-in to running async lifecycle hooks'](assert) {
      let ComponentClass = setComponentManager(
        () => {
          return EmberObject.create({
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
          });
        },
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

      runTask(() => this.context.set('name', 'max'));
      this.assertHTML(`<p>hello max</p>`);
      assert.verifySteps(['updateComponent', 'didUpdateComponent']);
    }

    '@test capabilities helper function must be used to generate capabilities'(assert) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      let ComponentClass = setComponentManager(
        () => {
          return EmberObject.create({
            capabilities: {
              asyncLifecycleCallbacks: true,
              destructor: true,
              update: false,
            },

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
          });
        },
        EmberObject.extend({
          greeting: 'hello',
        })
      );

      this.registerComponent('foo-bar', {
        template: `<p>{{greeting}} {{@name}}</p>`,
        ComponentClass,
      });

      assert.throws(() => {
        this.render('{{foo-bar name=name}}', { name: 'world' });
      }, /Custom component managers must have a `capabilities` property that is the result of calling the `capabilities\('3.4' \| '3.13'\)` \(imported via `import \{ capabilities \} from '@ember\/component';`\). /);

      assert.verifySteps([]);
    }
  }
);

moduleFor(
  'Component Manager - Angle Invocation',
  class extends ComponentManagerTest {
    ['@test it can render a basic component with custom component manager']() {
      let ComponentClass = setComponentManager(
        createBasicManager,
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
        createBasicManager,
        EmberObject.extend({
          salutation: computed('args.named.firstName', 'args.named.lastName', function () {
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
      let ComponentClass = setComponentManager(createBasicManager, EmberObject.extend());

      this.registerComponent('foo-bar', {
        template: `<p ...attributes>Hello world!</p>`,
        ComponentClass,
      });

      this.render('<FooBar data-test="foo" />');

      this.assertHTML(`<p data-test="foo">Hello world!</p>`);
    }

    ['@test arguments are updated if they change']() {
      let ComponentClass = setComponentManager(
        createBasicManager,
        EmberObject.extend({
          salutation: computed('args.named.firstName', 'args.named.lastName', function () {
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

      runTask(() =>
        setProperties(this.context, {
          firstName: 'Chad',
          lastName: 'Hietala',
        })
      );

      this.assertHTML(`<p>Chad Hietala</p>`);
    }

    ['@test updating attributes triggers updateComponent and didUpdateComponent'](assert) {
      let TestManager = EmberObject.extend({
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
          component.destroy();
        },

        getContext(component) {
          assert.step('getContext');
          return component;
        },

        didCreateComponent(component) {
          assert.step('didCreateComponent');
          component.didRender();
        },

        didUpdateComponent(component) {
          assert.step('didUpdateComponent');
          component.didUpdate();
        },
      });

      let ComponentClass = setComponentManager(
        () => {
          return TestManager.create();
        },
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
      assert.verifySteps(['createComponent', 'getContext', 'didCreateComponent']);

      runTask(() => this.context.set('value', 'bar'));
      assert.verifySteps(['updateComponent', 'didUpdateComponent']);
    }

    ['@test updateComponent fires consistently with or without args'](assert) {
      let updated = [];

      class TestManager {
        static create() {
          return new TestManager();
        }

        capabilities = capabilities('3.13', {
          updateHook: true,
        });

        createComponent(_factory, args) {
          assert.step('createComponent');
          return { id: args.named.id || 'no-id' };
        }

        updateComponent(component) {
          assert.step('updateComponent');
          updated.push(component);
        }

        getContext(component) {
          assert.step('getContext');
          return component;
        }
      }

      let ComponentClass = setComponentManager(() => new TestManager(), {});

      this.registerComponent('foo-bar', {
        template: '{{yield}}',
        ComponentClass,
      });

      this.render(
        strip`
          [<FooBar>{{this.value}}</FooBar>]
          [<FooBar @id="static-id">{{this.value}}</FooBar>]
          [<FooBar @id={{this.id}}>{{this.value}}</FooBar>]
        `,
        { id: 'dynamic-id', value: 'Hello World' }
      );

      this.assertHTML(`[Hello World][Hello World][Hello World]`);
      assert.deepEqual(updated, []);
      assert.verifySteps([
        'createComponent',
        'getContext',
        'createComponent',
        'getContext',
        'createComponent',
        'getContext',
      ]);

      runTask(() => this.context.set('value', 'bar'));
      assert.deepEqual(updated, [{ id: 'no-id' }, { id: 'static-id' }, { id: 'dynamic-id' }]);
      assert.verifySteps(['updateComponent', 'updateComponent', 'updateComponent']);
    }

    ['@test updating arguments does not trigger updateComponent or didUpdateComponent if `updateHook` is false'](
      assert
    ) {
      class TestManager {
        capabilities = capabilities('3.13', {
          /* implied: updateHook: false */
        });

        createComponent() {
          assert.step('createComponent');
          return {};
        }

        getContext(component) {
          assert.step('getContext');
          return component;
        }

        updateComponent() {
          throw new Error('updateComponent called unexpectedly');
        }

        didUpdateComponent() {
          throw new Error('didUpdateComponent called unexpectedly');
        }
      }

      let ComponentClass = setComponentManager(() => new TestManager(), {});

      this.registerComponent('foo-bar', {
        template: `<p ...attributes>Hello world!</p>`,
        ComponentClass,
      });

      this.render('<FooBar data-test={{this.value}} />', { value: 'foo' });

      this.assertHTML(`<p data-test="foo">Hello world!</p>`);
      assert.verifySteps(['createComponent', 'getContext']);

      runTask(() => this.context.set('value', 'bar'));
      assert.verifySteps([]);
    }

    '@test capabilities helper function must be used to generate capabilities'(assert) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      let ComponentClass = setComponentManager(
        () => {
          return EmberObject.create({
            capabilities: {
              asyncLifecycleCallbacks: true,
              destructor: true,
              update: false,
            },

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
          });
        },
        EmberObject.extend({
          greeting: 'hello',
        })
      );

      this.registerComponent('foo-bar', {
        template: `<p>{{greeting}} {{@name}}</p>`,
        ComponentClass,
      });

      assert.throws(() => {
        this.render('<FooBar @name={{name}} />', { name: 'world' });
      }, /Custom component managers must have a `capabilities` property that is the result of calling the `capabilities\('3.4' \| '3.13'\)` \(imported via `import \{ capabilities \} from '@ember\/component';`\). /);

      assert.verifySteps([]);
    }

    '@test tracked property mutation in constructor issues a deprecation'() {
      let ComponentClass = setComponentManager(
        createBasicManager,
        class extends EmberObject {
          @tracked itemCount = 0;

          init() {
            super.init(...arguments);

            // first read the tracked property
            let { itemCount } = this;

            // then attempt to update the tracked property
            this.itemCount = itemCount + 1;
          }
        }
      );

      this.registerComponent('foo-bar', {
        template: `{{this.itemCount}}`,
        ComponentClass,
      });

      expectDeprecation(() => {
        this.render('<FooBar />');
      }, /You attempted to update `itemCount` on `<.*>`, but it had already been used previously in the same computation/);

      this.assertHTML(`1`);
    }
  }
);
