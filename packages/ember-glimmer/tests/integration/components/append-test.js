import { set } from 'ember-metal';
import { jQuery } from 'ember-views';
import { moduleFor, RenderingTest } from '../../utils/test-case';
import { Component, compile } from '../../utils/helpers';
import { strip } from '../../utils/abstract-test-case';

class AbstractAppendTest extends RenderingTest {

  constructor() {
    super();

    this.components = [];
    this.ids = [];
  }

  teardown() {
    this.component = null;

    this.components.forEach(component => {
      this.runTask(() => component.destroy());
    });

    this.ids.forEach(id => {
      let $element = jQuery(id).remove();
      this.assert.strictEqual($element.length, 0, `Should not leak element: #${id}`);
    });

    super.teardown();
  }

  /* abstract append(component): Element; */

  didAppend(component) {
    this.components.push(component);
    this.ids.push(component.elementId);
  }

  ['@test lifecycle hooks during component append'](assert) {
    let hooks = [];

    let oldRegisterComponent = this.registerComponent;
    let componentsByName = {};

    // TODO: refactor/combine with other life-cycle tests
    this.registerComponent = function(name, _options) {
      function pushHook(hookName) {
        hooks.push([name, hookName]);
      }

      let options = {
        ComponentClass: _options.ComponentClass.extend({
          init() {
            this._super(...arguments);
            if (name in componentsByName) {
              throw new TypeError('Component named: ` ' + name + ' ` already registered');
            }
            componentsByName[name] = this;
            pushHook('init');
            this.on('init', () => pushHook('on(init)'));
          },

          didReceiveAttrs() {
            pushHook('didReceiveAttrs');
          },

          willInsertElement() {
            pushHook('willInsertElement');
          },

          willRender() {
            pushHook('willRender');
          },

          didInsertElement() {
            pushHook('didInsertElement');
          },

          didRender() {
            pushHook('didRender');
          },

          didUpdateAttrs() {
            pushHook('didUpdateAttrs');
          },

          willUpdate() {
            pushHook('willUpdate');
          },

          didUpdate() {
            pushHook('didUpdate');
          },

          willDestroyElement() {
            pushHook('willDestroyElement');
          },

          willClearRender() {
            pushHook('willClearRender');
          },

          didDestroyElement() {
            pushHook('didDestroyElement');
          },

          willDestroy() {
            pushHook('willDestroy');
            this._super(...arguments);
          }
        }),
        template: _options.template
      };

      oldRegisterComponent.call(this, name, options);
    };

    this.registerComponent('x-parent', {
      ComponentClass: Component.extend({
        layoutName: 'components/x-parent'
      }),

      template: '[parent: {{foo}}]{{#x-child bar=foo}}[yielded: {{foo}}]{{/x-child}}'
    });

    this.registerComponent('x-child', {
      ComponentClass: Component.extend({
        tagName: ''
      }),

      template: '[child: {{bar}}]{{yield}}'
    });

    let XParent;

    XParent = this.owner.factoryFor('component:x-parent');

    this.component = XParent.create({ foo: 'zomg' });

    assert.deepEqual(hooks, [
      ['x-parent', 'init'],
      ['x-parent', 'didReceiveAttrs'],
      ['x-parent', 'on(init)']
    ], 'creation of x-parent');

    hooks.length = 0;

    this.element = this.append(this.component);

    assert.deepEqual(hooks, [
      ['x-parent', 'willInsertElement'],

      ['x-child', 'init'],
      ['x-child', 'didReceiveAttrs'],
      ['x-child', 'on(init)'],
      ['x-child', 'willRender'],
      ['x-child', 'willInsertElement'],

      ['x-child', 'didInsertElement'],
      ['x-child', 'didRender'],

      ['x-parent', 'didInsertElement'],
      ['x-parent', 'didRender']
    ], 'appending of x-parent');

    hooks.length = 0;

    this.runTask(() => componentsByName['x-parent'].rerender());

    assert.deepEqual(hooks, [
      ['x-parent', 'willUpdate'],
      ['x-parent', 'willRender'],

      ['x-parent', 'didUpdate'],
      ['x-parent', 'didRender']
    ], 'rerender x-parent');

    hooks.length = 0;

    this.runTask(() => componentsByName['x-child'].rerender());

    assert.deepEqual(hooks, [
      ['x-parent', 'willUpdate'],
      ['x-parent', 'willRender'],

      ['x-child', 'willUpdate'],
      ['x-child', 'willRender'],

      ['x-child', 'didUpdate'],
      ['x-child', 'didRender'],

      ['x-parent', 'didUpdate'],
      ['x-parent', 'didRender']
    ], 'rerender x-child');

    hooks.length = 0;

    this.runTask(() => set(this.component, 'foo', 'wow'));

    assert.deepEqual(hooks, [
      ['x-parent', 'willUpdate'],
      ['x-parent', 'willRender'],

      ['x-child', 'didUpdateAttrs'],
      ['x-child', 'didReceiveAttrs'],

      ['x-child', 'willUpdate'],
      ['x-child', 'willRender'],

      ['x-child', 'didUpdate'],
      ['x-child', 'didRender'],

      ['x-parent', 'didUpdate'],
      ['x-parent', 'didRender']
    ], 'set foo = wow');

    hooks.length = 0;

    this.runTask(() => set(this.component, 'foo', 'zomg'));

    assert.deepEqual(hooks, [
      ['x-parent', 'willUpdate'],
      ['x-parent', 'willRender'],

      ['x-child', 'didUpdateAttrs'],
      ['x-child', 'didReceiveAttrs'],

      ['x-child', 'willUpdate'],
      ['x-child', 'willRender'],

      ['x-child', 'didUpdate'],
      ['x-child', 'didRender'],

      ['x-parent', 'didUpdate'],
      ['x-parent', 'didRender']
    ], 'set foo = zomg');

    hooks.length = 0;

    this.runTask(() => this.component.destroy());

    assert.deepEqual(hooks, [
      ['x-parent', 'willDestroyElement'],
      ['x-parent', 'willClearRender'],

      ['x-child', 'willDestroyElement'],
      ['x-child', 'willClearRender'],

      ['x-child', 'didDestroyElement'],
      ['x-parent', 'didDestroyElement'],

      ['x-parent', 'willDestroy'],
      ['x-child', 'willDestroy']
    ], 'destroy');
  }

  ['@test appending, updating and destroying a single component'](assert) {
    let willDestroyCalled = 0;

    this.registerComponent('x-parent', {
      ComponentClass: Component.extend({
        layoutName: 'components/x-parent',
        willDestroyElement() {
          willDestroyCalled++;
        }
      }),

      template: '[parent: {{foo}}]{{#x-child bar=foo}}[yielded: {{foo}}]{{/x-child}}'
    });

    this.registerComponent('x-child', {
      ComponentClass: Component.extend({
        tagName: ''
      }),

      template: '[child: {{bar}}]{{yield}}'
    });

    let XParent;

    XParent = this.owner.factoryFor('component:x-parent');

    this.component = XParent.create({ foo: 'zomg' });

    assert.ok(!this.component.element, 'precond - should not have an element');

    this.element = this.append(this.component);

    let componentElement = this.component.element;

    this.assertComponentElement(componentElement, { content: '[parent: zomg][child: zomg][yielded: zomg]' });

    assert.equal(componentElement.parentElement, this.element, 'It should be attached to the target');

    this.runTask(() => this.rerender());

    this.assertComponentElement(componentElement, { content: '[parent: zomg][child: zomg][yielded: zomg]' });

    assert.equal(componentElement.parentElement, this.element, 'It should be attached to the target');

    this.runTask(() => set(this.component, 'foo', 'wow'));

    this.assertComponentElement(componentElement, { content: '[parent: wow][child: wow][yielded: wow]' });

    assert.equal(componentElement.parentElement, this.element, 'It should be attached to the target');

    this.runTask(() => set(this.component, 'foo', 'zomg'));

    this.assertComponentElement(componentElement, { content: '[parent: zomg][child: zomg][yielded: zomg]' });

    assert.equal(componentElement.parentElement, this.element, 'It should be attached to the target');

    this.runTask(() => this.component.destroy());

    assert.ok(!this.component.element, 'It should not have an element');
    assert.ok(!componentElement.parentElement, 'The component element should be detached');

    this.assert.equal(willDestroyCalled, 1);
  }

  ['@test releasing a root component after it has been destroy'](assert) {
    let renderer = this.owner.lookup('renderer:-dom');

    this.registerComponent('x-component', {
      ComponentClass: Component.extend()
    });

    this.component = this.owner.factoryFor('component:x-component').create();
    this.append(this.component);

    assert.equal(renderer._roots.length, 1, 'added a root component');

    this.runTask(() => this.component.destroy());

    assert.equal(renderer._roots.length, 0, 'released the root component');
  }

  ['@test appending, updating and destroying multiple components'](assert) {
    let willDestroyCalled = 0;

    this.registerComponent('x-first', {
      ComponentClass: Component.extend({
        layoutName: 'components/x-first',

        willDestroyElement() {
          willDestroyCalled++;
        }
      }),

      template: 'x-first {{foo}}!'
    });

    this.registerComponent('x-second', {
      ComponentClass: Component.extend({
        layoutName: 'components/x-second',

        willDestroyElement() {
          willDestroyCalled++;
        }
      }),

      template: 'x-second {{bar}}!'
    });

    let First, Second;

    First = this.owner.factoryFor('component:x-first');
    Second = this.owner.factoryFor('component:x-second');

    let first = First.create({ foo: 'foo' });
    let second = Second.create({ bar: 'bar' });

    this.assert.ok(!first.element, 'precond - should not have an element');
    this.assert.ok(!second.element, 'precond - should not have an element');

    let wrapper1, wrapper2;

    this.runTask(() => wrapper1 = this.append(first));
    this.runTask(() => wrapper2 = this.append(second));

    let componentElement1 = first.element;
    let componentElement2 = second.element;

    this.assertComponentElement(componentElement1, { content: 'x-first foo!' });
    this.assertComponentElement(componentElement2, { content: 'x-second bar!' });

    assert.equal(componentElement1.parentElement, wrapper1, 'The first component should be attached to the target');
    assert.equal(componentElement2.parentElement, wrapper2, 'The second component should be attached to the target');

    this.runTask(() => set(first, 'foo', 'FOO'));

    this.assertComponentElement(componentElement1, { content: 'x-first FOO!' });
    this.assertComponentElement(componentElement2, { content: 'x-second bar!' });

    assert.equal(componentElement1.parentElement, wrapper1, 'The first component should be attached to the target');
    assert.equal(componentElement2.parentElement, wrapper2, 'The second component should be attached to the target');

    this.runTask(() => set(second, 'bar', 'BAR'));

    this.assertComponentElement(componentElement1, { content: 'x-first FOO!' });
    this.assertComponentElement(componentElement2, { content: 'x-second BAR!' });

    assert.equal(componentElement1.parentElement, wrapper1, 'The first component should be attached to the target');
    assert.equal(componentElement2.parentElement, wrapper2, 'The second component should be attached to the target');

    this.runTask(() => {
      set(first, 'foo', 'foo');
      set(second, 'bar', 'bar');
    });

    this.assertComponentElement(componentElement1, { content: 'x-first foo!' });
    this.assertComponentElement(componentElement2, { content: 'x-second bar!' });

    assert.equal(componentElement1.parentElement, wrapper1, 'The first component should be attached to the target');
    assert.equal(componentElement2.parentElement, wrapper2, 'The second component should be attached to the target');

    this.runTask(() => {
      first.destroy();
      second.destroy();
    });

    assert.ok(!first.element, 'The first component should not have an element');
    assert.ok(!second.element, 'The second component should not have an element');

    assert.ok(!componentElement1.parentElement, 'The first component element should be detached');
    assert.ok(!componentElement2.parentElement, 'The second component element should be detached');

    this.assert.equal(willDestroyCalled, 2);
  }

  ['@test can appendTo while rendering'](assert) {
    let owner = this.owner;

    let append = (component) => {
      return this.append(component);
    };

    let element1, element2;
    this.registerComponent('first-component', {
      ComponentClass: Component.extend({
        layout: compile('component-one'),

        didInsertElement() {
          element1 = this.element;

          let SecondComponent = owner.factoryFor('component:second-component');

          append(SecondComponent.create());
        }
      })
    });

    this.registerComponent('second-component', {
      ComponentClass: Component.extend({
        layout: compile(`component-two`),

        didInsertElement() {
          element2 = this.element;
        }
      })
    });

    let FirstComponent = this.owner.factoryFor('component:first-component');

    this.runTask(() => append(FirstComponent.create()));

    this.assertComponentElement(element1, { content: 'component-one' });
    this.assertComponentElement(element2, { content: 'component-two' });
  }

  ['@test can appendTo and remove while rendering'](assert) {
    let owner = this.owner;

    let append = (component) => {
      return this.append(component);
    };

    let element1, element2, element3, element4, component1, component2;
    this.registerComponent('foo-bar', {
      ComponentClass: Component.extend({
        layout: compile('foo-bar'),

        init() {
          this._super(...arguments);
          component1 = this;
        },

        didInsertElement() {
          element1 = this.element;

          let OtherRoot = owner.factoryFor('component:other-root');

          this._instance = OtherRoot.create({
            didInsertElement() {
              element2 = this.element;
            }
          });

          append(this._instance);
        },

        willDestroy() {
          this._instance.destroy();
        }
      })
    });

    this.registerComponent('baz-qux', {
      ComponentClass: Component.extend({
        layout: compile('baz-qux'),

        init() {
          this._super(...arguments);
          component2 = this;
        },

        didInsertElement() {
          element3 = this.element;

          let OtherRoot = owner.factoryFor('component:other-root');

          this._instance = OtherRoot.create({
            didInsertElement() {
              element4 = this.element;
            }
          });

          append(this._instance);
        },

        willDestroy() {
          this._instance.destroy();
        }
      })
    });

    let instantiatedRoots = 0;
    let destroyedRoots = 0;
    this.registerComponent('other-root', {
      ComponentClass: Component.extend({
        layout: compile(`fake-thing: {{counter}}`),
        init() {
          this._super(...arguments);
          this.counter = instantiatedRoots++;
        },
        willDestroy() {
          destroyedRoots++;
          this._super(...arguments);
        }
      })
    });

    this.render(strip`
      {{#if showFooBar}}
        {{foo-bar}}
      {{else}}
        {{baz-qux}}
      {{/if}}
    `, { showFooBar: true });

    this.assertComponentElement(element1, { });
    this.assertComponentElement(element2, { content: 'fake-thing: 0' });
    assert.equal(instantiatedRoots, 1);

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'showFooBar', false));

    assert.equal(instantiatedRoots, 2);
    assert.equal(destroyedRoots, 1);

    this.assertComponentElement(element3, { });
    this.assertComponentElement(element4, { content: 'fake-thing: 1' });

    this.runTask(() => {
      component1.destroy();
      component2.destroy();
    });

    assert.equal(instantiatedRoots, 2);
    assert.equal(destroyedRoots, 2);
  }

}

moduleFor('append: no arguments (attaching to document.body)', class extends AbstractAppendTest {

  append(component) {
    this.runTask(() => component.append());
    this.didAppend(component);
    return document.body;
  }

});

moduleFor('appendTo: a selector', class extends AbstractAppendTest {

  append(component) {
    this.runTask(() => component.appendTo('#qunit-fixture'));
    this.didAppend(component);
    return jQuery('#qunit-fixture')[0];
  }

  ['@test raises an assertion when the target does not exist in the DOM'](assert) {
    this.registerComponent('foo-bar', {
      ComponentClass: Component.extend({
        layoutName: 'components/foo-bar'
      }),
      template: 'FOO BAR!'
    });

    let FooBar = this.owner.factoryFor('component:foo-bar');

    this.component = FooBar.create();

    assert.ok(!this.component.element, 'precond - should not have an element');

    this.runTask(() => {
      expectAssertion(() => {
        this.component.appendTo('#does-not-exist-in-dom');
      }, /You tried to append to \(#does-not-exist-in-dom\) but that isn't in the DOM/);
    });

    assert.ok(!this.component.element, 'component should not have an element');
  }

});

moduleFor('appendTo: an element', class extends AbstractAppendTest {

  append(component) {
    let element = jQuery('#qunit-fixture')[0];
    this.runTask(() => component.appendTo(element));
    this.didAppend(component);
    return element;
  }

});

moduleFor('appendTo: with multiple components', class extends AbstractAppendTest {

  append(component) {
    this.runTask(() => component.appendTo('#qunit-fixture'));
    this.didAppend(component);
    return jQuery('#qunit-fixture')[0];
  }
});
