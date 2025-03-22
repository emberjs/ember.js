import { moduleFor, RenderingTestCase, strip, runTask } from 'internal-test-helpers';

import { set } from '@ember/object';

import { Component, compile } from '../../utils/helpers';
import { setComponentTemplate } from '@glimmer/manager';

class AbstractAppendTest extends RenderingTestCase {
  constructor() {
    super(...arguments);

    this.components = [];
    this.ids = [];
  }

  teardown() {
    this.component = null;

    this.components.forEach((component) => {
      runTask(() => component.destroy());
    });

    this.ids.forEach((id) => {
      let $element = document.getElementById(id);
      if ($element) {
        $element.parentNode.removeChild($element);
      }
      // this.assert.strictEqual($element.length, 0, `Should not leak element: #${id}`);
    });

    super.teardown();
  }

  /* abstract append(component): Element; */

  didAppend(component) {
    this.components.push(component);
    this.ids.push(component.elementId);
  }

  [`@test (new) lifecycle hooks during component append`](assert) {
    let hooks = [];

    let componentsByName = {};

    let createLogger = (name, template, extras = {}) => {
      function pushHook(hookName) {
        hooks.push([name, hookName]);
      }

      let LoggerComponent = Component.extend({
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
        },
      });

      let local = LoggerComponent.extend(extras);

      setComponentTemplate(compile(template), local);

      this.owner.register(`component:${name}`, local);

      return local;
    };

    createLogger(
      'x-parent',
      `[parent: {{this.foo}}]
       [parent: {{this.parentValue}}

        <XChild @bar={{this.foo}} @childValue={{this.childValue}}>
         [yielded: {{this.foo}}]
        </XChild>
      `
    );
    createLogger(
      'x-child',
      `
      [child: {{this.bar}}]
      [child: {{this.childValue}}]
      {{yield}}`
    );

    this.render(
      `
      {{#if this.show}}
        <XParent @foo={{this.foo}} @parentValue={{this.parentValue}} @childValue={{this.childValue}} />
      {{/if}}`,
      { parentValue: 1, childValue: 1, foo: 'zomg', show: true }
    );

    assert.deepEqual(
      hooks,
      [
        ['x-parent', 'init'],
        ['x-parent', 'on(init)'],
        ['x-parent', 'didReceiveAttrs'],
        ['x-parent', 'willRender'],
        ['x-parent', 'willInsertElement'],
        ['x-child', 'init'],
        ['x-child', 'on(init)'],
        ['x-child', 'didReceiveAttrs'],
        ['x-child', 'willRender'],
        ['x-child', 'willInsertElement'],
        ['x-child', 'didInsertElement'],
        ['x-child', 'didRender'],
        ['x-parent', 'didInsertElement'],
        ['x-parent', 'didRender'],
      ],
      'creation of x-parent'
    );

    hooks.length = 0;
    runTask(() => this.rerender());

    assert.deepEqual(hooks, [], 'no-op re-render of parent');

    hooks.length = 0;

    runTask(() => set(this.context, 'parentValue', 2));
    runTask(() => this.rerender());

    assert.deepEqual(
      hooks,
      [
        ['x-parent', 'didUpdateAttrs'],
        ['x-parent', 'didReceiveAttrs'],
        ['x-parent', 'willUpdate'],
        ['x-parent', 'willRender'],
        ['x-parent', 'didUpdate'],
        ['x-parent', 'didRender'],
      ],
      'rerender x-parent'
    );

    hooks.length = 0;

    runTask(() => set(this.context, 'childValue', 2));

    assert.deepEqual(
      hooks,

      [
        ['x-parent', 'didUpdateAttrs'],
        ['x-parent', 'didReceiveAttrs'],
        ['x-parent', 'willUpdate'],
        ['x-parent', 'willRender'],
        ['x-child', 'didUpdateAttrs'],
        ['x-child', 'didReceiveAttrs'],
        ['x-child', 'willUpdate'],
        ['x-child', 'willRender'],
        ['x-child', 'didUpdate'],
        ['x-child', 'didRender'],
        ['x-parent', 'didUpdate'],
        ['x-parent', 'didRender'],
      ],
      'rerender x-child'
    );

    hooks.length = 0;

    runTask(() => set(this.context, 'foo', 'wow'));

    assert.deepEqual(
      hooks,
      [
        ['x-parent', 'didUpdateAttrs'],
        ['x-parent', 'didReceiveAttrs'],
        ['x-parent', 'willUpdate'],
        ['x-parent', 'willRender'],
        ['x-child', 'didUpdateAttrs'],
        ['x-child', 'didReceiveAttrs'],
        ['x-child', 'willUpdate'],
        ['x-child', 'willRender'],
        ['x-child', 'didUpdate'],
        ['x-child', 'didRender'],
        ['x-parent', 'didUpdate'],
        ['x-parent', 'didRender'],
      ],
      'set foo = wow'
    );

    hooks.length = 0;

    runTask(() => set(this.context, 'foo', 'zomg'));

    assert.deepEqual(
      hooks,
      [
        ['x-parent', 'didUpdateAttrs'],
        ['x-parent', 'didReceiveAttrs'],
        ['x-parent', 'willUpdate'],
        ['x-parent', 'willRender'],
        ['x-child', 'didUpdateAttrs'],
        ['x-child', 'didReceiveAttrs'],
        ['x-child', 'willUpdate'],
        ['x-child', 'willRender'],
        ['x-child', 'didUpdate'],
        ['x-child', 'didRender'],
        ['x-parent', 'didUpdate'],
        ['x-parent', 'didRender'],
      ],
      'set foo = zomg'
    );

    hooks.length = 0;

    runTask(() => set(this.context, 'show', false));

    assert.deepEqual(
      hooks,
      [
        ['x-parent', 'willDestroyElement'],
        ['x-parent', 'willClearRender'],
        ['x-child', 'willDestroyElement'],
        ['x-child', 'willClearRender'],
        ['x-parent', 'didDestroyElement'],
        ['x-child', 'didDestroyElement'],
        ['x-parent', 'willDestroy'],
        ['x-child', 'willDestroy'],
      ],
      'destroy'
    );
  }

  ['@test releasing a root component after it has been destroy'](assert) {
    let renderer = this.owner.lookup('renderer:-dom');

    this.registerComponent('x-component', {
      ComponentClass: Component.extend(),
    });

    this.component = this.owner.factoryFor('component:x-component').create();
    this.append(this.component);

    assert.equal(renderer._roots.length, 1, 'added a root component');

    runTask(() => this.component.destroy());

    assert.equal(renderer._roots.length, 0, 'released the root component');
  }

  ['@test can appendTo while rendering']() {
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
        },
      }),
    });

    this.registerComponent('second-component', {
      ComponentClass: Component.extend({
        layout: compile(`component-two`),

        didInsertElement() {
          element2 = this.element;
        },
      }),
    });

    let FirstComponent = this.owner.factoryFor('component:first-component');

    runTask(() => append(FirstComponent.create()));

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
            },
          });

          append(this._instance);
        },

        willDestroy() {
          this._instance.destroy();
        },
      }),
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
            },
          });

          append(this._instance);
        },

        willDestroy() {
          this._instance.destroy();
        },
      }),
    });

    let instantiatedRoots = 0;
    let destroyedRoots = 0;
    this.registerComponent('other-root', {
      ComponentClass: Component.extend({
        layout: compile(`fake-thing: {{this.counter}}`),
        init() {
          this._super(...arguments);
          this.counter = instantiatedRoots++;
        },
        willDestroy() {
          destroyedRoots++;
          this._super(...arguments);
        },
      }),
    });

    this.render(
      strip`
      {{#if this.showFooBar}}
        {{foo-bar}}
      {{else}}
        {{baz-qux}}
      {{/if}}
    `,
      { showFooBar: true }
    );

    this.assertComponentElement(element1, {});
    this.assertComponentElement(element2, { content: 'fake-thing: 0' });
    assert.equal(instantiatedRoots, 1);

    this.assertStableRerender();

    runTask(() => set(this.context, 'showFooBar', false));

    assert.equal(instantiatedRoots, 2);
    assert.equal(destroyedRoots, 1);

    this.assertComponentElement(element3, {});
    this.assertComponentElement(element4, { content: 'fake-thing: 1' });

    runTask(() => {
      component1.destroy();
      component2.destroy();
    });

    assert.equal(instantiatedRoots, 2);
    assert.equal(destroyedRoots, 2);
  }
}

moduleFor(
  'append: no arguments (attaching to document.body)',
  class extends AbstractAppendTest {
    append(component) {
      runTask(() => component.append());
      this.didAppend(component);
      return document.body;
    }
  }
);

moduleFor(
  'appendTo: a selector',
  class extends AbstractAppendTest {
    append(component) {
      runTask(() => component.appendTo('#qunit-fixture'));
      this.didAppend(component);
      return document.getElementById('qunit-fixture');
    }

    ['@test raises an assertion when the target does not exist in the DOM'](assert) {
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          layoutName: 'components/foo-bar',
        }),
        resolveableTemplate: 'FOO BAR!',
      });

      let FooBar = this.owner.factoryFor('component:foo-bar');

      this.component = FooBar.create();

      assert.ok(!this.component.element, 'precond - should not have an element');

      runTask(() => {
        expectAssertion(() => {
          this.component.appendTo('#does-not-exist-in-dom');
        }, /You tried to append to \(#does-not-exist-in-dom\) but that isn't in the DOM/);
      });

      assert.ok(!this.component.element, 'component should not have an element');
    }
  }
);

moduleFor(
  'appendTo: an element',
  class extends AbstractAppendTest {
    append(component) {
      let element = document.getElementById('qunit-fixture');
      runTask(() => component.appendTo(element));
      this.didAppend(component);
      return element;
    }
  }
);

moduleFor(
  'appendTo: with multiple components',
  class extends AbstractAppendTest {
    append(component) {
      runTask(() => component.appendTo('#qunit-fixture'));
      this.didAppend(component);
      return document.getElementById('qunit-fixture');
    }
  }
);
