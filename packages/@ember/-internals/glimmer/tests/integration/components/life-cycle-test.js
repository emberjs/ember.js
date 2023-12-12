import { classes, moduleFor, RenderingTestCase, runTask, strip } from 'internal-test-helpers';

import { schedule } from '@ember/runloop';
import { set, setProperties } from '@ember/object';
import { A as emberA } from '@ember/array';
import { getViewElement, getViewId } from '@ember/-internals/views';

import { Component } from '../../utils/helpers';

class LifeCycleHooksTest extends RenderingTestCase {
  constructor() {
    super(...arguments);
    this.hooks = [];
    this.components = {};
    this.componentRegistry = [];
    this.teardownAssertions = [];
    this.viewRegistry = this.owner.lookup('-view-registry:main');
  }

  afterEach() {
    super.afterEach();

    for (let i = 0; i < this.teardownAssertions.length; i++) {
      this.teardownAssertions[i]();
    }
  }

  get isInteractive() {
    return true;
  }

  getBootOptions() {
    return {
      isInteractive: this.isInteractive,
    };
  }

  /* abstract */
  get ComponentClass() {
    throw new Error('Not implemented: `ComponentClass`');
  }

  /* abstract */
  invocationFor(/* name, namedArgs = {} */) {
    throw new Error('Not implemented: `invocationFor`');
  }

  /* abstract */
  attrFor(/* name */) {
    throw new Error('Not implemented: `attrFor`');
  }

  get boundHelpers() {
    return {
      invoke: bind(this.invocationFor, this),
      attr: bind(this.attrFor, this),
    };
  }

  assertRegisteredViews(label) {
    let viewRegistry = this.viewRegistry;
    let topLevelId = getViewId(this.component);
    let actual = Object.keys(viewRegistry)
      .sort()
      .filter((id) => id !== topLevelId);

    if (this.isInteractive) {
      let expected = this.componentRegistry.sort();

      this.assert.deepEqual(actual, expected, 'registered views - ' + label);
    } else {
      this.assert.deepEqual(actual, [], 'no views should be registered for non-interactive mode');
    }
  }

  registerComponent(name, { template = null }) {
    let pushComponent = (instance) => {
      this.components[name] = instance;
      this.componentRegistry.push(getViewId(instance));
    };

    let removeComponent = (instance) => {
      let index = this.componentRegistry.indexOf(getViewId(instance));
      this.componentRegistry.splice(index, 1);

      delete this.components[name];
    };

    let pushHook = (hookName, args) => {
      this.hooks.push(hook(name, hookName, args));
    };

    let assertParentView = (hookName, instance) => {
      this.assert.ok(instance.parentView, `parentView should be present in ${hookName}`);

      if (hookName === 'willDestroyElement') {
        this.assert.ok(
          instance.parentView.childViews.indexOf(instance) !== -1,
          `view is still connected to parentView in ${hookName}`
        );
      }
    };

    let assertElement = (hookName, instance, inDOM = true) => {
      if (instance.tagName === '') {
        return;
      }

      this.assert.ok(
        getViewElement(instance),
        `element should be present on ${instance} during ${hookName}`
      );

      if (this.isInteractive) {
        this.assert.ok(
          instance.element,
          `this.element should be present on ${instance} during ${hookName}`
        );
        this.assert.equal(
          document.body.contains(instance.element),
          inDOM,
          `element for ${instance} ${
            inDOM ? 'should' : 'should not'
          } be in the DOM during ${hookName}`
        );
      } else {
        this.assert.throws(
          () => instance.element,
          /Accessing `this.element` is not allowed in non-interactive environments/
        );
      }
    };

    let assertNoElement = (hookName, instance) => {
      this.assert.strictEqual(
        getViewElement(instance),
        null,
        `element should not be present in ${hookName}`
      );

      if (this.isInteractive) {
        this.assert.strictEqual(
          instance.element,
          null,
          `this.element should not be present in ${hookName}`
        );
      } else {
        this.assert.throws(
          () => instance.element,
          /Accessing `this.element` is not allowed in non-interactive environments/
        );
      }
    };

    let assertState = (hookName, expectedState, instance) => {
      this.assert.equal(
        instance._state,
        expectedState,
        `within ${hookName} the expected _state is ${expectedState}`
      );
    };

    let { isInteractive } = this;

    let ComponentClass = this.ComponentClass.extend({
      init() {
        this._super(...arguments);

        this.isInitialRender = true;
        this.componentName = name;
        pushHook('init');
        pushComponent(this);
        assertParentView('init', this);
        assertNoElement('init', this);
        assertState('init', 'preRender', this);

        this.on('init', () => pushHook('on(init)'));

        schedule('afterRender', () => {
          this.isInitialRender = false;
        });
      },

      didReceiveAttrs(options) {
        pushHook('didReceiveAttrs', options);
        assertParentView('didReceiveAttrs', this);

        if (this.isInitialRender) {
          assertNoElement('didReceiveAttrs', this);
          assertState('didReceiveAttrs', 'preRender', this);
        } else {
          assertElement('didReceiveAttrs', this);

          if (isInteractive) {
            assertState('didReceiveAttrs', 'inDOM', this);
          } else {
            assertState('didReceiveAttrs', 'hasElement', this);
          }
        }
      },

      willInsertElement() {
        pushHook('willInsertElement');
        assertParentView('willInsertElement', this);
        assertElement('willInsertElement', this, false);
        assertState('willInsertElement', 'hasElement', this);
      },

      willRender() {
        pushHook('willRender');
        assertParentView('willRender', this);

        if (this.isInitialRender) {
          assertNoElement('willRender', this, false);
          assertState('willRender', 'preRender', this);
        } else {
          assertElement('willRender', this);
          assertState('willRender', 'inDOM', this);
        }
      },

      didInsertElement() {
        pushHook('didInsertElement');
        assertParentView('didInsertElement', this);
        assertElement('didInsertElement', this);
        assertState('didInsertElement', 'inDOM', this);
      },

      didRender() {
        pushHook('didRender');
        assertParentView('didRender', this);
        assertElement('didRender', this);
        assertState('didRender', 'inDOM', this);
      },

      didUpdateAttrs(options) {
        pushHook('didUpdateAttrs', options);
        assertParentView('didUpdateAttrs', this);

        if (isInteractive) {
          assertState('didUpdateAttrs', 'inDOM', this);
        } else {
          assertState('didUpdateAttrs', 'hasElement', this);
        }
      },

      willUpdate(options) {
        pushHook('willUpdate', options);
        assertParentView('willUpdate', this);
        assertElement('willUpdate', this);
        assertState('willUpdate', 'inDOM', this);
      },

      didUpdate(options) {
        pushHook('didUpdate', options);
        assertParentView('didUpdate', this);
        assertElement('didUpdate', this);
        assertState('didUpdate', 'inDOM', this);
      },

      willDestroyElement() {
        pushHook('willDestroyElement');
        assertParentView('willDestroyElement', this);
        assertElement('willDestroyElement', this);
        assertState('willDestroyElement', 'inDOM', this);
      },

      willClearRender() {
        pushHook('willClearRender');
        assertParentView('willClearRender', this);
        assertElement('willClearRender', this);
        assertState('willClearRender', 'inDOM', this);
      },

      didDestroyElement() {
        pushHook('didDestroyElement');
        assertNoElement('didDestroyElement', this);
        assertState('didDestroyElement', 'destroying', this);
      },

      willDestroy() {
        pushHook('willDestroy');
        removeComponent(this);

        this._super(...arguments);
      },
    });

    super.registerComponent(name, { ComponentClass, template });
  }

  assertHooks({ label, interactive, nonInteractive }) {
    let rawHooks = this.isInteractive ? interactive : nonInteractive;
    let hooks = rawHooks.map((raw) => hook(...raw));
    this.assert.deepEqual(json(this.hooks), json(hooks), label);
    this.hooks = [];
  }

  ['@test lifecycle hooks are invoked in a predictable order']() {
    let { attr, invoke } = this.boundHelpers;

    this.registerComponent('the-top', {
      template: strip`
      <div>
        Twitter: {{${attr('twitter')}}}|
        ${invoke('the-middle', { name: string('Tom Dale') })}
      </div>`,
    });

    this.registerComponent('the-middle', {
      template: strip`
      <div>
        Name: {{${attr('name')}}}|
        ${invoke('the-bottom', { website: string('tomdale.net') })}
      </div>`,
    });

    this.registerComponent('the-bottom', {
      template: strip`
      <div>
        Website: {{${attr('website')}}}
      </div>`,
    });

    this.render(invoke('the-top', { twitter: expr(attr('twitter')) }), {
      twitter: '@tomdale',
    });

    this.assertText('Twitter: @tomdale|Name: Tom Dale|Website: tomdale.net');
    this.assertRegisteredViews('intial render');

    this.assertHooks({
      label: 'after initial render',

      interactive: [
        // Sync hooks

        ['the-top', 'init'],
        ['the-top', 'on(init)'],
        ['the-top', 'didReceiveAttrs'],
        ['the-top', 'willRender'],
        ['the-top', 'willInsertElement'],

        ['the-middle', 'init'],
        ['the-middle', 'on(init)'],
        ['the-middle', 'didReceiveAttrs'],
        ['the-middle', 'willRender'],
        ['the-middle', 'willInsertElement'],

        ['the-bottom', 'init'],
        ['the-bottom', 'on(init)'],
        ['the-bottom', 'didReceiveAttrs'],
        ['the-bottom', 'willRender'],
        ['the-bottom', 'willInsertElement'],

        // Async hooks

        ['the-bottom', 'didInsertElement'],
        ['the-bottom', 'didRender'],

        ['the-middle', 'didInsertElement'],
        ['the-middle', 'didRender'],

        ['the-top', 'didInsertElement'],
        ['the-top', 'didRender'],
      ],

      nonInteractive: [
        // Sync hooks
        ['the-top', 'init'],
        ['the-top', 'on(init)'],
        ['the-top', 'didReceiveAttrs'],

        ['the-middle', 'init'],
        ['the-middle', 'on(init)'],
        ['the-middle', 'didReceiveAttrs'],

        ['the-bottom', 'init'],
        ['the-bottom', 'on(init)'],
        ['the-bottom', 'didReceiveAttrs'],
      ],
    });

    runTask(() => this.components['the-bottom'].rerender());

    this.assertText('Twitter: @tomdale|Name: Tom Dale|Website: tomdale.net');

    this.assertHooks({
      label: 'after no-op rerender (bottom)',

      interactive: [
        // Sync hooks
        ['the-top', 'willUpdate'],
        ['the-top', 'willRender'],

        ['the-middle', 'willUpdate'],
        ['the-middle', 'willRender'],

        ['the-bottom', 'willUpdate'],
        ['the-bottom', 'willRender'],

        // Async hooks

        ['the-bottom', 'didUpdate'],
        ['the-bottom', 'didRender'],

        ['the-middle', 'didUpdate'],
        ['the-middle', 'didRender'],

        ['the-top', 'didUpdate'],
        ['the-top', 'didRender'],
      ],

      nonInteractive: [],
    });

    runTask(() => this.components['the-middle'].rerender());

    this.assertText('Twitter: @tomdale|Name: Tom Dale|Website: tomdale.net');

    this.assertHooks({
      label: 'after no-op rerender (middle)',

      interactive: [
        // Sync hooks

        ['the-top', 'willUpdate'],
        ['the-top', 'willRender'],

        ['the-middle', 'willUpdate'],
        ['the-middle', 'willRender'],

        // Async hooks

        ['the-middle', 'didUpdate'],
        ['the-middle', 'didRender'],

        ['the-top', 'didUpdate'],
        ['the-top', 'didRender'],
      ],

      nonInteractive: [],
    });

    runTask(() => this.components['the-top'].rerender());

    this.assertText('Twitter: @tomdale|Name: Tom Dale|Website: tomdale.net');

    this.assertHooks({
      label: 'after no-op rerender (top)',

      interactive: [
        // Sync hooks

        ['the-top', 'willUpdate'],
        ['the-top', 'willRender'],

        // Async hooks

        ['the-top', 'didUpdate'],
        ['the-top', 'didRender'],
      ],

      nonInteractive: [],
    });

    runTask(() => set(this.context, 'twitter', '@horsetomdale'));

    this.assertText('Twitter: @horsetomdale|Name: Tom Dale|Website: tomdale.net');

    // Because the `twitter` attr is only used by the topmost component,
    // and not passed down, we do not expect to see lifecycle hooks
    // called for child components. If the `didReceiveAttrs` hook used
    // the new attribute to rerender itself imperatively, that would result
    // in lifecycle hooks being invoked for the child.

    this.assertHooks({
      label: 'after update',

      interactive: [
        // Sync hooks

        ['the-top', 'didUpdateAttrs'],
        ['the-top', 'didReceiveAttrs'],

        ['the-top', 'willUpdate'],
        ['the-top', 'willRender'],

        // Async hooks

        ['the-top', 'didUpdate'],
        ['the-top', 'didRender'],
      ],

      nonInteractive: [
        // Sync hooks
        ['the-top', 'didUpdateAttrs'],
        ['the-top', 'didReceiveAttrs'],
      ],
    });

    this.teardownAssertions.push(() => {
      this.assertHooks({
        label: 'destroy',

        interactive: [
          ['the-top', 'willDestroyElement'],
          ['the-top', 'willClearRender'],
          ['the-middle', 'willDestroyElement'],
          ['the-middle', 'willClearRender'],
          ['the-bottom', 'willDestroyElement'],
          ['the-bottom', 'willClearRender'],
          ['the-top', 'didDestroyElement'],
          ['the-middle', 'didDestroyElement'],
          ['the-bottom', 'didDestroyElement'],
          ['the-top', 'willDestroy'],
          ['the-middle', 'willDestroy'],
          ['the-bottom', 'willDestroy'],
        ],

        nonInteractive: [
          ['the-top', 'willDestroy'],
          ['the-middle', 'willDestroy'],
          ['the-bottom', 'willDestroy'],
        ],
      });

      this.assertRegisteredViews('after destroy');
    });
  }

  ['@test lifecycle hooks are invoked in a correct sibling order']() {
    let { attr, invoke } = this.boundHelpers;

    this.registerComponent('the-parent', {
      template: strip`
      <div>
        ${invoke('the-first-child', { twitter: expr(attr('twitter')) })}|
        ${invoke('the-second-child', { name: expr(attr('name')) })}|
        ${invoke('the-last-child', { website: expr(attr('website')) })}
      </div>`,
    });

    this.registerComponent('the-first-child', {
      template: `Twitter: {{${attr('twitter')}}}`,
    });

    this.registerComponent('the-second-child', {
      template: `Name: {{${attr('name')}}}`,
    });

    this.registerComponent('the-last-child', {
      template: `Website: {{${attr('website')}}}`,
    });

    this.render(
      invoke('the-parent', {
        twitter: expr(attr('twitter')),
        name: expr(attr('name')),
        website: expr(attr('website')),
      }),
      {
        twitter: '@tomdale',
        name: 'Tom Dale',
        website: 'tomdale.net',
      }
    );

    this.assertText('Twitter: @tomdale|Name: Tom Dale|Website: tomdale.net');
    this.assertRegisteredViews('intial render');

    this.assertHooks({
      label: 'after initial render',

      interactive: [
        // Sync hooks

        ['the-parent', 'init'],
        ['the-parent', 'on(init)'],
        ['the-parent', 'didReceiveAttrs'],
        ['the-parent', 'willRender'],
        ['the-parent', 'willInsertElement'],

        ['the-first-child', 'init'],
        ['the-first-child', 'on(init)'],
        ['the-first-child', 'didReceiveAttrs'],
        ['the-first-child', 'willRender'],
        ['the-first-child', 'willInsertElement'],

        ['the-second-child', 'init'],
        ['the-second-child', 'on(init)'],
        ['the-second-child', 'didReceiveAttrs'],
        ['the-second-child', 'willRender'],
        ['the-second-child', 'willInsertElement'],

        ['the-last-child', 'init'],
        ['the-last-child', 'on(init)'],
        ['the-last-child', 'didReceiveAttrs'],
        ['the-last-child', 'willRender'],
        ['the-last-child', 'willInsertElement'],

        // Async hooks

        ['the-first-child', 'didInsertElement'],
        ['the-first-child', 'didRender'],

        ['the-second-child', 'didInsertElement'],
        ['the-second-child', 'didRender'],

        ['the-last-child', 'didInsertElement'],
        ['the-last-child', 'didRender'],

        ['the-parent', 'didInsertElement'],
        ['the-parent', 'didRender'],
      ],

      nonInteractive: [
        // Sync hooks

        ['the-parent', 'init'],
        ['the-parent', 'on(init)'],
        ['the-parent', 'didReceiveAttrs'],

        ['the-first-child', 'init'],
        ['the-first-child', 'on(init)'],
        ['the-first-child', 'didReceiveAttrs'],

        ['the-second-child', 'init'],
        ['the-second-child', 'on(init)'],
        ['the-second-child', 'didReceiveAttrs'],

        ['the-last-child', 'init'],
        ['the-last-child', 'on(init)'],
        ['the-last-child', 'didReceiveAttrs'],
      ],
    });

    runTask(() => this.components['the-first-child'].rerender());

    this.assertText('Twitter: @tomdale|Name: Tom Dale|Website: tomdale.net');

    this.assertHooks({
      label: 'after no-op rerender (first child)',

      interactive: [
        // Sync hooks

        ['the-parent', 'willUpdate'],
        ['the-parent', 'willRender'],

        ['the-first-child', 'willUpdate'],
        ['the-first-child', 'willRender'],

        // Async hooks

        ['the-first-child', 'didUpdate'],
        ['the-first-child', 'didRender'],

        ['the-parent', 'didUpdate'],
        ['the-parent', 'didRender'],
      ],

      nonInteractive: [],
    });

    runTask(() => this.components['the-second-child'].rerender());

    this.assertText('Twitter: @tomdale|Name: Tom Dale|Website: tomdale.net');

    this.assertHooks({
      label: 'after no-op rerender (second child)',

      interactive: [
        // Sync hooks

        ['the-parent', 'willUpdate'],
        ['the-parent', 'willRender'],

        ['the-second-child', 'willUpdate'],
        ['the-second-child', 'willRender'],

        // Async hooks

        ['the-second-child', 'didUpdate'],
        ['the-second-child', 'didRender'],

        ['the-parent', 'didUpdate'],
        ['the-parent', 'didRender'],
      ],

      nonInteractive: [],
    });

    runTask(() => this.components['the-last-child'].rerender());

    this.assertText('Twitter: @tomdale|Name: Tom Dale|Website: tomdale.net');

    this.assertHooks({
      label: 'after no-op rerender (last child)',

      interactive: [
        // Sync hooks

        ['the-parent', 'willUpdate'],
        ['the-parent', 'willRender'],

        ['the-last-child', 'willUpdate'],
        ['the-last-child', 'willRender'],

        // Async hooks

        ['the-last-child', 'didUpdate'],
        ['the-last-child', 'didRender'],

        ['the-parent', 'didUpdate'],
        ['the-parent', 'didRender'],
      ],

      nonInteractive: [],
    });

    runTask(() => this.components['the-parent'].rerender());

    this.assertText('Twitter: @tomdale|Name: Tom Dale|Website: tomdale.net');

    this.assertHooks({
      label: 'after no-op rerender (parent)',

      interactive: [
        // Sync hooks

        ['the-parent', 'willUpdate'],
        ['the-parent', 'willRender'],

        // Async hooks

        ['the-parent', 'didUpdate'],
        ['the-parent', 'didRender'],
      ],

      nonInteractive: [],
    });

    runTask(() =>
      setProperties(this.context, {
        twitter: '@horsetomdale',
        name: 'Horse Tom Dale',
        website: 'horsetomdale.net',
      })
    );

    this.assertText('Twitter: @horsetomdale|Name: Horse Tom Dale|Website: horsetomdale.net');

    this.assertHooks({
      label: 'after update',

      interactive: [
        // Sync hooks

        ['the-parent', 'didUpdateAttrs'],
        ['the-parent', 'didReceiveAttrs'],

        ['the-parent', 'willUpdate'],
        ['the-parent', 'willRender'],

        ['the-first-child', 'didUpdateAttrs'],
        ['the-first-child', 'didReceiveAttrs'],

        ['the-first-child', 'willUpdate'],
        ['the-first-child', 'willRender'],

        ['the-second-child', 'didUpdateAttrs'],
        ['the-second-child', 'didReceiveAttrs'],

        ['the-second-child', 'willUpdate'],
        ['the-second-child', 'willRender'],

        ['the-last-child', 'didUpdateAttrs'],
        ['the-last-child', 'didReceiveAttrs'],

        ['the-last-child', 'willUpdate'],
        ['the-last-child', 'willRender'],

        // Async hooks

        ['the-first-child', 'didUpdate'],
        ['the-first-child', 'didRender'],

        ['the-second-child', 'didUpdate'],
        ['the-second-child', 'didRender'],

        ['the-last-child', 'didUpdate'],
        ['the-last-child', 'didRender'],

        ['the-parent', 'didUpdate'],
        ['the-parent', 'didRender'],
      ],

      nonInteractive: [
        // Sync hooks

        ['the-parent', 'didUpdateAttrs'],
        ['the-parent', 'didReceiveAttrs'],

        ['the-first-child', 'didUpdateAttrs'],
        ['the-first-child', 'didReceiveAttrs'],

        ['the-second-child', 'didUpdateAttrs'],
        ['the-second-child', 'didReceiveAttrs'],

        ['the-last-child', 'didUpdateAttrs'],
        ['the-last-child', 'didReceiveAttrs'],
      ],
    });

    this.teardownAssertions.push(() => {
      this.assertHooks({
        label: 'destroy',

        interactive: [
          ['the-parent', 'willDestroyElement'],
          ['the-parent', 'willClearRender'],
          ['the-first-child', 'willDestroyElement'],
          ['the-first-child', 'willClearRender'],
          ['the-second-child', 'willDestroyElement'],
          ['the-second-child', 'willClearRender'],
          ['the-last-child', 'willDestroyElement'],
          ['the-last-child', 'willClearRender'],

          ['the-parent', 'didDestroyElement'],
          ['the-first-child', 'didDestroyElement'],
          ['the-second-child', 'didDestroyElement'],
          ['the-last-child', 'didDestroyElement'],

          ['the-parent', 'willDestroy'],
          ['the-first-child', 'willDestroy'],
          ['the-second-child', 'willDestroy'],
          ['the-last-child', 'willDestroy'],
        ],

        nonInteractive: [
          ['the-parent', 'willDestroy'],
          ['the-first-child', 'willDestroy'],
          ['the-second-child', 'willDestroy'],
          ['the-last-child', 'willDestroy'],
        ],
      });

      this.assertRegisteredViews('after destroy');
    });
  }

  ['@test passing values through attrs causes lifecycle hooks to fire if the attribute values have changed']() {
    let { attr, invoke } = this.boundHelpers;

    this.registerComponent('the-top', {
      template: strip`
      <div>
        Top: ${invoke('the-middle', { twitterTop: expr(attr('twitter')) })}
      </div>`,
    });

    this.registerComponent('the-middle', {
      template: strip`
      <div>
        Middle: ${invoke('the-bottom', {
          twitterMiddle: expr(attr('twitterTop')),
        })}
      </div>`,
    });

    this.registerComponent('the-bottom', {
      template: strip`
      <div>
        Bottom: {{${attr('twitterMiddle')}}}
      </div>`,
    });

    this.render(invoke('the-top', { twitter: expr(attr('twitter')) }), {
      twitter: '@tomdale',
    });

    this.assertText('Top: Middle: Bottom: @tomdale');
    this.assertRegisteredViews('intial render');

    this.assertHooks({
      label: 'after initial render',

      interactive: [
        // Sync hooks

        ['the-top', 'init'],
        ['the-top', 'on(init)'],
        ['the-top', 'didReceiveAttrs'],
        ['the-top', 'willRender'],
        ['the-top', 'willInsertElement'],

        ['the-middle', 'init'],
        ['the-middle', 'on(init)'],
        ['the-middle', 'didReceiveAttrs'],
        ['the-middle', 'willRender'],
        ['the-middle', 'willInsertElement'],

        ['the-bottom', 'init'],
        ['the-bottom', 'on(init)'],
        ['the-bottom', 'didReceiveAttrs'],
        ['the-bottom', 'willRender'],
        ['the-bottom', 'willInsertElement'],

        // Async hooks

        ['the-bottom', 'didInsertElement'],
        ['the-bottom', 'didRender'],

        ['the-middle', 'didInsertElement'],
        ['the-middle', 'didRender'],

        ['the-top', 'didInsertElement'],
        ['the-top', 'didRender'],
      ],

      nonInteractive: [
        // Sync hooks

        ['the-top', 'init'],
        ['the-top', 'on(init)'],
        ['the-top', 'didReceiveAttrs'],

        ['the-middle', 'init'],
        ['the-middle', 'on(init)'],
        ['the-middle', 'didReceiveAttrs'],

        ['the-bottom', 'init'],
        ['the-bottom', 'on(init)'],
        ['the-bottom', 'didReceiveAttrs'],
      ],
    });

    runTask(() => set(this.context, 'twitter', '@horsetomdale'));

    this.assertText('Top: Middle: Bottom: @horsetomdale');

    // Because the `twitter` attr is used by the all of the components,
    // the lifecycle hooks are invoked for all components.

    this.assertHooks({
      label: 'after updating (root)',

      interactive: [
        // Sync hooks

        ['the-top', 'didUpdateAttrs'],
        ['the-top', 'didReceiveAttrs'],

        ['the-top', 'willUpdate'],
        ['the-top', 'willRender'],

        ['the-middle', 'didUpdateAttrs'],
        ['the-middle', 'didReceiveAttrs'],

        ['the-middle', 'willUpdate'],
        ['the-middle', 'willRender'],

        ['the-bottom', 'didUpdateAttrs'],
        ['the-bottom', 'didReceiveAttrs'],

        ['the-bottom', 'willUpdate'],
        ['the-bottom', 'willRender'],

        // Async hooks

        ['the-bottom', 'didUpdate'],
        ['the-bottom', 'didRender'],

        ['the-middle', 'didUpdate'],
        ['the-middle', 'didRender'],

        ['the-top', 'didUpdate'],
        ['the-top', 'didRender'],
      ],

      nonInteractive: [
        // Sync hooks

        ['the-top', 'didUpdateAttrs'],
        ['the-top', 'didReceiveAttrs'],

        ['the-middle', 'didUpdateAttrs'],
        ['the-middle', 'didReceiveAttrs'],

        ['the-bottom', 'didUpdateAttrs'],
        ['the-bottom', 'didReceiveAttrs'],
      ],
    });

    runTask(() => this.rerender());

    this.assertText('Top: Middle: Bottom: @horsetomdale');

    // In this case, because the attrs are passed down, all child components are invoked.

    this.assertHooks({
      label: 'after no-op rernder (root)',
      interactive: [],
      nonInteractive: [],
    });

    this.teardownAssertions.push(() => {
      this.assertHooks({
        label: 'destroy',

        interactive: [
          ['the-top', 'willDestroyElement'],
          ['the-top', 'willClearRender'],
          ['the-middle', 'willDestroyElement'],
          ['the-middle', 'willClearRender'],
          ['the-bottom', 'willDestroyElement'],
          ['the-bottom', 'willClearRender'],
          ['the-top', 'didDestroyElement'],
          ['the-middle', 'didDestroyElement'],
          ['the-bottom', 'didDestroyElement'],
          ['the-top', 'willDestroy'],
          ['the-middle', 'willDestroy'],
          ['the-bottom', 'willDestroy'],
        ],

        nonInteractive: [
          ['the-top', 'willDestroy'],
          ['the-middle', 'willDestroy'],
          ['the-bottom', 'willDestroy'],
        ],
      });

      this.assertRegisteredViews('after destroy');
    });
  }

  ['@test components rendered from `{{each}}` have correct life-cycle hooks to be called']() {
    let { invoke } = this.boundHelpers;

    this.registerComponent('nested-item', { template: `{{yield}}` });

    this.registerComponent('an-item', {
      template: strip`
      {{#nested-item}}Item: {{this.count}}{{/nested-item}}
    `,
    });

    this.registerComponent('no-items', {
      template: strip`
      {{#nested-item}}Nothing to see here{{/nested-item}}
    `,
    });

    this.render(
      strip`
      {{#each this.items as |item|}}
        ${invoke('an-item', { count: expr('item') })}
      {{else}}
        ${invoke('no-items')}
      {{/each}}
    `,
      {
        items: [1, 2, 3, 4, 5],
      }
    );

    this.assertText('Item: 1Item: 2Item: 3Item: 4Item: 5');
    this.assertRegisteredViews('intial render');

    let initialHooks = () => {
      let ret = [
        ['an-item', 'init'],
        ['an-item', 'on(init)'],
        ['an-item', 'didReceiveAttrs'],
      ];
      if (this.isInteractive) {
        ret.push(['an-item', 'willRender'], ['an-item', 'willInsertElement']);
      }
      ret.push(
        ['nested-item', 'init'],
        ['nested-item', 'on(init)'],
        ['nested-item', 'didReceiveAttrs']
      );
      if (this.isInteractive) {
        ret.push(['nested-item', 'willRender'], ['nested-item', 'willInsertElement']);
      }
      return ret;
    };

    let initialAfterRenderHooks = () => {
      if (this.isInteractive) {
        return [
          ['nested-item', 'didInsertElement'],
          ['nested-item', 'didRender'],
          ['an-item', 'didInsertElement'],
          ['an-item', 'didRender'],
        ];
      } else {
        return [];
      }
    };

    this.assertHooks({
      label: 'after initial render',

      interactive: [
        // Sync hooks
        ...initialHooks(1),
        ...initialHooks(2),
        ...initialHooks(3),
        ...initialHooks(4),
        ...initialHooks(5),

        // Async hooks
        ...initialAfterRenderHooks(5),
        ...initialAfterRenderHooks(4),
        ...initialAfterRenderHooks(3),
        ...initialAfterRenderHooks(2),
        ...initialAfterRenderHooks(1),
      ],

      nonInteractive: [
        // Sync hooks
        ...initialHooks(1),
        ...initialHooks(2),
        ...initialHooks(3),
        ...initialHooks(4),
        ...initialHooks(5),

        // Async hooks
        ...initialAfterRenderHooks(5),
        ...initialAfterRenderHooks(4),
        ...initialAfterRenderHooks(3),
        ...initialAfterRenderHooks(2),
        ...initialAfterRenderHooks(1),
      ],
    });

    // TODO: Is this correct? Should childViews be populated in non-interactive mode?
    if (this.isInteractive) {
      this.assert.equal(this.component.childViews.length, 5, 'childViews precond');
    }

    runTask(() => set(this.context, 'items', []));

    // TODO: Is this correct? Should childViews be populated in non-interactive mode?
    if (this.isInteractive) {
      this.assert.equal(this.component.childViews.length, 1, 'childViews updated');
    }

    this.assertText('Nothing to see here');

    this.assertHooks({
      label: 'reset to empty array',

      interactive: [
        ['an-item', 'willDestroyElement'],
        ['an-item', 'willClearRender'],
        ['nested-item', 'willDestroyElement'],
        ['nested-item', 'willClearRender'],
        ['an-item', 'willDestroyElement'],
        ['an-item', 'willClearRender'],
        ['nested-item', 'willDestroyElement'],
        ['nested-item', 'willClearRender'],
        ['an-item', 'willDestroyElement'],
        ['an-item', 'willClearRender'],
        ['nested-item', 'willDestroyElement'],
        ['nested-item', 'willClearRender'],
        ['an-item', 'willDestroyElement'],
        ['an-item', 'willClearRender'],
        ['nested-item', 'willDestroyElement'],
        ['nested-item', 'willClearRender'],
        ['an-item', 'willDestroyElement'],
        ['an-item', 'willClearRender'],
        ['nested-item', 'willDestroyElement'],
        ['nested-item', 'willClearRender'],

        ['no-items', 'init'],
        ['no-items', 'on(init)'],
        ['no-items', 'didReceiveAttrs'],
        ['no-items', 'willRender'],
        ['no-items', 'willInsertElement'],

        ['nested-item', 'init'],
        ['nested-item', 'on(init)'],
        ['nested-item', 'didReceiveAttrs'],
        ['nested-item', 'willRender'],
        ['nested-item', 'willInsertElement'],

        ['nested-item', 'didInsertElement'],
        ['nested-item', 'didRender'],
        ['no-items', 'didInsertElement'],
        ['no-items', 'didRender'],

        ['an-item', 'didDestroyElement'],
        ['nested-item', 'didDestroyElement'],
        ['an-item', 'didDestroyElement'],
        ['nested-item', 'didDestroyElement'],
        ['an-item', 'didDestroyElement'],
        ['nested-item', 'didDestroyElement'],
        ['an-item', 'didDestroyElement'],
        ['nested-item', 'didDestroyElement'],
        ['an-item', 'didDestroyElement'],
        ['nested-item', 'didDestroyElement'],

        ['an-item', 'willDestroy'],
        ['nested-item', 'willDestroy'],
        ['an-item', 'willDestroy'],
        ['nested-item', 'willDestroy'],
        ['an-item', 'willDestroy'],
        ['nested-item', 'willDestroy'],
        ['an-item', 'willDestroy'],
        ['nested-item', 'willDestroy'],
        ['an-item', 'willDestroy'],
        ['nested-item', 'willDestroy'],
      ],

      nonInteractive: [
        ['no-items', 'init'],
        ['no-items', 'on(init)'],
        ['no-items', 'didReceiveAttrs'],

        ['nested-item', 'init'],
        ['nested-item', 'on(init)'],
        ['nested-item', 'didReceiveAttrs'],

        ['an-item', 'willDestroy'],
        ['nested-item', 'willDestroy'],
        ['an-item', 'willDestroy'],
        ['nested-item', 'willDestroy'],
        ['an-item', 'willDestroy'],
        ['nested-item', 'willDestroy'],
        ['an-item', 'willDestroy'],
        ['nested-item', 'willDestroy'],
        ['an-item', 'willDestroy'],
        ['nested-item', 'willDestroy'],
      ],
    });

    this.teardownAssertions.push(() => {
      this.assertHooks({
        label: 'destroy',

        interactive: [
          ['no-items', 'willDestroyElement'],
          ['no-items', 'willClearRender'],
          ['nested-item', 'willDestroyElement'],
          ['nested-item', 'willClearRender'],

          ['no-items', 'didDestroyElement'],
          ['nested-item', 'didDestroyElement'],

          ['no-items', 'willDestroy'],
          ['nested-item', 'willDestroy'],
        ],

        nonInteractive: [
          ['no-items', 'willDestroy'],
          ['nested-item', 'willDestroy'],
        ],
      });

      this.assertRegisteredViews('after destroy');
    });
  }
}

class CurlyComponentsTest extends LifeCycleHooksTest {
  get ComponentClass() {
    return Component;
  }

  invocationFor(name, namedArgs = {}) {
    let attrs = Object.keys(namedArgs)
      .map((k) => `${k}=${this.val(namedArgs[k])}`)
      .join(' ');
    return `{{${name} ${attrs}}}`;
  }

  attrFor(name) {
    return `this.${name}`;
  }

  /* private */
  val(value) {
    if (value.isString) {
      return JSON.stringify(value.value);
    } else if (value.isExpr) {
      return `(readonly ${value.value})`;
    } else {
      throw new Error(`Unknown value: ${value}`);
    }
  }
}

moduleFor(
  'Components test: interactive lifecycle hooks (curly components)',
  class extends CurlyComponentsTest {
    get isInteractive() {
      return true;
    }
  }
);

moduleFor(
  'Components test: non-interactive lifecycle hooks (curly components)',
  class extends CurlyComponentsTest {
    get isInteractive() {
      return false;
    }
  }
);

moduleFor(
  'Components test: interactive lifecycle hooks (tagless curly components)',
  class extends CurlyComponentsTest {
    get ComponentClass() {
      return Component.extend({ tagName: '' });
    }

    get isInteractive() {
      return true;
    }
  }
);

moduleFor(
  'Components test: non-interactive lifecycle hooks (tagless curly components)',
  class extends CurlyComponentsTest {
    get ComponentClass() {
      return Component.extend({ tagName: '' });
    }

    get isInteractive() {
      return false;
    }
  }
);

moduleFor(
  'Run loop and lifecycle hooks',
  class extends RenderingTestCase {
    ['@test afterRender set']() {
      let ComponentClass = Component.extend({
        width: '5',
        didInsertElement() {
          schedule('afterRender', () => {
            this.set('width', '10');
          });
        },
      });

      let template = `{{this.width}}`;
      this.registerComponent('foo-bar', { ComponentClass, template });

      this.render('{{foo-bar}}');

      this.assertText('10');

      runTask(() => this.rerender());

      this.assertText('10');
    }

    ['@test afterRender set on parent']() {
      let ComponentClass = Component.extend({
        didInsertElement() {
          schedule('afterRender', () => {
            let parent = this.get('parent');
            parent.set('foo', 'wat');
          });
        },
      });

      let template = `{{this.foo}}`;

      this.registerComponent('foo-bar', { ComponentClass, template });

      this.render('{{foo-bar parent=this foo=this.foo}}');

      this.assertText('wat');

      runTask(() => this.rerender());

      this.assertText('wat');
    }

    ['@test `willRender` can set before render (GH#14458)']() {
      let ComponentClass = Component.extend({
        tagName: 'a',
        customHref: 'http://google.com',
        attributeBindings: ['customHref:href'],
        willRender() {
          this.set('customHref', 'http://willRender.com');
        },
      });

      let template = `Hello World`;

      this.registerComponent('foo-bar', { ComponentClass, template });

      this.render(`{{foo-bar id="foo"}}`);

      this.assertElement(this.firstChild, {
        tagName: 'a',
        attrs: {
          id: 'foo',
          href: 'http://willRender.com',
          class: classes('ember-view'),
        },
      });
    }

    ['@test that thing about destroying'](assert) {
      let ParentDestroyedElements = [];
      let ChildDestroyedElements = [];

      let ParentComponent = Component.extend({
        willDestroyElement() {
          ParentDestroyedElements.push({
            id: this.itemId,
            name: 'parent-component',
            hasParent: Boolean(this.element.parentNode),
            nextSibling: Boolean(this.element.nextSibling),
            previousSibling: Boolean(this.element.previousSibling),
          });
        },
      });

      let PartentTemplate = strip`
      {{yield}}
      <ul>
        {{#nested-component nestedId=(concat this.itemId '-A')}}A{{/nested-component}}
        {{#nested-component nestedId=(concat this.itemId '-B')}}B{{/nested-component}}
      </ul>
    `;

      let NestedComponent = Component.extend({
        willDestroyElement() {
          ChildDestroyedElements.push({
            id: this.nestedId,
            name: 'nested-component',
            hasParent: Boolean(this.element.parentNode),
            nextSibling: Boolean(this.element.nextSibling),
            previousSibling: Boolean(this.element.previousSibling),
          });
        },
      });

      let NestedTemplate = `{{yield}}`;

      this.registerComponent('parent-component', {
        ComponentClass: ParentComponent,
        template: PartentTemplate,
      });

      this.registerComponent('nested-component', {
        ComponentClass: NestedComponent,
        template: NestedTemplate,
      });

      let array = emberA([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }]);

      this.render(
        strip`
        {{#each this.items as |item|}}
          {{#parent-component itemId=item.id}}{{item.id}}{{/parent-component}}
        {{/each}}
        {{#if this.model.shouldShow}}
          {{#parent-component itemId=6}}6{{/parent-component}}
        {{/if}}
        {{#if this.model.shouldShow}}
          {{#parent-component itemId=7}}7{{/parent-component}}
        {{/if}}
        `,
        {
          items: array,
          model: { shouldShow: true },
        }
      );

      this.assertText('1AB2AB3AB4AB5AB6AB7AB');

      runTask(() => {
        array.removeAt(2);
        array.removeAt(2);
        set(this.context, 'model.shouldShow', false);
      });

      this.assertText('1AB2AB5AB');

      assertDestroyHooks(
        assert,
        [...ParentDestroyedElements],
        [
          {
            id: 3,
            hasParent: true,
            nextSibling: true,
            previousSibling: true,
          },
          {
            id: 4,
            hasParent: true,
            nextSibling: true,
            previousSibling: true,
          },
          {
            id: 6,
            hasParent: true,
            nextSibling: true,
            previousSibling: true,
          },
          {
            id: 7,
            hasParent: true,
            nextSibling: false,
            previousSibling: true,
          },
        ]
      );

      assertDestroyHooks(
        assert,
        [...ChildDestroyedElements],
        [
          {
            id: '3-A',
            hasParent: true,
            nextSibling: true,
            previousSibling: false,
          },
          {
            id: '3-B',
            hasParent: true,
            nextSibling: false,
            previousSibling: true,
          },
          {
            id: '4-A',
            hasParent: true,
            nextSibling: true,
            previousSibling: false,
          },
          {
            id: '4-B',
            hasParent: true,
            nextSibling: false,
            previousSibling: true,
          },
          {
            id: '6-A',
            hasParent: true,
            nextSibling: true,
            previousSibling: false,
          },
          {
            id: '6-B',
            hasParent: true,
            nextSibling: false,
            previousSibling: true,
          },
          {
            id: '7-A',
            hasParent: true,
            nextSibling: true,
            previousSibling: false,
          },
          {
            id: '7-B',
            hasParent: true,
            nextSibling: false,
            previousSibling: true,
          },
        ]
      );
    }

    ['@test lifecycle hooks exist on the base class'](assert) {
      // Make sure we get the finalized component prototype
      let prototype = Component.proto();

      assert.equal(typeof prototype.didDestroyElement, 'function', 'didDestroyElement exists');
      assert.equal(typeof prototype.didInsertElement, 'function', 'didInsertElement exists');
      assert.equal(typeof prototype.didReceiveAttrs, 'function', 'didReceiveAttrs exists');
      assert.equal(typeof prototype.didRender, 'function', 'didRender exists');
      assert.equal(typeof prototype.didUpdate, 'function', 'didUpdate exists');
      assert.equal(typeof prototype.didUpdateAttrs, 'function', 'didUpdateAttrs exists');
      assert.equal(typeof prototype.willClearRender, 'function', 'willClearRender exists');
      assert.equal(typeof prototype.willDestroy, 'function', 'willDestroy exists');
      assert.equal(typeof prototype.willDestroyElement, 'function', 'willDestroyElement exists');
      assert.equal(typeof prototype.willInsertElement, 'function', 'willInsertElement exists');
      assert.equal(typeof prototype.willRender, 'function', 'willRender exists');
      assert.equal(typeof prototype.willUpdate, 'function', 'willUpdate exists');
    }
  }
);

function assertDestroyHooks(assert, _actual, _expected) {
  _expected.forEach((expected, i) => {
    let name = expected.name;
    assert.equal(expected.id, _actual[i].id, `${name} id is the same`);
    assert.equal(expected.hasParent, _actual[i].hasParent, `${name} has parent node`);
    assert.equal(expected.nextSibling, _actual[i].nextSibling, `${name} has next sibling node`);
    assert.equal(
      expected.previousSibling,
      _actual[i].previousSibling,
      `${name} has previous sibling node`
    );
  });
}

function bind(func, thisArg) {
  return (...args) => func.apply(thisArg, args);
}

function string(value) {
  return { isString: true, value };
}

function expr(value) {
  return { isExpr: true, value };
}

function hook(name, hook, { attrs, oldAttrs, newAttrs } = {}) {
  return { name, hook, args: { attrs, oldAttrs, newAttrs } };
}

function json(serializable) {
  return JSON.parse(JSON.stringify(serializable));
}
