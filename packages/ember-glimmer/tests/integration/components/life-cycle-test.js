import { set, setProperties, run } from 'ember-metal';
import { Component } from '../../utils/helpers';
import { strip } from '../../utils/abstract-test-case';
import { moduleFor, RenderingTest } from '../../utils/test-case';
import { getViewId, getViewElement } from 'ember-views';
import { A as emberA } from 'ember-runtime';

class LifeCycleHooksTest extends RenderingTest {
  constructor() {
    super();
    this.hooks = [];
    this.components = {};
    this.componentRegistry = [];
    this.teardownAssertions = [];
  }

  teardown() {
    super.teardown();

    for (let i = 0; i < this.teardownAssertions.length; i++) {
      this.teardownAssertions[i]();
    }
  }

  get isInteractive() {
    return true;
  }

  getBootOptions() {
    return {
      isInteractive: this.isInteractive
    };
  }

  /* abstract */
  get ComponentClass() {
    throw new Error('Not implemented: `ComponentClass`');
  }

  /* abstract */
  invocationFor(name, namedArgs = {}) {
    throw new Error('Not implemented: `invocationFor`');
  }

  /* abstract */
  attrFor(name) {
    throw new Error('Not implemented: `attrFor`');
  }

  get boundHelpers() {
    return {
      invoke: bind(this.invocationFor, this),
      attr:   bind(this.attrFor, this)
    };
  }

  assertRegisteredViews(label) {
    let viewRegistry = this.owner.lookup('-view-registry:main');
    let topLevelId = getViewId(this.component);
    let actual = Object.keys(viewRegistry).sort().filter(id => id !== topLevelId);

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
      let index = this.componentRegistry.indexOf(instance);
      this.componentRegistry.splice(index, 1);

      delete this.components[name];
    };

    let pushHook = (hookName, args) => {
      this.hooks.push(hook(name, hookName, args));
    };

    let assertParentView = (hookName, instance) => {
      this.assert.ok(instance.parentView, `parentView should be present in ${hookName}`);

      if (hookName === 'willDestroyElement') {
        this.assert.ok(instance.parentView.childViews.indexOf(instance) !== -1, `view is still connected to parentView in ${hookName}`);
      }
    };

    let assertElement = (hookName, instance, inDOM = true) => {
      if (instance.tagName === '') { return; }

      this.assert.ok(getViewElement(instance), `element should be present on ${instance} during ${hookName}`);

      if (this.isInteractive) {
        this.assert.ok(instance.element, `this.element should be present on ${instance} during ${hookName}`);
        this.assert.equal(document.body.contains(instance.element), inDOM, `element for ${instance} ${inDOM ? 'should' : 'should not'} be in the DOM during ${hookName}`);
      } else {
        this.assert.throws(() => instance.element, /Accessing `this.element` is not allowed in non-interactive environments/);
      }
    };

    let assertNoElement = (hookName, instance) => {
      this.assert.strictEqual(getViewElement(instance), null, `element should not be present in ${hookName}`);

      if (this.isInteractive) {
        this.assert.strictEqual(instance.element, null, `this.element should not be present in ${hookName}`);
      } else {
        this.assert.throws(() => instance.element, /Accessing `this.element` is not allowed in non-interactive environments/);
      }
    };

    let assertState = (hookName, expectedState, instance) => {
      this.assert.equal(instance._state, expectedState, `within ${hookName} the expected _state is ${expectedState}`);
    };

    let { isInteractive } = this;

    let ComponentClass = this.ComponentClass.extend({
      init() {
        expectDeprecation(() => { this._super(...arguments); },
          /didInitAttrs called/);

        this.isInitialRender = true;
        this.componentName = name;
        pushHook('init');
        pushComponent(this);
        assertParentView('init', this);
        assertNoElement('init', this);
        assertState('init', 'preRender', this);

        run.scheduleOnce('afterRender', () => {
          this.isInitialRender = false;
        });
      },

      didInitAttrs(options) {
        pushHook('didInitAttrs', options);
        assertParentView('didInitAttrs', this);
        assertNoElement('didInitAttrs', this);
        assertState('didInitAttrs', 'preRender', this);
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

      willRender() {
        pushHook('willRender');
        assertParentView('willRender', this);

        if (this.isInitialRender) {
          assertNoElement('willRender', this);
          assertState('willRender', 'preRender', this);
        } else {
          assertElement('willRender', this);
          assertState('willRender', 'inDOM', this);
        }
      },

      willInsertElement() {
        pushHook('willInsertElement');
        assertParentView('willInsertElement', this);
        assertElement('willInsertElement', this, false);
        assertState('willInsertElement', 'hasElement', this);
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
      }
    });

    super.registerComponent(name, { ComponentClass, template });
  }

  assertHooks({ label, interactive, nonInteractive }) {
    let rawHooks = this.isInteractive ? interactive : nonInteractive;
    let hooks = rawHooks.map(raw => hook(...raw));
    this.assert.deepEqual(json(this.hooks), json(hooks), label);
    this.hooks = [];
  }

  ['@test lifecycle hooks are invoked in a predictable order']() {
    let { attr, invoke } = this.boundHelpers;

    this.registerComponent('the-top', { template: strip`
      <div>
        Twitter: {{${attr('twitter')}}}|
        ${invoke('the-middle', { name: string('Tom Dale') })}
      </div>`
    });

    this.registerComponent('the-middle', { template: strip`
      <div>
        Name: {{${attr('name')}}}|
        ${invoke('the-bottom', { website: string('tomdale.net') })}
      </div>`
    });

    this.registerComponent('the-bottom', { template: strip`
      <div>
        Website: {{${attr('website')}}}
      </div>`
    });

    this.render(invoke('the-top', { twitter: expr('twitter') }), { twitter: '@tomdale' });

    this.assertText('Twitter: @tomdale|Name: Tom Dale|Website: tomdale.net');
    this.assertRegisteredViews('intial render');

    let topAttrs = { twitter: '@tomdale' };
    let middleAttrs = { name: 'Tom Dale' };
    let bottomAttrs = { website: 'tomdale.net' };

    this.assertHooks({
      label: 'after initial render',

      interactive: [
        // Sync hooks

        ['the-top', 'init'],
        ['the-top', 'didInitAttrs',       { attrs: topAttrs }],
        ['the-top', 'didReceiveAttrs',    { newAttrs: topAttrs }],
        ['the-top', 'willRender'],
        ['the-top', 'willInsertElement'],

        ['the-middle', 'init'],
        ['the-middle', 'didInitAttrs',    { attrs: middleAttrs }],
        ['the-middle', 'didReceiveAttrs', { newAttrs: middleAttrs }],
        ['the-middle', 'willRender'],
        ['the-middle', 'willInsertElement'],

        ['the-bottom', 'init'],
        ['the-bottom', 'didInitAttrs',    { attrs: bottomAttrs }],
        ['the-bottom', 'didReceiveAttrs', { newAttrs: bottomAttrs }],
        ['the-bottom', 'willRender'],
        ['the-bottom', 'willInsertElement'],

        // Async hooks

        ['the-bottom', 'didInsertElement'],
        ['the-bottom', 'didRender'],

        ['the-middle', 'didInsertElement'],
        ['the-middle', 'didRender'],

        ['the-top', 'didInsertElement'],
        ['the-top', 'didRender']
      ],

      nonInteractive: [
        // Sync hooks
        ['the-top', 'init'],
        ['the-top', 'didInitAttrs',       { attrs: topAttrs }],
        ['the-top', 'didReceiveAttrs',    { newAttrs: topAttrs }],

        ['the-middle', 'init'],
        ['the-middle', 'didInitAttrs',    { attrs: middleAttrs }],
        ['the-middle', 'didReceiveAttrs', { newAttrs: middleAttrs }],

        ['the-bottom', 'init'],
        ['the-bottom', 'didInitAttrs',    { attrs: bottomAttrs }],
        ['the-bottom', 'didReceiveAttrs', { newAttrs: bottomAttrs }]
      ]
    });

    this.runTask(() => this.components['the-bottom'].rerender());

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
        ['the-top', 'didRender']
      ],

      nonInteractive: []
    });

    this.runTask(() => this.components['the-middle'].rerender());

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
        ['the-top', 'didRender']
      ],

      nonInteractive: []
    });

    this.runTask(() => this.components['the-top'].rerender());

    this.assertText('Twitter: @tomdale|Name: Tom Dale|Website: tomdale.net');

    this.assertHooks({
      label: 'after no-op rerender (top)',

      interactive: [
        // Sync hooks

        ['the-top', 'willUpdate'],
        ['the-top', 'willRender'],

        // Async hooks

        ['the-top', 'didUpdate'],
        ['the-top', 'didRender']
      ],

      nonInteractive: []
    });

    this.runTask(() => set(this.context, 'twitter', '@horsetomdale'));

    this.assertText('Twitter: @horsetomdale|Name: Tom Dale|Website: tomdale.net');

    // Because the `twitter` attr is only used by the topmost component,
    // and not passed down, we do not expect to see lifecycle hooks
    // called for child components. If the `didReceiveAttrs` hook used
    // the new attribute to rerender itself imperatively, that would result
    // in lifecycle hooks being invoked for the child.

    topAttrs = { oldAttrs: { twitter: '@tomdale' }, newAttrs: { twitter: '@horsetomdale' } };

    this.assertHooks({
      label: 'after update',

      interactive: [
        // Sync hooks

        ['the-top', 'didUpdateAttrs', topAttrs],
        ['the-top', 'didReceiveAttrs', topAttrs],

        ['the-top', 'willUpdate'],
        ['the-top', 'willRender'],

        // Async hooks

        ['the-top', 'didUpdate'],
        ['the-top', 'didRender']
      ],

      nonInteractive: [
        // Sync hooks
        ['the-top', 'didUpdateAttrs', topAttrs],
        ['the-top', 'didReceiveAttrs', topAttrs]
      ]
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
          ['the-bottom', 'willDestroy']
        ],

        nonInteractive: [
          ['the-top', 'willDestroy'],
          ['the-middle', 'willDestroy'],
          ['the-bottom', 'willDestroy']
        ]
      });

      this.assertRegisteredViews('after destroy');
    });
  }

  ['@test lifecycle hooks are invoked in a correct sibling order']() {
    let { attr, invoke } = this.boundHelpers;

    this.registerComponent('the-parent', { template: strip`
      <div>
        ${invoke('the-first-child', { twitter: expr(attr('twitter')) })}|
        ${invoke('the-second-child', { name: expr(attr('name')) })}|
        ${invoke('the-last-child', { website: expr(attr('website')) })}
      </div>`
    });

    this.registerComponent('the-first-child', { template: `Twitter: {{${attr('twitter')}}}` });

    this.registerComponent('the-second-child', { template: `Name: {{${attr('name')}}}` });

    this.registerComponent('the-last-child', { template: `Website: {{${attr('website')}}}` });

    this.render(invoke('the-parent', {
      twitter: expr('twitter'),
      name: expr('name'),
      website: expr('website')
    }), {
      twitter: '@tomdale',
      name: 'Tom Dale',
      website: 'tomdale.net'
    });

    this.assertText('Twitter: @tomdale|Name: Tom Dale|Website: tomdale.net');
    this.assertRegisteredViews('intial render');

    let parentAttrs = { twitter: '@tomdale', name: 'Tom Dale', website: 'tomdale.net' };
    let firstAttrs  = { twitter: '@tomdale' };
    let secondAttrs = { name: 'Tom Dale' };
    let lastAttrs = { website: 'tomdale.net' };

    this.assertHooks({
      label: 'after initial render',

      interactive: [
        // Sync hooks

        ['the-parent', 'init'],
        ['the-parent', 'didInitAttrs',          { attrs: parentAttrs }],
        ['the-parent', 'didReceiveAttrs',       { newAttrs: parentAttrs }],
        ['the-parent', 'willRender'],
        ['the-parent', 'willInsertElement'],

        ['the-first-child', 'init'],
        ['the-first-child', 'didInitAttrs',     { attrs: firstAttrs }],
        ['the-first-child', 'didReceiveAttrs',  { newAttrs: firstAttrs }],
        ['the-first-child', 'willRender'],
        ['the-first-child', 'willInsertElement'],

        ['the-second-child', 'init'],
        ['the-second-child', 'didInitAttrs',    { attrs: secondAttrs }],
        ['the-second-child', 'didReceiveAttrs', { newAttrs: secondAttrs }],
        ['the-second-child', 'willRender'],
        ['the-second-child', 'willInsertElement'],

        ['the-last-child', 'init'],
        ['the-last-child', 'didInitAttrs',      { attrs: lastAttrs }],
        ['the-last-child', 'didReceiveAttrs',   { newAttrs: lastAttrs }],
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
        ['the-parent', 'didRender']
      ],

      nonInteractive: [
        // Sync hooks

        ['the-parent', 'init'],
        ['the-parent', 'didInitAttrs',          { attrs: parentAttrs }],
        ['the-parent', 'didReceiveAttrs',       { newAttrs: parentAttrs }],

        ['the-first-child', 'init'],
        ['the-first-child', 'didInitAttrs',     { attrs: firstAttrs }],
        ['the-first-child', 'didReceiveAttrs',  { newAttrs: firstAttrs }],

        ['the-second-child', 'init'],
        ['the-second-child', 'didInitAttrs',    { attrs: secondAttrs }],
        ['the-second-child', 'didReceiveAttrs', { newAttrs: secondAttrs }],

        ['the-last-child', 'init'],
        ['the-last-child', 'didInitAttrs',      { attrs: lastAttrs }],
        ['the-last-child', 'didReceiveAttrs',   { newAttrs: lastAttrs }]
      ]
    });

    this.runTask(() => this.components['the-first-child'].rerender());

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
        ['the-parent', 'didRender']
      ],

      nonInteractive: []
    });

    this.runTask(() => this.components['the-second-child'].rerender());

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
        ['the-parent', 'didRender']
      ],

      nonInteractive: []
    });

    this.runTask(() => this.components['the-last-child'].rerender());

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
        ['the-parent', 'didRender']
      ],

      nonInteractive: []
    });

    this.runTask(() => this.components['the-parent'].rerender());

    this.assertText('Twitter: @tomdale|Name: Tom Dale|Website: tomdale.net');

    this.assertHooks({
      label: 'after no-op rerender (parent)',

      interactive: [
        // Sync hooks

        ['the-parent', 'willUpdate'],
        ['the-parent', 'willRender'],

        // Async hooks

        ['the-parent', 'didUpdate'],
        ['the-parent', 'didRender']
      ],

      nonInteractive: []
    });

    this.runTask(() => setProperties(this.context, {
      twitter: '@horsetomdale',
      name: 'Horse Tom Dale',
      website: 'horsetomdale.net'
    }));

    this.assertText('Twitter: @horsetomdale|Name: Horse Tom Dale|Website: horsetomdale.net');

    parentAttrs = {
      oldAttrs: { twitter: '@tomdale', name: 'Tom Dale', website: 'tomdale.net' },
      newAttrs: { twitter: '@horsetomdale', name: 'Horse Tom Dale', website: 'horsetomdale.net' }
    };
    firstAttrs  = { oldAttrs: { twitter: '@tomdale' }, newAttrs: { twitter: '@horsetomdale' } };
    secondAttrs = { oldAttrs: { name: 'Tom Dale' }, newAttrs: { name: 'Horse Tom Dale' } };
    lastAttrs = { oldAttrs: { website: 'tomdale.net' }, newAttrs: { website: 'horsetomdale.net' } };

    this.assertHooks({
      label: 'after update',

      interactive: [
        // Sync hooks

        ['the-parent', 'didUpdateAttrs', parentAttrs],
        ['the-parent', 'didReceiveAttrs', parentAttrs],

        ['the-parent', 'willUpdate'],
        ['the-parent', 'willRender'],

        ['the-first-child', 'didUpdateAttrs', firstAttrs],
        ['the-first-child', 'didReceiveAttrs', firstAttrs],

        ['the-first-child', 'willUpdate'],
        ['the-first-child', 'willRender'],

        ['the-second-child', 'didUpdateAttrs', secondAttrs],
        ['the-second-child', 'didReceiveAttrs', secondAttrs],

        ['the-second-child', 'willUpdate'],
        ['the-second-child', 'willRender'],

        ['the-last-child', 'didUpdateAttrs', lastAttrs],
        ['the-last-child', 'didReceiveAttrs', lastAttrs],

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
        ['the-parent', 'didRender']
      ],

      nonInteractive: [
        // Sync hooks

        ['the-parent', 'didUpdateAttrs', parentAttrs],
        ['the-parent', 'didReceiveAttrs', parentAttrs],

        ['the-first-child', 'didUpdateAttrs', firstAttrs],
        ['the-first-child', 'didReceiveAttrs', firstAttrs],

        ['the-second-child', 'didUpdateAttrs', secondAttrs],
        ['the-second-child', 'didReceiveAttrs', secondAttrs],

        ['the-last-child', 'didUpdateAttrs', lastAttrs],
        ['the-last-child', 'didReceiveAttrs', lastAttrs]
      ]
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
          ['the-last-child', 'willDestroy']
        ],

        nonInteractive: [
          ['the-parent', 'willDestroy'],
          ['the-first-child', 'willDestroy'],
          ['the-second-child', 'willDestroy'],
          ['the-last-child', 'willDestroy']
        ]
      });

      this.assertRegisteredViews('after destroy');
    });
  }

  ['@test passing values through attrs causes lifecycle hooks to fire if the attribute values have changed']() {
    let { attr, invoke } = this.boundHelpers;

    this.registerComponent('the-top', { template: strip`
      <div>
        Top: ${invoke('the-middle', { twitterTop: expr(attr('twitter')) })}
      </div>`
    });

    this.registerComponent('the-middle', { template: strip`
      <div>
        Middle: ${invoke('the-bottom', { twitterMiddle: expr(attr('twitterTop')) })}
      </div>`
    });

    this.registerComponent('the-bottom', { template: strip`
      <div>
        Bottom: {{${attr('twitterMiddle')}}}
      </div>`
    });

    this.render(invoke('the-top', { twitter: expr('twitter') }), { twitter: '@tomdale' });

    this.assertText('Top: Middle: Bottom: @tomdale');
    this.assertRegisteredViews('intial render');

    let topAttrs = { twitter: '@tomdale' };
    let middleAttrs = { twitterTop: '@tomdale' };
    let bottomAttrs = { twitterMiddle: '@tomdale' };

    this.assertHooks({
      label: 'after initial render',

      interactive: [
        // Sync hooks

        ['the-top', 'init'],
        ['the-top', 'didInitAttrs',       { attrs: topAttrs }],
        ['the-top', 'didReceiveAttrs',    { newAttrs: topAttrs }],
        ['the-top', 'willRender'],
        ['the-top', 'willInsertElement'],

        ['the-middle', 'init'],
        ['the-middle', 'didInitAttrs',    { attrs: middleAttrs }],
        ['the-middle', 'didReceiveAttrs', { newAttrs: middleAttrs }],
        ['the-middle', 'willRender'],
        ['the-middle', 'willInsertElement'],

        ['the-bottom', 'init'],
        ['the-bottom', 'didInitAttrs',    { attrs: bottomAttrs }],
        ['the-bottom', 'didReceiveAttrs', { newAttrs: bottomAttrs }],
        ['the-bottom', 'willRender'],
        ['the-bottom', 'willInsertElement'],

        // Async hooks

        ['the-bottom', 'didInsertElement'],
        ['the-bottom', 'didRender'],

        ['the-middle', 'didInsertElement'],
        ['the-middle', 'didRender'],

        ['the-top', 'didInsertElement'],
        ['the-top', 'didRender']
      ],

      nonInteractive: [
        // Sync hooks

        ['the-top', 'init'],
        ['the-top', 'didInitAttrs',       { attrs: topAttrs }],
        ['the-top', 'didReceiveAttrs',    { newAttrs: topAttrs }],

        ['the-middle', 'init'],
        ['the-middle', 'didInitAttrs',    { attrs: middleAttrs }],
        ['the-middle', 'didReceiveAttrs', { newAttrs: middleAttrs }],

        ['the-bottom', 'init'],
        ['the-bottom', 'didInitAttrs',    { attrs: bottomAttrs }],
        ['the-bottom', 'didReceiveAttrs', { newAttrs: bottomAttrs }]
      ]
    });

    this.runTask(() => set(this.context, 'twitter', '@horsetomdale'));

    this.assertText('Top: Middle: Bottom: @horsetomdale');

    // Because the `twitter` attr is used by the all of the components,
    // the lifecycle hooks are invoked for all components.

    topAttrs = { oldAttrs: { twitter: '@tomdale' }, newAttrs: { twitter: '@horsetomdale' } };
    middleAttrs = { oldAttrs: { twitterTop: '@tomdale' }, newAttrs: { twitterTop: '@horsetomdale' } };
    bottomAttrs = { oldAttrs: { twitterMiddle: '@tomdale' }, newAttrs: { twitterMiddle: '@horsetomdale' } };

    this.assertHooks({
      label: 'after updating (root)',

      interactive: [
        // Sync hooks

        ['the-top', 'didUpdateAttrs', topAttrs],
        ['the-top', 'didReceiveAttrs', topAttrs],

        ['the-top', 'willUpdate'],
        ['the-top', 'willRender'],

        ['the-middle', 'didUpdateAttrs', middleAttrs],
        ['the-middle', 'didReceiveAttrs', middleAttrs],

        ['the-middle', 'willUpdate'],
        ['the-middle', 'willRender'],

        ['the-bottom', 'didUpdateAttrs', bottomAttrs],
        ['the-bottom', 'didReceiveAttrs', bottomAttrs],

        ['the-bottom', 'willUpdate'],
        ['the-bottom', 'willRender'],

        // Async hooks

        ['the-bottom', 'didUpdate'],
        ['the-bottom', 'didRender'],

        ['the-middle', 'didUpdate'],
        ['the-middle', 'didRender'],

        ['the-top', 'didUpdate'],
        ['the-top', 'didRender']
      ],

      nonInteractive: [
        // Sync hooks

        ['the-top', 'didUpdateAttrs', topAttrs],
        ['the-top', 'didReceiveAttrs', topAttrs],

        ['the-middle', 'didUpdateAttrs', middleAttrs],
        ['the-middle', 'didReceiveAttrs', middleAttrs],

        ['the-bottom', 'didUpdateAttrs', bottomAttrs],
        ['the-bottom', 'didReceiveAttrs', bottomAttrs]
      ]
    });

    this.runTask(() => this.rerender());

    this.assertText('Top: Middle: Bottom: @horsetomdale');

    // In this case, because the attrs are passed down, all child components are invoked.

    topAttrs = { oldAttrs: { twitter: '@horsetomdale' }, newAttrs: { twitter: '@horsetomdale' } };
    middleAttrs = { oldAttrs: { twitterTop: '@horsetomdale' }, newAttrs: { twitterTop: '@horsetomdale' } };
    bottomAttrs = { oldAttrs: { twitterMiddle: '@horsetomdale' }, newAttrs: { twitterMiddle: '@horsetomdale' } };

    this.assertHooks({
      label: 'after no-op rernder (root)',
      interactive: [],
      nonInteractive: []
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
          ['the-bottom', 'willDestroy']
        ],

        nonInteractive: [
          ['the-top', 'willDestroy'],
          ['the-middle', 'willDestroy'],
          ['the-bottom', 'willDestroy']
        ]
      });

      this.assertRegisteredViews('after destroy');
    });
  }

  ['@test components rendered from `{{each}}` have correct life-cycle hooks to be called']() {
    let { invoke } = this.boundHelpers;

    this.registerComponent('nested-item', { template: `{{yield}}` });

    this.registerComponent('an-item', { template: strip`
      {{#nested-item}}Item: {{count}}{{/nested-item}}
    ` });

    this.registerComponent('no-items', { template: strip`
      {{#nested-item}}Nothing to see here{{/nested-item}}
    ` });

    this.render(strip`
      {{#each items as |item|}}
        ${invoke('an-item', { count: expr('item') })}
      {{else}}
        ${invoke('no-items')}
      {{/each}}
    `, {
      items: [1, 2, 3, 4, 5]
    });

    this.assertText('Item: 1Item: 2Item: 3Item: 4Item: 5');
    this.assertRegisteredViews('intial render');

    let initialHooks = (count) => {
      let ret = [
        ['an-item', 'init'],
        ['an-item', 'didInitAttrs',       { attrs: { count } }],
        ['an-item', 'didReceiveAttrs',    { newAttrs: { count } }]
      ];
      if (this.isInteractive) {
        ret.push(
          ['an-item', 'willRender'],
          ['an-item', 'willInsertElement']
        );
      }
      ret.push(
        ['nested-item', 'init'],
        ['nested-item', 'didInitAttrs',       { attrs: { } }],
        ['nested-item', 'didReceiveAttrs',    { newAttrs: { } }]
      );
      if (this.isInteractive) {
        ret.push(
          ['nested-item', 'willRender'],
          ['nested-item', 'willInsertElement']
        );
      }
      return ret;
    };

    let initialAfterRenderHooks = (count) => {
      if (this.isInteractive) {
        return [
          ['nested-item', 'didInsertElement'],
          ['nested-item', 'didRender'],
          ['an-item', 'didInsertElement'],
          ['an-item', 'didRender']
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
          ...initialAfterRenderHooks(1)
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
          ...initialAfterRenderHooks(1)
      ]
    });

    // TODO: Is this correct? Should childViews be populated in non-interactive mode?
    if (this.isInteractive) {
      this.assert.equal(this.component.childViews.length, 5, 'childViews precond');
    }

    this.runTask(() => set(this.context, 'items', []));

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
        ['no-items', 'didInitAttrs',       { attrs: { } }],
        ['no-items', 'didReceiveAttrs',    { newAttrs: { } }],
        ['no-items', 'willRender'],
        ['no-items', 'willInsertElement'],


        ['nested-item', 'init'],
        ['nested-item', 'didInitAttrs',       { attrs: { } }],
        ['nested-item', 'didReceiveAttrs',    { newAttrs: { } }],
        ['nested-item', 'willRender'],
        ['nested-item', 'willInsertElement'],

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

        ['nested-item', 'didInsertElement'],
        ['nested-item', 'didRender'],
        ['no-items', 'didInsertElement'],
        ['no-items', 'didRender'],

        ['an-item', 'willDestroy'],
        ['nested-item', 'willDestroy'],
        ['an-item', 'willDestroy'],
        ['nested-item', 'willDestroy'],
        ['an-item', 'willDestroy'],
        ['nested-item', 'willDestroy'],
        ['an-item', 'willDestroy'],
        ['nested-item', 'willDestroy'],
        ['an-item', 'willDestroy'],
        ['nested-item', 'willDestroy']
      ],

      nonInteractive: [
        ['no-items', 'init'],
        ['no-items', 'didInitAttrs',       { attrs: { } }],
        ['no-items', 'didReceiveAttrs',    { newAttrs: { } }],

        ['nested-item', 'init'],
        ['nested-item', 'didInitAttrs',       { attrs: { } }],
        ['nested-item', 'didReceiveAttrs',    { newAttrs: { } }],

        ['an-item', 'willDestroy'],
        ['nested-item', 'willDestroy'],
        ['an-item', 'willDestroy'],
        ['nested-item', 'willDestroy'],
        ['an-item', 'willDestroy'],
        ['nested-item', 'willDestroy'],
        ['an-item', 'willDestroy'],
        ['nested-item', 'willDestroy'],
        ['an-item', 'willDestroy'],
        ['nested-item', 'willDestroy']
      ]
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
          ['nested-item', 'willDestroy']
        ],

        nonInteractive: [
          ['no-items', 'willDestroy'],
          ['nested-item', 'willDestroy']
        ]
      });

      this.assertRegisteredViews('after destroy');
    });
  }
}

moduleFor('Components test: interactive lifecycle hooks (curly components)', class extends LifeCycleHooksTest {

  get ComponentClass() {
    return Component;
  }

  get isInteractive() {
    return true;
  }

  invocationFor(name, namedArgs = {}) {
    let attrs = Object.keys(namedArgs).map(k => `${k}=${this.val(namedArgs[k])}`).join(' ');
    return `{{${name} ${attrs}}}`;
  }

  attrFor(name) {
    return `${name}`;
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
});

moduleFor('Components test: non-interactive lifecycle hooks (curly components)', class extends LifeCycleHooksTest {
  get ComponentClass() {
    return Component;
  }

  get isInteractive() {
    return false;
  }

  invocationFor(name, namedArgs = {}) {
    let attrs = Object.keys(namedArgs).map(k => `${k}=${this.val(namedArgs[k])}`).join(' ');
    return `{{${name} ${attrs}}}`;
  }

  attrFor(name) {
    return `${name}`;
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
});

moduleFor('Run loop and lifecycle hooks', class extends RenderingTest {
  ['@test afterRender set']() {
    let ComponentClass = Component.extend({
      width: '5',
      didInsertElement() {
        run.scheduleOnce('afterRender', () => {
          this.set('width', '10');
        });
      }
    });

    let template = `{{width}}`;
    this.registerComponent('foo-bar', { ComponentClass, template });

    this.render('{{foo-bar}}');

    this.assertText('10');

    this.runTask(() => this.rerender());

    this.assertText('10');
  }

  ['@test afterRender set on parent']() {
    let ComponentClass = Component.extend({
      didInsertElement() {
        run.scheduleOnce('afterRender', () => {
          let parent = this.get('parent');
          parent.set('foo', 'wat');
        });
      }
    });

    let template = `{{foo}}`;

    this.registerComponent('foo-bar', { ComponentClass, template });

    this.render('{{foo-bar parent=this foo=foo}}');

    this.assertText('wat');

    this.runTask(() => this.rerender());

    this.assertText('wat');
  }
});

function bind(func, thisArg) {
  return (...args) => func.apply(thisArg, args);
}

function string(value) {
  return { isString: true, value };
}

function expr(value) {
  return { isExpr: true, value };
}

function hook(name, hook, args) {
  return { name, hook, args };
}

function json(serializable) {
  return JSON.parse(JSON.stringify(serializable));
}

const HOOKS = [
  'init',
  'didReceiveAttrs',
  'didInitAttrs',
  'didInsertElement',
  'didRender',
  'didUpdate',
  'didDestroyElement',
  'didUpdateAttrs',
  'willClearRender',
  'willDestroy',
  'willDestroyElement',
  'willInsertElement',
  'willUpdate',
  'willRender'
];

class HookCountTest extends RenderingTest {
  constructor() {
    super(...arguments);
    this.initCounts();
    this.expectedCounts = null;
  }

  initCounts() {
    HOOKS.forEach((hook) => this[hook] = 0);
  }

  assertInvariantCounts(eventName) {
    if (this[eventName] !== 0 && this.expectedCounts[eventName] !== 0) {
      if (this[eventName] && !this.expectedCounts[eventName]) {
        this.assert.ok(false, `Invariant: ${eventName} was set to ${this[eventName]} but not expected.`);
      } else if (!this[eventName] && this.expectedCounts[eventName]) {
        this.assert.ok(false, `Invariant: ${eventName} was expected to be ${this.expectedCounts[eventName]} but it was ${this[eventName]}.`);
      }
    }
  }

  // @abstract
  expectInitialCounts() {
    throw new Error('Must implement');
  }

  // @abstract
  expectReplaceCounts() {
    throw new Error('Must implement');
  }

  expectNoCounts() {
    this.expectedCounts = {};
  }

  expectDestroyCounts() {
    this.expectedCounts = {
      didDestroyElement: 1,
      willClearRender: 1,
      willDestroy: 1,
      willDestroyElement: 1
    };
  }

  expectCreateCounts() {
    this.expectedCounts = {
      init: 1,
      didReceiveAttrs: 1,
      didInitAttrs: 1,
      didInsertElement: 1,
      didRender: 1,
      willInsertElement: 1,
      willRender: 1
    };
  }

  expectInteriorCounts() {
    this.expectedCounts = {
      didRender: 1,
      didUpdate: 1,
      willUpdate: 1,
      willRender: 1
    };
  }

  assertCounts() {
    HOOKS.forEach((eventName) => {
      this.assertInvariantCounts(eventName);
      if (this[eventName] === 0 && this.expectedCounts[eventName] === undefined) {
        this.assert.ok(true, `${eventName} should be ${this[eventName]}`);
      } else if (this.expectedCounts[eventName]) {
        this.assert.equal(this[eventName], this.expectedCounts[eventName], `${eventName} should be ${this[eventName]}`);
      }
    });
    this.initCounts();
  }

  runHooks(_renderType, ...args) {
    let parts = _renderType.split(' -> ');
    parts.forEach((renderType) => {
      this.assert.ok(true, `${_renderType.toUpperCase()} for #${this.type}`);
      this[`_${renderType}`](_renderType, ...args);
      this.assertCounts();
    });
  }

  setup() {
    let assertions = this;
    this.registerComponent('foo-bar', { ComponentClass: Component.extend({
      init() {
        expectDeprecation(() => { this._super(...arguments); }, /didInitAttrs called/);
        assertions.init++;
      },
      didInitAttrs() {
        assertions.didInitAttrs++;
      },
      didReceiveAttrs() {
        assertions.didReceiveAttrs++;
      },
      didInsertElement() {
        assertions.didInsertElement++;
        assertions.assert.ok(this.element, 'Should have an element in `didInsertElement`');
        assertions.assert.ok(this.$().next(), '`didInsertElement` can traverse to nextSibling');
        assertions.assert.ok(this.$().prev(), '`didInsertElement` can travers to previousSibling');
      },
      didRender() {
        assertions.didRender++;
        assertions.assert.ok(this.element, 'Should have an element in `didRender`');
        assertions.assert.ok(this.$().next(), '`didRender` can traverse to nextSibling');
        assertions.assert.ok(this.$().prev(), '`didRender` can traverse to previousSibling');
      },
      didUpdate() {
        assertions.didUpdate++;
      },
      didUpdateAttrs() {
        assertions.didUpdateAttrs++;
      },
      didDestroyElement() {
        assertions.didDestroyElement++;
        assertions.assert.notOk(this.element, 'Should not have an element in `didDestroyElement`');
      },
      willClearRender() {
        assertions.willClearRender++;
      },
      willDestroy() {
        assertions.willDestroy++;
        assertions.assert.notOk(this.element, 'Should not have an element in `willDestroy`');
      },
      willDestroyElement() {
        assertions.willDestroyElement++;
        assertions.assert.ok(this.element, 'Should have an element in `willDestroyElement`');
        assertions.assert.ok(this.$().next(), '`willDestroyElement` can traverse to nextSibling');
        assertions.assert.ok(this.$().prev(), '`willDestroyElement` can traverse to previousSibling');
      },
      willInsertElement() {
        assertions.willInsertElement++;
        assertions.assert.ok(this.element, 'Should have an element in `willInsertElement`');
      },
      willUpdate() {
        assertions.willUpdate++;
      },
      willRender() {
        assertions.willRender++;
      }
    }), template: '{{item.value}}' });
  }
}

class ListHookCounts extends HookCountTest {
  constructor(type) {
    super();
    this.type = type;
    this.key = null;
    this.data = null;
  }

  hookTemplate() {
    let key = this.key ? `key=${key}` : '';
    return strip`
      {{#${this.type} model ${key} as |item|}}
        <li>PREV</li>
        {{foo-bar item=item}}
        <li>NEXT</li>
      {{else}}
        INVERSE
      {{/${this.type}}}
    `;
  }

  expectInitialCounts() {
    this.expectedCounts = {
      init: 3,
      didReceiveAttrs: 3,
      didInitAttrs: 3,
      didInsertElement: 3,
      didRender: 3,
      willInsertElement: 3,
      willRender: 3
    };
  }

  expectInverseCounts() {
    this.expectedCounts = {
      didDestroyElement: 3,
      willClearRender: 3,
      willDestroy: 3,
      willDestroyElement: 3
    };
  }

  expectToReplaceCounts() {
    this.expectedCounts = {
      init: 3,
      didReceiveAttrs: 3,
      didInitAttrs: 3,
      didInsertElement: 3,
      didRender: 3,
      willInsertElement: 3,
      willRender: 3
    };
  }

  expectReplaceCounts() {
    this.expectedCounts = {
      init: 3,
      didReceiveAttrs: 3,
      didInitAttrs: 3,
      didInsertElement: 3,
      didRender: 3,
      didDestroyElement: 5,
      willClearRender: 5,
      willDestroy: 5,
      willDestroyElement: 5,
      willInsertElement: 3,
      willRender: 3
    };
  }

  expectAppendCounts() {
    this.expectedCounts = {
      init: 1,
      didInsertElement: 1,
      didInitAttrs: 1,
      didRender: 1,
      willRender: 1,
      didReceiveAttrs: 1,
      willInsertElement: 1
    };
  }

  expectConcatCounts() {
    this.expectedCounts = {
      init: 1,
      didInsertElement: 1,
      didInitAttrs: 1,
      didRender: 1,
      willRender: 1,
      didReceiveAttrs: 1,
      willInsertElement: 1
    };
  }

  _initial(renderType, data, key) {
    this.data = data;
    this.render(this.hookTemplate(key), { model: data });
    if (this.type === 'with') {
      this.assertText('PREV1NEXT');
    } else {
      this.assertText('PREV1NEXTPREV2NEXTPREV3NEXT');
    }

    this.expectInitialCounts();
  }

  _rerender(renderType) {
    this.runTask(() => this.rerender());
    this.assertStableRerender();
    this.expectNoCounts();
  }

  _interior(renderType, key, value) {
    if (this.type === 'each') {
      this.runTask(() => this.context.set(`model.0.${key}`, value));
      this.expectInteriorCounts();
      this.runTask(() => this.context.set(`model.0.${key}`, value)); // idempotent update
    } else {
      this.runTask(() => this.context.set(`model.${key}`, value));
      this.expectInteriorCounts();
      this.runTask(() => this.context.set(`model.${key}`, value)); // idempotent update
    }

    if (this.type === 'with') {
      this.assertText('PREV10NEXT');
    } else {
      this.assertText('PREV10NEXTPREV2NEXTPREV3NEXT');
    }

    this.expectInteriorCounts();
  }

  _inverse(renderType) {
    this.runTask(() => this.context.set(`model`, null));
    this.assertText('INVERSE');

    if (renderType === 'inverse -> replace') {
      this.expectNoCounts();
    } else {
      this.expectInverseCounts();
    }
  }

  _replace(renderType, data) {
    let counts;
    if (renderType === 'inverse -> replace') {
      counts = this.expectToReplaceCounts.bind(this);
    } else {
      counts = this.expectReplaceCounts.bind(this);
    }

    this.runTask(() => this.context.set(`model`, data));
    counts();
    this.runTask(() => this.context.set(`model`, data)); // idempotent replace

    if (this.type === 'with') {
      this.assertText('PREV1NEXT');
    } else {
      this.assertText('PREV1NEXTPREV2NEXTPREV3NEXT');
    }

    counts();
  }

  _append(renderType, data) {
    this.runTask(() => this.context.model.pushObject(data));
    this.assertText('PREV10NEXTPREV2NEXTPREV3NEXTPREV4NEXT');
    this.expectAppendCounts();
  }

  _concat(renderType, data) {
    let array = this.context.model.concat(data);
    this.runTask(() => this.context.set('model', array));
    this.expectConcatCounts();
    this.runTask(() => this.context.set('model', array)); // idempotent
    this.assertText('PREV10NEXTPREV2NEXTPREV3NEXTPREV4NEXTPREV5NEXT');
    this.expectConcatCounts();
  }
}

moduleFor('Each hook counts and element access', class extends ListHookCounts {
  constructor() {
    super('each');
  }

  ['@test default each']() {
    this.setup();
    this.runHooks('initial', emberA([{ value: 1 }, { value: 2 }, { value: 3 }]));
    this.runHooks('rerender');
    this.runHooks('interior', 'value', 10);
    this.runHooks('append', { value: 4 });
    this.runHooks('concat', { value: 5 });
    this.runHooks('replace', emberA([{ value: 1 }, { value: 2 }, { value: 3 }]));
    this.runHooks('inverse');
    this.runHooks('inverse -> replace', emberA([{ value: 1 }, { value: 2 }, { value: 3 }]));
  }

  ['@test each with explicit @identity key']() {
    this.setup('@identity');
    this.runHooks('initial', emberA([{ value: 1 }, { value: 2 }, { value: 3 }]));
    this.runHooks('rerender');
    this.runHooks('interior', 'value', '10');
    this.runHooks('append', { value: 4 });
    this.runHooks('concat', { value: 5 });
    this.runHooks('replace', emberA([{ value: 1 }, { value: 2 }, { value: 3 }]));
    this.runHooks('inverse');
    this.runHooks('inverse -> replace', emberA([{ value: 1 }, { value: 2 }, { value: 3 }]));
  }

  ['@test each with explicit @index key']() {
    this.setup('@index');
    this.runHooks('initial', emberA([{ value: 1 }, { value: 2 }, { value: 3 }]));
    this.runHooks('rerender');
    this.runHooks('interior', 'value', '10');
    this.runHooks('append', { value: 4 });
    this.runHooks('concat', { value: 5 });
    this.runHooks('replace', emberA([{ value: 1 }, { value: 2 }, { value: 3 }]));
    this.runHooks('inverse');
    this.runHooks('inverse -> replace', emberA([{ value: 1 }, { value: 2 }, { value: 3 }]));
  }
});

moduleFor('Each-in hook counts and element access', class extends ListHookCounts {
  constructor() {
    super('each-in');
  }

  expectReplaceCounts() {
    this.expectedCounts = {
      didUpdateAttrs: 3,
      didReceiveAttrs: 3,
      didRender: 3,
      didUpdate: 3,
      willRender: 3,
      willUpdate: 3
    };
  }

  hookTemplate() {
    return strip`
      {{#${this.type} model as |item|}}
        <li>PREV</li>
        {{foo-bar item=(get model item)}}
        <li>NEXT</li>
      {{else}}
        INVERSE
      {{/${this.type}}}
    `;
  }

  ['@test default each-in']() {
    this.setup();
    this.runHooks('initial', { item1: { value: 1 }, item2: { value: 2 }, item3: { value: 3 } });
    this.runHooks('rerender');
    this.runHooks('interior', 'item1.value', '10');
    this.runHooks('replace', { item1: { value: 1 }, item2: { value: 2 }, item3: { value: 3 } });
    this.runHooks('inverse');
    this.runHooks('inverse -> replace', [{ value: 1 }, { value: 2 }, { value: 3 }]);
  }
});


moduleFor('With hook counts and element access', class extends ListHookCounts {
  constructor() {
    super('with');
  }

  expectInitialCounts() {
    this.expectedCounts = {
      init: 1,
      didReceiveAttrs: 1,
      didInitAttrs: 1,
      didInsertElement: 1,
      didRender: 1,
      willInsertElement: 1,
      willRender: 1
    };
  }

  expectInverseCounts() {
    this.expectedCounts = {
      didDestroyElement: 1,
      willClearRender: 1,
      willDestroy: 1,
      willDestroyElement: 1
    };
  }

  expectToReplaceCounts() {
    this.expectedCounts = {
      init: 1,
      didReceiveAttrs: 1,
      didInitAttrs: 1,
      didInsertElement: 1,
      didRender: 1,
      willInsertElement: 1,
      willRender: 1
    };
  }

  expectReplaceCounts() {
    this.expectedCounts = {
      didReceiveAttrs: 1,
      didRender: 1,
      didUpdate: 1,
      didUpdateAttrs: 1,
      willUpdate: 1,
      willRender: 1
    };
  }

  ['@test default #with']() {
    this.setup();
    this.runHooks('initial', { value: 1 });
    this.runHooks('rerender');
    this.runHooks('interior', 'value', '10');
    this.runHooks('replace', { value: 1 });
    this.runHooks('inverse');
    this.runHooks('inverse -> replace', { value: 1 });
  }
});

class ConditionalBlock extends HookCountTest {
  constructor(type) {
    super();
    this.type = type;
    this.data = null;
  }

  expectReplaceCounts() {
    this.expectedCounts = {
      didReceiveAttrs: 1,
      didUpdateAttrs: 1,
      didUpdate: 1,
      didRender: 1,
      willRender: 1,
      willUpdate: 1
    };
  }

  hookTemplate() {
    return strip`
      {{#${this.type} model.value}}
        <li>PREV</li>
        {{foo-bar item=model}}
        <li>NEXT</li>
      {{else}}
        INVERSE
      {{/${this.type}}}
    `;
  }

  _initial(renderType, data) {
    this.data = data;
    this.render(this.hookTemplate(), { model: data });
    this.assertText('PREV1NEXT');
    this.expectCreateCounts();
  }

  _rerender(renderType) {
    this.runTask(() => this.rerender());
    this.expectNoCounts();
    this.assertStableRerender();
  }

  _interior(renderType, value) {
    if (this.type === 'unless') {
      this.runTask(() => this.context.set(`model.item.value`, value));
      this.expectInteriorCounts();
      this.runTask(() => this.context.set(`model.item.value`, value)); // idempotent update
    } else {
      this.runTask(() => this.context.set(`model.value`, value));
      this.expectInteriorCounts();
      this.runTask(() => this.context.set(`model.value`, value)); // idempotent update
    }

    this.assertText('PREV10NEXT');
    this.expectInteriorCounts();
  }

  _inverse(renderType) {
    this.runTask(() => this.context.set(`model`, null));

    if (renderType === 'inverse -> replace') {
      this.expectNoCounts();
    } else {
      this.expectDestroyCounts();
    }

    this.assertText('INVERSE');
  }

  _replace(renderType, data) {
    this.runTask(() => this.context.set(`model`, data));
    if (renderType === 'inverse -> replace') {
      this.expectCreateCounts();
      this.runTask(() => this.context.set(`model`, data)); // idempotent replace
      this.expectCreateCounts();
      this.assertText('PREV1NEXT');
    } else {
      this.expectReplaceCounts();
      this.runTask(() => this.context.set(`model`, data)); // idempotent replace
      this.expectReplaceCounts();
      this.assertText('PREV2NEXT');
    }
  }
}

moduleFor('If hook counts and element access', class extends ConditionalBlock {
  constructor() {
    super('if');
  }

  hookTemplate() {
    return strip`
      {{#${this.type} model.value}}
        <li>PREV</li>
        {{foo-bar item=model}}
        <li>NEXT</li>
      {{else}}
        INVERSE
      {{/${this.type}}}
    `;
  }

  ['@test default #if']() {
    this.setup('if');
    this.runHooks('initial', { value: 1 });
    this.runHooks('rerender');
    this.runHooks('interior', 10);
    this.runHooks('replace', { value: 2 });
    this.runHooks('inverse');
    this.runHooks('inverse -> replace', { value: 1 });
  }
});

moduleFor('Unless hook counts and element access', class extends ConditionalBlock {
  constructor() {
    super('unless');
  }

  hookTemplate() {
    return strip`
      {{#unless model.predicate}}
        INVERSE
      {{else}}
        <li>PREV</li>
          {{foo-bar item=model.item}}
        <li>NEXT</li>
      {{/unless}}
    `;
  }

  ['@test default #unless']() {
    this.setup();
    this.runHooks('initial', { predicate: true, item: { value: 1 } });
    this.runHooks('rerender');
    this.runHooks('interior', 10);
    this.runHooks('replace', { predicate: true, item: { value: 2 } });
    this.runHooks('inverse');
    this.runHooks('inverse -> replace', { predicate: true, item: { value: 1 } });
  }
});
