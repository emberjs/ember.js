import { set } from 'ember-metal/property_set';
import { Component } from '../../utils/helpers';
import { strip } from '../../utils/abstract-test-case';
import { moduleFor, RenderingTest } from '../../utils/test-case';

class LifeCycleHooksTest extends RenderingTest {
  constructor() {
    super();
    this.hooks = [];
    this.components = {};
  }

  teardown() {
    super();
    this.assertHooks(
      'destroy',
      ['the-top', 'willDestroyElement'],
      ['the-middle', 'willDestroyElement'],
      ['the-bottom', 'willDestroyElement']
    );
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

  registerComponent(name, { template = null }) {
    let pushComponent = (instance) => {
      this.components[name] = instance;
    };

    let pushHook = (hookName, args) => {
      this.hooks.push(hook(name, hookName, args));
    };

    let ComponentClass = this.ComponentClass.extend({
      init() {
        expectDeprecation(() => { this._super(...arguments); },
          /didInitAttrs called/);

        pushHook('init');
        pushComponent(this);
      },

      didInitAttrs(options) {
        pushHook('didInitAttrs', options);
      },

      didUpdateAttrs(options) {
        pushHook('didUpdateAttrs', options);
      },

      willUpdate(options) {
        pushHook('willUpdate', options);
      },

      didReceiveAttrs(options) {
        pushHook('didReceiveAttrs', options);
      },

      willRender() {
        pushHook('willRender');
      },

      didRender() {
        pushHook('didRender');
      },

      didInsertElement() {
        pushHook('didInsertElement');
      },

      didUpdate(options) {
        pushHook('didUpdate', options);
      },

      willDestroyElement() {
        pushHook('willDestroyElement');
      }
    });

    super.registerComponent(name, { ComponentClass, template });
  }

  assertHooks(label, ...rawHooks) {
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

    let topAttrs = { twitter: '@tomdale' };
    let middleAttrs = { name: 'Tom Dale' };
    let bottomAttrs = { website: 'tomdale.net' };

    this.assertHooks(

      'after initial render',

      // Sync hooks

      ['the-top', 'init'],
      ['the-top', 'didInitAttrs',       { attrs: topAttrs }],
      ['the-top', 'didReceiveAttrs',    { newAttrs: topAttrs }],
      ['the-top', 'willRender'],

      ['the-middle', 'init'],
      ['the-middle', 'didInitAttrs',    { attrs: middleAttrs }],
      ['the-middle', 'didReceiveAttrs', { newAttrs: middleAttrs }],
      ['the-middle', 'willRender'],

      ['the-bottom', 'init'],
      ['the-bottom', 'didInitAttrs',    { attrs: bottomAttrs }],
      ['the-bottom', 'didReceiveAttrs', { newAttrs: bottomAttrs }],
      ['the-bottom', 'willRender'],

      // Async hooks

      ['the-bottom', 'didInsertElement'],
      ['the-bottom', 'didRender'],

      ['the-middle', 'didInsertElement'],
      ['the-middle', 'didRender'],

      ['the-top', 'didInsertElement'],
      ['the-top', 'didRender']

    );

    this.runTask(() => this.components['the-bottom'].rerender());

    this.assertText('Twitter: @tomdale|Name: Tom Dale|Website: tomdale.net');

    this.assertHooks(

      'after no-op rerender (bottom)',

      // Sync hooks

      ['the-bottom', 'willUpdate'],
      ['the-bottom', 'willRender'],

      // Async hooks

      ['the-bottom', 'didUpdate'],
      ['the-bottom', 'didRender']

    );

    this.runTask(() => this.components['the-middle'].rerender());

    this.assertText('Twitter: @tomdale|Name: Tom Dale|Website: tomdale.net');

    bottomAttrs = { oldAttrs: { website: 'tomdale.net' }, newAttrs: { website: 'tomdale.net' } };

    // The original implementation of the hooks in HTMLBars does a
    // deeper walk than necessary (using the AlwaysDirty validator),
    // resulting in executing the experimental "new hooks" too often.
    //
    // In particular, hooks were executed downstream from the original
    // call to `rerender()` even if the rerendering component did not
    // use `this.set()` to update the arguments of downstream components.
    //
    // Because Glimmer uses a pull-based model instead of a blunt
    // push-based model, we can avoid a deeper traversal than is
    // necessary.

    if (this.isHTMLBars) {
      this.assertHooks(

        'after no-op rerender (middle)',

        // Sync hooks

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
        ['the-middle', 'didRender']

      );
    } else {
      this.assertHooks(

        'after no-op rerender (middle)',

        // Sync hooks

        ['the-middle', 'willUpdate'],
        ['the-middle', 'willRender'],

        // Async hooks

        ['the-middle', 'didUpdate'],
        ['the-middle', 'didRender']

      );
    }

    this.runTask(() => this.components['the-top'].rerender());

    this.assertText('Twitter: @tomdale|Name: Tom Dale|Website: tomdale.net');

    middleAttrs = { oldAttrs: { name: 'Tom Dale' }, newAttrs: { name: 'Tom Dale' } };


    if (this.isHTMLBars) {
      this.assertHooks(

        'after no-op rerender (top)',

        // Sync hooks

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

      );
    } else {
      this.assertHooks(

        'after no-op rerender (top)',

        // Sync hooks

        ['the-top', 'willUpdate'],
        ['the-top', 'willRender'],

        // Async hooks

        ['the-top', 'didUpdate'],
        ['the-top', 'didRender']

      );
    }

    this.runTask(() => set(this.context, 'twitter', '@horsetomdale'));

    this.assertText('Twitter: @horsetomdale|Name: Tom Dale|Website: tomdale.net');

    // Because the `twitter` attr is only used by the topmost component,
    // and not passed down, we do not expect to see lifecycle hooks
    // called for child components. If the `didReceiveAttrs` hook used
    // the new attribute to rerender itself imperatively, that would result
    // in lifecycle hooks being invoked for the child.

    topAttrs = { oldAttrs: { twitter: '@tomdale' }, newAttrs: { twitter: '@horsetomdale' } };

    this.assertHooks(

      'after update',

      // Sync hooks

      ['the-top', 'didUpdateAttrs', topAttrs],
      ['the-top', 'didReceiveAttrs', topAttrs],

      ['the-top', 'willUpdate'],
      ['the-top', 'willRender'],

      // Async hooks

      ['the-top', 'didUpdate'],
      ['the-top', 'didRender']

    );
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

    let topAttrs = { twitter: '@tomdale' };
    let middleAttrs = { twitterTop: '@tomdale' };
    let bottomAttrs = { twitterMiddle: '@tomdale' };

    this.assertHooks(

      'after initial render',

      // Sync hooks

      ['the-top', 'init'],
      ['the-top', 'didInitAttrs',       { attrs: topAttrs }],
      ['the-top', 'didReceiveAttrs',    { newAttrs: topAttrs }],
      ['the-top', 'willRender'],

      ['the-middle', 'init'],
      ['the-middle', 'didInitAttrs',    { attrs: middleAttrs }],
      ['the-middle', 'didReceiveAttrs', { newAttrs: middleAttrs }],
      ['the-middle', 'willRender'],

      ['the-bottom', 'init'],
      ['the-bottom', 'didInitAttrs',    { attrs: bottomAttrs }],
      ['the-bottom', 'didReceiveAttrs', { newAttrs: bottomAttrs }],
      ['the-bottom', 'willRender'],

      // Async hooks

      ['the-bottom', 'didInsertElement'],
      ['the-bottom', 'didRender'],

      ['the-middle', 'didInsertElement'],
      ['the-middle', 'didRender'],

      ['the-top', 'didInsertElement'],
      ['the-top', 'didRender']

    );

    this.runTask(() => set(this.context, 'twitter', '@horsetomdale'));

    this.assertText('Top: Middle: Bottom: @horsetomdale');

    // Because the `twitter` attr is used by the all of the components,
    // the lifecycle hooks are invoked for all components.

    topAttrs = { oldAttrs: { twitter: '@tomdale' }, newAttrs: { twitter: '@horsetomdale' } };
    middleAttrs = { oldAttrs: { twitterTop: '@tomdale' }, newAttrs: { twitterTop: '@horsetomdale' } };
    bottomAttrs = { oldAttrs: { twitterMiddle: '@tomdale' }, newAttrs: { twitterMiddle: '@horsetomdale' } };

    this.assertHooks(

      'after updating (root)',

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

    );

    this.runTask(() => this.rerender());

    this.assertText('Top: Middle: Bottom: @horsetomdale');

    // In this case, because the attrs are passed down, all child components are invoked.

    topAttrs = { oldAttrs: { twitter: '@horsetomdale' }, newAttrs: { twitter: '@horsetomdale' } };
    middleAttrs = { oldAttrs: { twitterTop: '@horsetomdale' }, newAttrs: { twitterTop: '@horsetomdale' } };
    bottomAttrs = { oldAttrs: { twitterMiddle: '@horsetomdale' }, newAttrs: { twitterMiddle: '@horsetomdale' } };

    if (this.isHTMLBars) {
      this.assertHooks(

        'after no-op rernder (root)',

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

      );
    } else {
      this.assertHooks('after no-op rernder (root)');
    }
  }

}

moduleFor('Components test: lifecycle hooks (curly components)', class extends LifeCycleHooksTest {

  get ComponentClass() {
    return Component;
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
