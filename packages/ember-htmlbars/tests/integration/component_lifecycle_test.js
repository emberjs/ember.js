import EmberView from "ember-views/views/view";
import Registry from "container/registry";
import jQuery from "ember-views/system/jquery";
import compile from "ember-template-compiler/system/compile";
import ComponentLookup from 'ember-views/component_lookup';
import Component from "ember-views/views/component";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import run from "ember-metal/run_loop";

var registry, container, view;
var hooks;

QUnit.module('component - lifecycle hooks', {
  setup: function() {
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('component', { singleton: false });
    registry.optionsForType('view', { singleton: false });
    registry.optionsForType('template', { instantiate: false });
    registry.optionsForType('helper', { instantiate: false });
    registry.register('component-lookup:main', ComponentLookup);

    hooks = [];
  },

  teardown: function() {
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
    return Component.extend({
      init: function() {
        this.label = label;
        pushHook(label, 'init');
        components[label] = this;
        this._super.apply(this, arguments);
      },
      willReceiveAttrs: function(nextAttrs) {
        pushHook(label, 'willReceiveAttrs', nextAttrs);
      },
      willUpdate: function() {
        pushHook(label, 'willUpdate');
      },
      didUpdate: function() {
        pushHook(label, 'didUpdate');
      },
      didInsertElement: function() {
        pushHook(label, 'didInsertElement');
      },
      willRender: function() {
        pushHook(label, 'willRender');
      },
      didRender: function() {
        pushHook(label, 'didRender');
      }
    });
  }

  registry.register('component:the-top', component('top'));
  registry.register('component:the-middle', component('middle'));
  registry.register('component:the-bottom', component('bottom'));

  registry.register('template:components/the-top', compile('Twitter: {{attrs.twitter}} {{the-middle name="Tom Dale"}}'));
  registry.register('template:components/the-middle', compile('Name: {{attrs.name}} {{the-bottom website="tomdale.net"}}'));
  registry.register('template:components/the-bottom', compile('Website: {{attrs.website}}'));

  view = EmberView.extend({
    template: compile('{{the-top twitter=view.twitter}}'),
    twitter: "@tomdale",
    container: container
  }).create();

  runAppend(view);

  ok(component, "The component was inserted");
  equal(jQuery('#qunit-fixture').text(), 'Twitter: @tomdale Name: Tom Dale Website: tomdale.net');

  deepEqual(hooks, [
    hook('top', 'init'), hook('top', 'willRender'),
    hook('middle', 'init'), hook('middle', 'willRender'),
    hook('bottom', 'init'), hook('bottom', 'willRender'),
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

  deepEqual(hooks, [
    hook('middle', 'willUpdate'), hook('middle', 'willRender'),
    hook('bottom', 'willUpdate'), hook('bottom', 'willRender'),

    hook('bottom', 'willReceiveAttrs', { website: "tomdale.net" }),

    hook('bottom', 'didUpdate'), hook('bottom', 'didRender'),
    hook('middle', 'didUpdate'), hook('middle', 'didRender')
  ]);

  hooks = [];

  run(function() {
    components.top.rerender();
  });

  deepEqual(hooks, [
    hook('top', 'willUpdate'), hook('top', 'willRender'),

    hook('middle', 'willUpdate'), hook('middle', 'willRender'),
    hook('middle', 'willReceiveAttrs', { name: "Tom Dale" }),

    hook('bottom', 'willUpdate'), hook('bottom', 'willRender'),
    hook('bottom', 'willReceiveAttrs', { website: "tomdale.net" }),

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
  // called for child components. If the `willReceiveAttrs` hook used
  // the new attribute to rerender itself imperatively, that would result
  // in lifecycle hooks being invoked for the child.

  deepEqual(hooks, [
    hook('top', 'willUpdate'), hook('top', 'willRender'),
    hook('top', 'willReceiveAttrs', { twitter: "@hipstertomdale" }),
    hook('top', 'didUpdate'), hook('top', 'didRender')
  ]);
});

QUnit.test('passing values through attrs causes lifecycle hooks to fire if the attribute values have changed', function() {
  var components = {};

  function component(label) {
    return Component.extend({
      init: function() {
        this.label = label;
        pushHook(label, 'init');
        components[label] = this;
        this._super.apply(this, arguments);
      },
      willReceiveAttrs: function(nextAttrs) {
        pushHook(label, 'willReceiveAttrs', nextAttrs);
      },
      willUpdate: function() {
        pushHook(label, 'willUpdate');
      },
      didUpdate: function() {
        pushHook(label, 'didUpdate');
      },
      didInsertElement: function() {
        pushHook(label, 'didInsertElement');
      },
      willRender: function() {
        pushHook(label, 'willRender');
      },
      didRender: function() {
        pushHook(label, 'didRender');
      }
    });
  }

  registry.register('component:the-top', component('top'));
  registry.register('component:the-middle', component('middle'));
  registry.register('component:the-bottom', component('bottom'));

  registry.register('template:components/the-top', compile('Top: {{the-middle twitterTop=attrs.twitter}}'));
  registry.register('template:components/the-middle', compile('Middle: {{the-bottom twitterMiddle=attrs.twitterTop}}'));
  registry.register('template:components/the-bottom', compile('Bottom: {{attrs.twitterMiddle}}'));

  view = EmberView.extend({
    template: compile('{{the-top twitter=view.twitter}}'),
    twitter: "@tomdale",
    container: container
  }).create();

  runAppend(view);

  ok(component, "The component was inserted");
  equal(jQuery('#qunit-fixture').text(), 'Top: Middle: Bottom: @tomdale');

  deepEqual(hooks, [
    hook('top', 'init'), hook('top', 'willRender'),
    hook('middle', 'init'), hook('middle', 'willRender'),
    hook('bottom', 'init'), hook('bottom', 'willRender'),
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

  deepEqual(hooks, [
    hook('top', 'willUpdate'), hook('top', 'willRender'),
    hook('top', 'willReceiveAttrs', { twitter: "@hipstertomdale" }),

    hook('middle', 'willUpdate'), hook('middle', 'willRender'),
    hook('middle', 'willReceiveAttrs', { twitterTop: "@hipstertomdale" }),

    hook('bottom', 'willUpdate'), hook('bottom', 'willRender'),
    hook('bottom', 'willReceiveAttrs', { twitterMiddle: "@hipstertomdale" }),

    hook('bottom', 'didUpdate'), hook('bottom', 'didRender'),
    hook('middle', 'didUpdate'), hook('middle', 'didRender'),
    hook('top', 'didUpdate'), hook('top', 'didRender')
  ]);
});

QUnit.test('manually re-rendering in `willReceiveAttrs` triggers lifecycle hooks on the child even if the nodes were not dirty', function() {
  var components = {};

  function component(label) {
    return Component.extend({
      init: function() {
        this.label = label;
        pushHook(label, 'init');
        components[label] = this;
        this._super.apply(this, arguments);
      },
      willReceiveAttrs: function(nextAttrs) {
        this.rerender();
        pushHook(label, 'willReceiveAttrs', nextAttrs);
      },
      willUpdate: function() {
        pushHook(label, 'willUpdate');
      },
      didUpdate: function() {
        pushHook(label, 'didUpdate');
      },
      didInsertElement: function() {
        pushHook(label, 'didInsertElement');
      },
      willRender: function() {
        pushHook(label, 'willRender');
      },
      didRender: function() {
        pushHook(label, 'didRender');
      }
    });
  }

  registry.register('component:the-top', component('top'));
  registry.register('component:the-middle', component('middle'));
  registry.register('component:the-bottom', component('bottom'));

  registry.register('template:components/the-top', compile('Twitter: {{attrs.twitter}} {{the-middle name="Tom Dale"}}'));
  registry.register('template:components/the-middle', compile('Name: {{attrs.name}} {{the-bottom website="tomdale.net"}}'));
  registry.register('template:components/the-bottom', compile('Website: {{attrs.website}}'));

  view = EmberView.extend({
    template: compile('{{the-top twitter=view.twitter}}'),
    twitter: "@tomdale",
    container: container
  }).create();

  runAppend(view);

  ok(component, "The component was inserted");
  equal(jQuery('#qunit-fixture').text(), 'Twitter: @tomdale Name: Tom Dale Website: tomdale.net');

  deepEqual(hooks, [
    hook('top', 'init'), hook('top', 'willRender'),
    hook('middle', 'init'), hook('middle', 'willRender'),
    hook('bottom', 'init'), hook('bottom', 'willRender'),
    hook('bottom', 'didInsertElement'), hook('bottom', 'didRender'),
    hook('middle', 'didInsertElement'), hook('middle', 'didRender'),
    hook('top', 'didInsertElement'), hook('top', 'didRender')
  ]);

  hooks = [];

  run(function() {
    view.set('twitter', '@hipstertomdale');
  });

  // Because each `willReceiveAttrs` hook triggered a downstream
  // rerender, lifecycle hooks are invoked on all child components.

  deepEqual(hooks, [
    hook('top', 'willUpdate'), hook('top', 'willRender'),
    hook('top', 'willReceiveAttrs', { twitter: "@hipstertomdale" }),

    hook('middle', 'willUpdate'), hook('middle', 'willRender'),
    hook('middle', 'willReceiveAttrs', { name: "Tom Dale" }),

    hook('bottom', 'willUpdate'), hook('bottom', 'willRender'),
    hook('bottom', 'willReceiveAttrs', { website: "tomdale.net" }),

    hook('bottom', 'didUpdate'), hook('bottom', 'didRender'),
    hook('middle', 'didUpdate'), hook('middle', 'didRender'),
    hook('top', 'didUpdate'), hook('top', 'didRender')
  ]);
});
