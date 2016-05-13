import jQuery from 'ember-views/system/jquery';
import compile from 'ember-template-compiler/system/compile';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-htmlbars/component';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

var owner, view;
var hooks;

let styles = [{
  name: 'curly',
  class: Component
}];

import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

styles.forEach(style => {
  function invoke(name, hash = {}) {
    if (style.name === 'curly') {
      let attrs = Object.keys(hash).map(k => `${k}=${val(hash[k])}`).join(' ');
      return `{{${name} ${attrs}}}`;
    } else if (style.name === 'angle') {
      let attrs = Object.keys(hash).map(k => `${k}=${val(hash[k])}`).join(' ');
      return `<${name} ${attrs} />`;
    }
  }

  function val(value) {
    if (value.isString) {
      return JSON.stringify(value.value);
    }

    if (style.name === 'curly') {
      return `(readonly ${value})`;
    } else {
      return `{{${value}}}`;
    }
  }

  function string(val) {
    return { isString: true, value: val };
  }

  testModule(`component - lifecycle hooks (${style.name})`, {
    setup() {
      owner = buildOwner();
      owner.registerOptionsForType('component', { singleton: false });
      owner.registerOptionsForType('view', { singleton: false });
      owner.registerOptionsForType('template', { instantiate: false });
      owner.register('component-lookup:main', ComponentLookup);

      hooks = [];
    },

    teardown() {
      runDestroy(owner);
      runDestroy(view);
      owner = view = null;
    }
  });

  function pushHook(view, type, arg) {
    hooks.push(hook(view, type, arg));
  }

  function hook(view, type, arg) {
    return { type: type, view: view, arg: arg };
  }

  test('lifecycle hooks are invoked in a predictable order', function() {
    var components = {};

    function component(label) {
      return style.class.extend({
        init() {
          this.label = label;
          components[label] = this;
          this._super(...arguments);
          pushHook(label, 'init');
        },

        didInitAttrs(options) {
          pushHook(label, 'didInitAttrs', options);
        },

        didUpdateAttrs(options) {
          pushHook(label, 'didUpdateAttrs', options);
        },

        willUpdate(options) {
          pushHook(label, 'willUpdate', options);
        },

        didReceiveAttrs(options) {
          pushHook(label, 'didReceiveAttrs', options);
        },

        willRender() {
          pushHook(label, 'willRender');
        },

        didRender() {
          pushHook(label, 'didRender');
        },

        didInsertElement() {
          pushHook(label, 'didInsertElement');
        },

        didUpdate(options) {
          pushHook(label, 'didUpdate', options);
        }
      });
    }

    owner.register('component:the-top', component('top'));
    owner.register('component:the-middle', component('middle'));
    owner.register('component:the-bottom', component('bottom'));

    owner.register('template:components/the-top', compile(`<div>Twitter: {{attrs.twitter}} ${invoke('the-middle', { name: string('Tom Dale') })}</div>`));
    owner.register('template:components/the-middle', compile(`<div>Name: {{attrs.name}} ${invoke('the-bottom', { website: string('tomdale.net') })}</div>`));
    owner.register('template:components/the-bottom', compile('<div>Website: {{attrs.website}}</div>'));

    view = EmberView.extend({
      [OWNER]: owner,
      template: compile(invoke('the-top', { twitter: 'view.twitter' })),
      twitter: '@tomdale'
    }).create();

    expectDeprecation(() => {
      runAppend(view);
    }, /\[DEPRECATED\] didInitAttrs called in <\(subclass of Ember.Component\)\:ember[\d+]+>\./);

    ok(component, 'The component was inserted');
    equal(jQuery('#qunit-fixture').text(), 'Twitter: @tomdale Name: Tom Dale Website: tomdale.net');

    let topAttrs = { twitter: '@tomdale' };
    let middleAttrs = { name: 'Tom Dale' };
    let bottomAttrs = { website: 'tomdale.net' };

    deepEqual(hooks, [
      hook('top', 'init'), hook('top', 'didInitAttrs', { attrs: topAttrs }), hook('top', 'didReceiveAttrs', { newAttrs: topAttrs }), hook('top', 'willRender'),
      hook('middle', 'init'), hook('middle', 'didInitAttrs', { attrs: middleAttrs }), hook('middle', 'didReceiveAttrs', { newAttrs: middleAttrs }), hook('middle', 'willRender'),
      hook('bottom', 'init'), hook('bottom', 'didInitAttrs', { attrs: bottomAttrs }), hook('bottom', 'didReceiveAttrs', { newAttrs: bottomAttrs }), hook('bottom', 'willRender'),
      hook('bottom', 'didInsertElement'), hook('bottom', 'didRender'),
      hook('middle', 'didInsertElement'), hook('middle', 'didRender'),
      hook('top', 'didInsertElement'), hook('top', 'didRender')
    ]);

    hooks = [];

    run(function() {
      components.bottom.rerender();
    });

    deepEqual(hooks, [
      hook('bottom', 'willUpdate'), hook('bottom', 'willRender'),
      hook('bottom', 'didUpdate'), hook('bottom', 'didRender')
    ]);

    hooks = [];

    run(function() {
      components.middle.rerender();
    });

    bottomAttrs = { oldAttrs: { website: 'tomdale.net' }, newAttrs: { website: 'tomdale.net' } };

    deepEqual(hooks, [
      hook('middle', 'willUpdate'), hook('middle', 'willRender'),

      hook('bottom', 'didUpdateAttrs', bottomAttrs),
      hook('bottom', 'didReceiveAttrs', bottomAttrs),

      hook('bottom', 'willUpdate'), hook('bottom', 'willRender'),

      hook('bottom', 'didUpdate'), hook('bottom', 'didRender'),
      hook('middle', 'didUpdate'), hook('middle', 'didRender')
    ]);

    hooks = [];

    run(function() {
      components.top.rerender();
    });

    middleAttrs = { oldAttrs: { name: 'Tom Dale' }, newAttrs: { name: 'Tom Dale' } };

    deepEqual(hooks, [
      hook('top', 'willUpdate'), hook('top', 'willRender'),

      hook('middle', 'didUpdateAttrs', middleAttrs), hook('middle', 'didReceiveAttrs', middleAttrs),
      hook('middle', 'willUpdate'), hook('middle', 'willRender'),

      hook('bottom', 'didUpdateAttrs', bottomAttrs), hook('bottom', 'didReceiveAttrs', bottomAttrs),
      hook('bottom', 'willUpdate'), hook('bottom', 'willRender'),
      hook('bottom', 'didUpdate'), hook('bottom', 'didRender'),

      hook('middle', 'didUpdate'), hook('middle', 'didRender'),
      hook('top', 'didUpdate'), hook('top', 'didRender')
    ]);

    hooks = [];

    run(function() {
      view.set('twitter', '@hipstertomdale');
    });

    // Because the `twitter` attr is only used by the topmost component,
    // and not passed down, we do not expect to see lifecycle hooks
    // called for child components. If the `didReceiveAttrs` hook used
    // the new attribute to rerender itself imperatively, that would result
    // in lifecycle hooks being invoked for the child.

    deepEqual(hooks, [
      hook('top', 'didUpdateAttrs', { oldAttrs: { twitter: '@tomdale' }, newAttrs: { twitter: '@hipstertomdale' } }),
      hook('top', 'didReceiveAttrs', { oldAttrs: { twitter: '@tomdale' }, newAttrs: { twitter: '@hipstertomdale' } }),
      hook('top', 'willUpdate'),
      hook('top', 'willRender'),
      hook('top', 'didUpdate'), hook('top', 'didRender')
    ]);
  });

  test('passing values through attrs causes lifecycle hooks to fire if the attribute values have changed', function() {
    var components = {};

    function component(label) {
      return style.class.extend({
        init() {
          this.label = label;
          components[label] = this;
          this._super(...arguments);
          pushHook(label, 'init');
        },

        didInitAttrs(options) {
          pushHook(label, 'didInitAttrs', options);
        },

        didUpdateAttrs(options) {
          pushHook(label, 'didUpdateAttrs', options);
        },

        willUpdate(options) {
          pushHook(label, 'willUpdate', options);
        },

        didReceiveAttrs(options) {
          pushHook(label, 'didReceiveAttrs', options);
        },

        willRender() {
          pushHook(label, 'willRender');
        },

        didRender() {
          pushHook(label, 'didRender');
        },

        didInsertElement() {
          pushHook(label, 'didInsertElement');
        },

        didUpdate(options) {
          pushHook(label, 'didUpdate', options);
        }
      });
    }

    owner.register('component:the-top', component('top'));
    owner.register('component:the-middle', component('middle'));
    owner.register('component:the-bottom', component('bottom'));

    owner.register('template:components/the-top', compile(`<div>Top: ${invoke('the-middle', { twitterTop: 'attrs.twitter' })}</div>`));
    owner.register('template:components/the-middle', compile(`<div>Middle: ${invoke('the-bottom', { twitterMiddle: 'attrs.twitterTop' })}</div>`));
    owner.register('template:components/the-bottom', compile('<div>Bottom: {{attrs.twitterMiddle}}</div>'));

    view = EmberView.extend({
      [OWNER]: owner,
      template: compile(invoke('the-top', { twitter: 'view.twitter' })),
      twitter: '@tomdale'
    }).create();

    expectDeprecation(() => {
      runAppend(view);
    }, /\[DEPRECATED\] didInitAttrs called in <\(subclass of Ember.Component\)\:ember[\d+]+>\./);

    ok(component, 'The component was inserted');
    equal(jQuery('#qunit-fixture').text(), 'Top: Middle: Bottom: @tomdale');

    let topAttrs = { twitter: '@tomdale' };
    let middleAttrs = { twitterTop: '@tomdale' };
    let bottomAttrs = { twitterMiddle: '@tomdale' };

    deepEqual(hooks, [
      hook('top', 'init'), hook('top', 'didInitAttrs', { attrs: topAttrs }), hook('top', 'didReceiveAttrs', { newAttrs: topAttrs }), hook('top', 'willRender'),
      hook('middle', 'init'), hook('middle', 'didInitAttrs', { attrs: middleAttrs }), hook('middle', 'didReceiveAttrs', { newAttrs: middleAttrs }), hook('middle', 'willRender'),
      hook('bottom', 'init'), hook('bottom', 'didInitAttrs', { attrs: bottomAttrs }), hook('bottom', 'didReceiveAttrs', { newAttrs: bottomAttrs }), hook('bottom', 'willRender'),
      hook('bottom', 'didInsertElement'), hook('bottom', 'didRender'),
      hook('middle', 'didInsertElement'), hook('middle', 'didRender'),
      hook('top', 'didInsertElement'), hook('top', 'didRender')
    ]);

    hooks = [];

    run(function() {
      view.set('twitter', '@hipstertomdale');
    });

    // Because the `twitter` attr is used by the all of the components,
    // the lifecycle hooks are invoked for all components.

    topAttrs = { oldAttrs: { twitter: '@tomdale' }, newAttrs: { twitter: '@hipstertomdale' } };
    middleAttrs = { oldAttrs: { twitterTop: '@tomdale' }, newAttrs: { twitterTop: '@hipstertomdale' } };
    bottomAttrs = { oldAttrs: { twitterMiddle: '@tomdale' }, newAttrs: { twitterMiddle: '@hipstertomdale' } };

    deepEqual(hooks, [
      hook('top', 'didUpdateAttrs', topAttrs), hook('top', 'didReceiveAttrs', topAttrs),
      hook('top', 'willUpdate'), hook('top', 'willRender'),

      hook('middle', 'didUpdateAttrs', middleAttrs), hook('middle', 'didReceiveAttrs', middleAttrs),
      hook('middle', 'willUpdate'), hook('middle', 'willRender'),

      hook('bottom', 'didUpdateAttrs', bottomAttrs), hook('bottom', 'didReceiveAttrs', bottomAttrs),
      hook('bottom', 'willUpdate'), hook('bottom', 'willRender'),
      hook('bottom', 'didUpdate'), hook('bottom', 'didRender'),

      hook('middle', 'didUpdate'), hook('middle', 'didRender'),
      hook('top', 'didUpdate'), hook('top', 'didRender')
    ]);

    hooks = [];

    // In this case, because the attrs are passed down, all child components are invoked.

    run(function() {
      view.rerender();
    });

    topAttrs = { oldAttrs: { twitter: '@hipstertomdale' }, newAttrs: { twitter: '@hipstertomdale' } };
    middleAttrs = { oldAttrs: { twitterTop: '@hipstertomdale' }, newAttrs: { twitterTop: '@hipstertomdale' } };
    bottomAttrs = { oldAttrs: { twitterMiddle: '@hipstertomdale' }, newAttrs: { twitterMiddle: '@hipstertomdale' } };

    deepEqual(hooks, [
      hook('top', 'didUpdateAttrs', topAttrs), hook('top', 'didReceiveAttrs', topAttrs),
      hook('top', 'willUpdate'), hook('top', 'willRender'),

      hook('middle', 'didUpdateAttrs', middleAttrs), hook('middle', 'didReceiveAttrs', middleAttrs),
      hook('middle', 'willUpdate'), hook('middle', 'willRender'),

      hook('bottom', 'didUpdateAttrs', bottomAttrs), hook('bottom', 'didReceiveAttrs', bottomAttrs),
      hook('bottom', 'willUpdate'), hook('bottom', 'willRender'),
      hook('bottom', 'didUpdate'), hook('bottom', 'didRender'),

      hook('middle', 'didUpdate'), hook('middle', 'didRender'),
      hook('top', 'didUpdate'), hook('top', 'didRender')
    ]);
  });

  test('changing a component\'s displayed properties inside didInsertElement() is deprecated', function(assert) {
    let component;

    component = style.class.extend({
      [OWNER]: owner,
      layout: compile('<div>{{handle}}</div>'),
      handle: '@wycats',

      didInsertElement() {
        this.set('handle', '@tomdale');
      }
    }).create();

    expectDeprecation(() => {
      runAppend(component);
    }, /modified inside the didInsertElement hook/);

    assert.strictEqual(component.$().text(), '@tomdale');

    run(() => {
      component.destroy();
    });
  });

  test('DEPRECATED: didInitAttrs is deprecated', function(assert) {
    let component;

    let componentClass = style.class.extend({
      [OWNER]: owner,
      layout: compile('<div>{{handle}}</div>'),
      handle: '@wycats',

      didInitAttrs() {
        this._super(...arguments);
      }
    });

    expectDeprecation(() => {
      component = componentClass.create();
    }, /\[DEPRECATED\] didInitAttrs called in <\(subclass of Ember.Component\)\:ember[\d+]+>\./);

    run(() => {
      component.destroy();
    });
  });

  test('properties set during `init` are availabe in `didReceiveAttrs`', function(assert) {
    assert.expect(1);

    owner.register('component:the-thing', style.class.extend({
      init() {
        this._super(...arguments);
        this.propertySetInInit = 'init fired!';
      },

      didReceiveAttrs() {
        this._super(...arguments);

        assert.equal(this.propertySetInInit, 'init fired!', 'init has already finished before didReceiveAttrs');
      }
    }));

    view = EmberView.extend({
      [OWNER]: owner,
      template: compile(invoke('the-thing'))
    }).create();

    runAppend(view);
  });
});

// TODO: Write a test that involves deep mutability: the component plucks something
// from inside the attrs hash out into state and passes it as attrs into a child
// component. The hooks should run correctly.
