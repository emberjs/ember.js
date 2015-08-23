import Registry from 'container/registry';
import jQuery from 'ember-views/system/jquery';
import compile from 'ember-template-compiler/system/compile';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-views/components/component';
import GlimmerComponent from 'ember-htmlbars/glimmer-component';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';
import isEnabled from 'ember-metal/features';

var registry, container, view;
var hooks;

let styles = [{
  name: 'curly',
  class: Component
}];

if (isEnabled('ember-htmlbars-component-generation')) {
  styles.push({
    name: 'angle',
    class: GlimmerComponent
  });
}

styles.forEach(style => {
  function invoke(name, hash) {
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

  QUnit.module(`component - lifecycle hooks (${style.name})`, {
    setup() {
      registry = new Registry();
      container = registry.container();
      registry.optionsForType('component', { singleton: false });
      registry.optionsForType('view', { singleton: false });
      registry.optionsForType('template', { instantiate: false });
      registry.register('component-lookup:main', ComponentLookup);

      hooks = [];
    },

    teardown() {
      runDestroy(container);
      runDestroy(view);
      registry = container = view = null;
    }
  });

  function pushHook(view, type, arg) {
    hooks.push(hook(view, type, arg));
  }

  function hook(view, type, arg) {
    return { type: type, view: view, arg: arg };
  }

  QUnit.test('lifecycle hooks are invoked in a predictable order', function() {
    var components = {};

    function component(label) {
      return style.class.extend({
        init() {
          this.label = label;
          components[label] = this;
          this._super.apply(this, arguments);
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

    registry.register('component:the-top', component('top'));
    registry.register('component:the-middle', component('middle'));
    registry.register('component:the-bottom', component('bottom'));

    registry.register('template:components/the-top', compile(`<div>Twitter: {{attrs.twitter}} ${invoke('the-middle', { name: string('Tom Dale') })}</div>`));
    registry.register('template:components/the-middle', compile(`<div>Name: {{attrs.name}} ${invoke('the-bottom', { website: string('tomdale.net') })}</div>`));
    registry.register('template:components/the-bottom', compile('<div>Website: {{attrs.website}}</div>'));

    view = EmberView.extend({
      template: compile(invoke('the-top', { twitter: 'view.twitter' })),
      twitter: '@tomdale',
      container: container
    }).create();

    runAppend(view);

    ok(component, 'The component was inserted');
    equal(jQuery('#qunit-fixture').text(), 'Twitter: @tomdale Name: Tom Dale Website: tomdale.net');

    let topAttrs = { twitter: '@tomdale' };
    let middleAttrs = { name: 'Tom Dale' };
    let bottomAttrs = { website: 'tomdale.net' };

    deepEqual(hooks, [
      hook('top', 'didInitAttrs', { attrs: topAttrs }), hook('top', 'didReceiveAttrs', { newAttrs: topAttrs }), hook('top', 'willRender'),
      hook('middle', 'didInitAttrs', { attrs: middleAttrs }), hook('middle', 'didReceiveAttrs', { newAttrs: middleAttrs }), hook('middle', 'willRender'),
      hook('bottom', 'didInitAttrs', { attrs: bottomAttrs }), hook('bottom', 'didReceiveAttrs', { newAttrs: bottomAttrs }), hook('bottom', 'willRender'),
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

  QUnit.test('passing values through attrs causes lifecycle hooks to fire if the attribute values have changed', function() {
    var components = {};

    function component(label) {
      return style.class.extend({
        init() {
          this.label = label;
          components[label] = this;
          this._super.apply(this, arguments);
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

    registry.register('component:the-top', component('top'));
    registry.register('component:the-middle', component('middle'));
    registry.register('component:the-bottom', component('bottom'));

    registry.register('template:components/the-top', compile(`<div>Top: ${invoke('the-middle', { twitterTop: 'attrs.twitter' })}</div>`));
    registry.register('template:components/the-middle', compile(`<div>Middle: ${invoke('the-bottom', { twitterMiddle: 'attrs.twitterTop' })}</div>`));
    registry.register('template:components/the-bottom', compile('<div>Bottom: {{attrs.twitterMiddle}}</div>'));

    view = EmberView.extend({
      template: compile(invoke('the-top', { twitter: 'view.twitter' })),
      twitter: '@tomdale',
      container: container
    }).create();

    runAppend(view);

    ok(component, 'The component was inserted');
    equal(jQuery('#qunit-fixture').text(), 'Top: Middle: Bottom: @tomdale');

    let topAttrs = { twitter: '@tomdale' };
    let middleAttrs = { twitterTop: '@tomdale' };
    let bottomAttrs = { twitterMiddle: '@tomdale' };

    deepEqual(hooks, [
      hook('top', 'didInitAttrs', { attrs: topAttrs }), hook('top', 'didReceiveAttrs', { newAttrs: topAttrs }), hook('top', 'willRender'),
      hook('middle', 'didInitAttrs', { attrs: middleAttrs }), hook('middle', 'didReceiveAttrs', { newAttrs: middleAttrs }), hook('middle', 'willRender'),
      hook('bottom', 'didInitAttrs', { attrs: bottomAttrs }), hook('bottom', 'didReceiveAttrs', { newAttrs: bottomAttrs }), hook('bottom', 'willRender'),
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

  QUnit.test('changing a component\'s displayed properties inside didInsertElement() is deprecated', function(assert) {
    let component = style.class.extend({
      layout: compile('<div>{{handle}}</div>'),
      handle: '@wycats',
      container: container,

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
});

// TODO: Write a test that involves deep mutability: the component plucks something
// from inside the attrs hash out into state and passes it as attrs into a child
// component. The hooks should run correctly.
