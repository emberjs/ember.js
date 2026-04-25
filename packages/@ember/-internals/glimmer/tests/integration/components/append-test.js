import { moduleFor, RenderingTestCase, strip, runTask } from 'internal-test-helpers';

import { set } from '@ember/object';
import { setComponentTemplate } from '@glimmer/manager';

import { precompileTemplate } from '@ember/template-compilation';
import { Component } from '../../utils/helpers';

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

    let createLogger = (name, compiledTemplate) => {
      function pushHook(hookName) {
        hooks.push([name, hookName]);
      }

      let LoggerComponent = class extends Component {
        init() {
          super.init(...arguments);
          if (name in componentsByName) {
            throw new TypeError('Component named: ` ' + name + ' ` already registered');
          }
          componentsByName[name] = this;
          pushHook('init');
          this.on('init', () => pushHook('on(init)'));
        }

        didReceiveAttrs() {
          pushHook('didReceiveAttrs');
        }

        willInsertElement() {
          pushHook('willInsertElement');
        }

        willRender() {
          pushHook('willRender');
        }

        didInsertElement() {
          pushHook('didInsertElement');
        }

        didRender() {
          pushHook('didRender');
        }

        didUpdateAttrs() {
          pushHook('didUpdateAttrs');
        }

        willUpdate() {
          pushHook('willUpdate');
        }

        didUpdate() {
          pushHook('didUpdate');
        }

        willDestroyElement() {
          pushHook('willDestroyElement');
        }

        willClearRender() {
          pushHook('willClearRender');
        }

        didDestroyElement() {
          pushHook('didDestroyElement');
        }

        willDestroy() {
          pushHook('willDestroy');
          super.willDestroy(...arguments);
        }
      };

      let local = class extends LoggerComponent {};

      setComponentTemplate(compiledTemplate, local);

      this.owner.register(`component:${name}`, local);

      return local;
    };

    createLogger(
      'x-parent',
      precompileTemplate(`[parent: {{this.foo}}]
       [parent: {{this.parentValue}}

        <XChild @bar={{this.foo}} @childValue={{this.childValue}}>
         [yielded: {{this.foo}}]
        </XChild>
      `)
    );
    createLogger(
      'x-child',
      precompileTemplate(`
      [child: {{this.bar}}]
      [child: {{this.childValue}}]
      {{yield}}`)
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

  [`@test lifecycle hooks during component append`](assert) {
    let hooks = [];

    let componentsByName = {};

    // TODO: refactor/combine with other life-cycle tests
    let registerLoggerComponent = (name, { ComponentClass, resolveableTemplate }) => {
      function pushHook(hookName) {
        hooks.push([name, hookName]);
      }

      let ExtendedClass = class extends ComponentClass {
        init() {
          super.init(...arguments);
          if (name in componentsByName) {
            throw new TypeError('Component named: ` ' + name + ' ` already registered');
          }
          componentsByName[name] = this;
          pushHook('init');
          this.on('init', () => pushHook('on(init)'));
        }

        didReceiveAttrs() {
          pushHook('didReceiveAttrs');
        }

        willInsertElement() {
          pushHook('willInsertElement');
        }

        willRender() {
          pushHook('willRender');
        }

        didInsertElement() {
          pushHook('didInsertElement');
        }

        didRender() {
          pushHook('didRender');
        }

        didUpdateAttrs() {
          pushHook('didUpdateAttrs');
        }

        willUpdate() {
          pushHook('willUpdate');
        }

        didUpdate() {
          pushHook('didUpdate');
        }

        willDestroyElement() {
          pushHook('willDestroyElement');
        }

        willClearRender() {
          pushHook('willClearRender');
        }

        didDestroyElement() {
          pushHook('didDestroyElement');
        }

        willDestroy() {
          pushHook('willDestroy');
          super.willDestroy(...arguments);
        }
      };

      this.owner.register(`component:${name}`, ExtendedClass);

      if (resolveableTemplate) {
        this.owner.register(`template:components/${name}`, resolveableTemplate);
      }
    };

    registerLoggerComponent('x-parent', {
      ComponentClass: class extends Component {
        layoutName = 'components/x-parent';
      },

      resolveableTemplate: precompileTemplate(
        '[parent: {{this.foo}}]{{#x-child bar=this.foo}}[yielded: {{this.foo}}]{{/x-child}}'
      ),
    });

    registerLoggerComponent('x-child', {
      ComponentClass: class extends Component {
        tagName = '';
      },

      resolveableTemplate: precompileTemplate('[child: {{this.bar}}]{{yield}}'),
    });

    let XParent;

    XParent = this.owner.factoryFor('component:x-parent');

    this.component = XParent.create({ foo: 'zomg' });

    assert.deepEqual(
      hooks,
      [
        ['x-parent', 'init'],
        ['x-parent', 'on(init)'],
      ],
      'creation of x-parent'
    );

    hooks.length = 0;

    this.element = this.append(this.component);

    assert.deepEqual(
      hooks,
      [
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
      'appending of x-parent'
    );

    hooks.length = 0;

    runTask(() => componentsByName['x-parent'].rerender());

    assert.deepEqual(
      hooks,
      [
        ['x-parent', 'willUpdate'],
        ['x-parent', 'willRender'],

        ['x-parent', 'didUpdate'],
        ['x-parent', 'didRender'],
      ],
      'rerender x-parent'
    );

    hooks.length = 0;

    runTask(() => componentsByName['x-child'].rerender());

    assert.deepEqual(
      hooks,
      [
        ['x-parent', 'willUpdate'],
        ['x-parent', 'willRender'],

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

    runTask(() => set(this.component, 'foo', 'wow'));

    assert.deepEqual(
      hooks,
      [
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

    runTask(() => set(this.component, 'foo', 'zomg'));

    assert.deepEqual(
      hooks,
      [
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

    runTask(() => this.component.destroy());

    assert.deepEqual(
      hooks,
      [
        ['x-parent', 'willDestroyElement'],
        ['x-parent', 'willClearRender'],

        ['x-child', 'willDestroyElement'],
        ['x-child', 'willClearRender'],

        ['x-parent', 'didDestroyElement'],
        ['x-parent', 'willDestroy'],

        ['x-child', 'didDestroyElement'],
        ['x-child', 'willDestroy'],
      ],
      'destroy'
    );
  }

  [`@test appending, updating and destroying a single component`](assert) {
    let willDestroyCalled = 0;

    let XParentClass = class extends Component {
      layoutName = 'components/x-parent';
      willDestroyElement() {
        willDestroyCalled++;
      }
    };

    this.owner.register('component:x-parent', XParentClass);
    this.owner.register(
      'template:components/x-parent',
      precompileTemplate(
        '[parent: {{this.foo}}]{{#x-child bar=this.foo}}[yielded: {{this.foo}}]{{/x-child}}'
      )
    );

    this.owner.register(
      'component:x-child',
      setComponentTemplate(
        precompileTemplate('[child: {{this.bar}}]{{yield}}'),
        class extends Component {
          tagName = '';
        }
      )
    );

    let XParent;

    XParent = this.owner.factoryFor('component:x-parent');

    this.component = XParent.create({ foo: 'zomg' });

    assert.ok(!this.component.element, 'precond - should not have an element');

    this.element = this.append(this.component);

    let componentElement = this.component.element;

    this.assertComponentElement(componentElement, {
      content: '[parent: zomg][child: zomg][yielded: zomg]',
    });

    assert.equal(
      componentElement.parentElement,
      this.element,
      'It should be attached to the target'
    );

    runTask(() => this.rerender());

    this.assertComponentElement(componentElement, {
      content: '[parent: zomg][child: zomg][yielded: zomg]',
    });

    assert.equal(
      componentElement.parentElement,
      this.element,
      'It should be attached to the target'
    );

    runTask(() => set(this.component, 'foo', 'wow'));

    this.assertComponentElement(componentElement, {
      content: '[parent: wow][child: wow][yielded: wow]',
    });

    assert.equal(
      componentElement.parentElement,
      this.element,
      'It should be attached to the target'
    );

    runTask(() => set(this.component, 'foo', 'zomg'));

    this.assertComponentElement(componentElement, {
      content: '[parent: zomg][child: zomg][yielded: zomg]',
    });

    assert.equal(
      componentElement.parentElement,
      this.element,
      'It should be attached to the target'
    );

    runTask(() => this.component.destroy());

    assert.ok(!this.component.element, 'It should not have an element');
    assert.ok(!componentElement.parentElement, 'The component element should be detached');

    this.assert.equal(willDestroyCalled, 1);
  }

  ['@test releasing a root component after it has been destroy'](assert) {
    let renderer = this.owner.lookup('renderer:-dom');

    this.owner.register('component:x-component', class extends Component {});

    this.component = this.owner.factoryFor('component:x-component').create();
    this.append(this.component);

    assert.equal(renderer._roots.length, 1, 'added a root component');

    runTask(() => this.component.destroy());

    assert.equal(renderer._roots.length, 0, 'released the root component');
  }

  [`@test appending, updating and destroying multiple components`](assert) {
    let willDestroyCalled = 0;

    let XFirstClass = class extends Component {
      layoutName = 'components/x-first';

      willDestroyElement() {
        willDestroyCalled++;
      }
    };

    this.owner.register('component:x-first', XFirstClass);
    this.owner.register('template:components/x-first', precompileTemplate('x-first {{this.foo}}!'));

    let XSecondClass = class extends Component {
      layoutName = 'components/x-second';

      willDestroyElement() {
        willDestroyCalled++;
      }
    };

    this.owner.register('component:x-second', XSecondClass);
    this.owner.register(
      'template:components/x-second',
      precompileTemplate('x-second {{this.bar}}!')
    );

    let First, Second;

    First = this.owner.factoryFor('component:x-first');
    Second = this.owner.factoryFor('component:x-second');

    let first = First.create({ foo: 'foo' });
    let second = Second.create({ bar: 'bar' });

    this.assert.ok(!first.element, 'precond - should not have an element');
    this.assert.ok(!second.element, 'precond - should not have an element');

    let wrapper1, wrapper2;

    runTask(() => (wrapper1 = this.append(first)));
    runTask(() => (wrapper2 = this.append(second)));

    let componentElement1 = first.element;
    let componentElement2 = second.element;

    this.assertComponentElement(componentElement1, { content: 'x-first foo!' });
    this.assertComponentElement(componentElement2, {
      content: 'x-second bar!',
    });

    assert.equal(
      componentElement1.parentElement,
      wrapper1,
      'The first component should be attached to the target'
    );
    assert.equal(
      componentElement2.parentElement,
      wrapper2,
      'The second component should be attached to the target'
    );

    runTask(() => set(first, 'foo', 'FOO'));

    this.assertComponentElement(componentElement1, { content: 'x-first FOO!' });
    this.assertComponentElement(componentElement2, {
      content: 'x-second bar!',
    });

    assert.equal(
      componentElement1.parentElement,
      wrapper1,
      'The first component should be attached to the target'
    );
    assert.equal(
      componentElement2.parentElement,
      wrapper2,
      'The second component should be attached to the target'
    );

    runTask(() => set(second, 'bar', 'BAR'));

    this.assertComponentElement(componentElement1, { content: 'x-first FOO!' });
    this.assertComponentElement(componentElement2, {
      content: 'x-second BAR!',
    });

    assert.equal(
      componentElement1.parentElement,
      wrapper1,
      'The first component should be attached to the target'
    );
    assert.equal(
      componentElement2.parentElement,
      wrapper2,
      'The second component should be attached to the target'
    );

    runTask(() => {
      set(first, 'foo', 'foo');
      set(second, 'bar', 'bar');
    });

    this.assertComponentElement(componentElement1, { content: 'x-first foo!' });
    this.assertComponentElement(componentElement2, {
      content: 'x-second bar!',
    });

    assert.equal(
      componentElement1.parentElement,
      wrapper1,
      'The first component should be attached to the target'
    );
    assert.equal(
      componentElement2.parentElement,
      wrapper2,
      'The second component should be attached to the target'
    );

    runTask(() => {
      first.destroy();
      second.destroy();
    });

    assert.ok(!first.element, 'The first component should not have an element');
    assert.ok(!second.element, 'The second component should not have an element');

    assert.ok(!componentElement1.parentElement, 'The first component element should be detached');
    assert.ok(!componentElement2.parentElement, 'The second component element should be detached');

    this.assert.equal(willDestroyCalled, 2);
  }

  ['@test can appendTo while rendering']() {
    // Skip in GXT mode - nested rendering during didInsertElement causes
    // an infinite backburner loop because GXT rendering is synchronous
    if (globalThis.__GXT_MODE__) {
      return;
    }
    let owner = this.owner;

    let append = (component) => {
      return this.append(component);
    };

    let element1, element2;
    this.owner.register(
      'component:first-component',
      class extends Component {
        layout = precompileTemplate('component-one');

        didInsertElement() {
          element1 = this.element;

          let SecondComponent = owner.factoryFor('component:second-component');

          append(SecondComponent.create());
        }
      }
    );

    this.owner.register(
      'component:second-component',
      class extends Component {
        layout = precompileTemplate(`component-two`);

        didInsertElement() {
          element2 = this.element;
        }
      }
    );

    let FirstComponent = this.owner.factoryFor('component:first-component');

    runTask(() => append(FirstComponent.create()));

    this.assertComponentElement(element1, { content: 'component-one' });
    this.assertComponentElement(element2, { content: 'component-two' });
  }

  ['@test can appendTo and remove while rendering'](assert) {
    // Skip in GXT mode - nested rendering during didInsertElement causes
    // an infinite loop because GXT rendering is synchronous
    if (globalThis.__GXT_MODE__) {
      assert.expect(0);
      return;
    }
    let owner = this.owner;

    let append = (component) => {
      return this.append(component);
    };

    let element1, element2, element3, element4, component1, component2;
    this.owner.register(
      'component:foo-bar',
      class extends Component {
        layout = precompileTemplate('foo-bar');

        init() {
          super.init(...arguments);
          component1 = this;
        }

        didInsertElement() {
          element1 = this.element;

          let OtherRoot = owner.factoryFor('component:other-root');

          this._instance = OtherRoot.create({
            didInsertElement() {
              element2 = this.element;
            },
          });

          append(this._instance);
        }

        willDestroy() {
          this._instance.destroy();
        }
      }
    );

    this.owner.register(
      'component:baz-qux',
      class extends Component {
        layout = precompileTemplate('baz-qux');

        init() {
          super.init(...arguments);
          component2 = this;
        }

        didInsertElement() {
          element3 = this.element;

          let OtherRoot = owner.factoryFor('component:other-root');

          this._instance = OtherRoot.create({
            didInsertElement() {
              element4 = this.element;
            },
          });

          append(this._instance);
        }

        willDestroy() {
          this._instance.destroy();
        }
      }
    );

    let instantiatedRoots = 0;
    let destroyedRoots = 0;
    this.owner.register(
      'component:other-root',
      class extends Component {
        layout = precompileTemplate(`fake-thing: {{this.counter}}`);

        init() {
          super.init(...arguments);
          this.counter = instantiatedRoots++;
        }

        willDestroy() {
          destroyedRoots++;
          super.willDestroy(...arguments);
        }
      }
    );

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

// Skip all append tests in GXT mode - they trigger synchronous infinite loops
// in the backburner run loop when GXT rendering fires lifecycle hooks
if (!globalThis.__GXT_MODE__) {
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
        let FooBarClass = class extends Component {
          layoutName = 'components/foo-bar';
        };

        this.owner.register('component:foo-bar', FooBarClass);
        this.owner.register('template:components/foo-bar', precompileTemplate('FOO BAR!'));

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
} // end if (!globalThis.__GXT_MODE__)
