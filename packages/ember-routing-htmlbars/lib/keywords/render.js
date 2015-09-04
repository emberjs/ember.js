/**
@module ember
@submodule ember-templates
*/

import { assert } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';
import EmptyObject from 'ember-metal/empty_object';
import EmberError from 'ember-metal/error';
import { isStream, read } from 'ember-metal/streams/utils';
import { camelize } from 'ember-runtime/system/string';
import generateController from 'ember-routing/system/generate_controller';
import { generateControllerFactory } from 'ember-routing/system/generate_controller';
import ViewNodeManager from 'ember-htmlbars/node-managers/view-node-manager';

/**
  Calling ``{{render}}`` from within a template will insert another
  template that matches the provided name. The inserted template will
  access its properties on its own controller (rather than the controller
  of the parent template).
  If a view class with the same name exists, the view class also will be used.
  Note: A given controller may only be used *once* in your app in this manner.
  A singleton instance of the controller will be created for you.
  Example:

  ```javascript
  App.NavigationController = Ember.Controller.extend({
    who: "world"
  });
  ```

  ```handlebars
  <!-- navigation.hbs -->
  Hello, {{who}}.
  ```

  ```handlebars
  <!-- application.hbs -->
  <h1>My great app</h1>
  {{render "navigation"}}
  ```

  ```html
  <h1>My great app</h1>
  <div class='ember-view'>
    Hello, world.
  </div>
  ```

  Optionally you may provide a second argument: a property path
  that will be bound to the `model` property of the controller.
  If a `model` property path is specified, then a new instance of the
  controller will be created and `{{render}}` can be used multiple times
  with the same name.

  For example if you had this `author` template.

  ```handlebars
  <div class="author">
    Written by {{firstName}} {{lastName}}.
    Total Posts: {{postCount}}
  </div>
  ```

  You could render it inside the `post` template using the `render` helper.

  ```handlebars
  <div class="post">
    <h1>{{title}}</h1>
    <div>{{body}}</div>
    {{render "author" author}}
  </div>
  ```

  @method render
  @for Ember.Templates.helpers
  @param {String} name
  @param {Object?} context
  @param {Hash} options
  @return {String} HTML string
  @public
*/
export default {
  willRender(renderNode, env) {
    if (env.view.ownerView._outlets) {
      // We make sure we will get dirtied when outlet state changes.
      env.view.ownerView._outlets.push(renderNode);
    }
  },

  setupState(prevState, env, scope, params, hash) {
    var name = params[0];

    assert(
      'The first argument of {{render}} must be quoted, e.g. {{render "sidebar"}}.',
      typeof name === 'string'
    );

    return {
      parentView: env.view,
      manager: prevState.manager,
      controller: prevState.controller,
      childOutletState: childOutletState(name, env)
    };
  },

  childEnv(state, env) {
    return env.childWithOutletState(state.childOutletState);
  },

  isStable(lastState, nextState) {
    return isStable(lastState.childOutletState, nextState.childOutletState);
  },

  isEmpty(state) {
    return false;
  },

  render(node, env, scope, params, hash, template, inverse, visitor) {
    var state = node.getState();
    var name = params[0];
    var context = params[1];

    var container = env.container;

    // The render keyword presumes it can work without a router. This is really
    // only to satisfy the test:
    //
    //     {{view}} should not override class bindings defined on a child view"
    //
    var router = container.lookup('router:main');

    assert(
      'The second argument of {{render}} must be a path, e.g. {{render "post" post}}.',
      params.length < 2 || isStream(params[1])
    );

    if (params.length === 1) {
      // use the singleton controller
      assert(
        'You can only use the {{render}} helper once without a model object as ' +
        'its second argument, as in {{render "post" post}}.',
        !router || !router._lookupActiveComponentNode(name)
      );
    } else if (params.length !== 2) {
      throw new EmberError('You must pass a templateName to render');
    }

    var templateName = 'template:' + name;
    assert(
      'You used `{{render \'' + name + '\'}}`, but \'' + name + '\' can not be ' +
      'found as either a template or a view.',
      container.registry.has('view:' + name) || container.registry.has(templateName) || !!template
    );

    var view = container.lookup('view:' + name);
    if (!view) {
      view = container.lookup('view:default');
    }
    var viewHasTemplateSpecified = view && !!get(view, 'template');
    if (!template && !viewHasTemplateSpecified) {
      template = container.lookup(templateName);
    }

    if (view) {
      view.ownerView = env.view.ownerView;
    }

    // provide controller override
    var controllerName;
    var controllerFullName;

    if (hash.controller) {
      controllerName = hash.controller;
      controllerFullName = 'controller:' + controllerName;
      delete hash.controller;

      assert(
        'The controller name you supplied \'' + controllerName + '\' ' +
        'did not resolve to a controller.',
        container.registry.has(controllerFullName)
      );
    } else {
      controllerName = name;
      controllerFullName = 'controller:' + controllerName;
    }

    var parentController = read(scope.getLocal('controller'));
    var controller;

    // choose name
    if (params.length > 1) {
      var factory = container.lookupFactory(controllerFullName) ||
                    generateControllerFactory(container, controllerName);

      controller = factory.create({
        model: read(context),
        parentController: parentController,
        target: parentController
      });

      node.addDestruction(controller);
    } else {
      controller = container.lookup(controllerFullName) ||
                   generateController(container, controllerName);

      controller.setProperties({
        target: parentController,
        parentController: parentController
      });
    }

    if (view) {
      view.set('controller', controller);
    }
    state.controller = controller;

    hash.viewName = camelize(name);

    if (template && template.raw) {
      template = template.raw;
    }

    var options = {
      layout: null,
      self: controller
    };

    if (view) {
      options.component = view;
    }

    var nodeManager = ViewNodeManager.create(node, env, hash, options, state.parentView, null, null, template);
    state.manager = nodeManager;

    if (router && params.length === 1) {
      router._connectActiveComponentNode(name, nodeManager);
    }

    nodeManager.render(env, hash, visitor);
  },

  rerender(node, env, scope, params, hash, template, inverse, visitor) {
    var model = read(params[1]);
    node.getState().controller.set('model', model);
  }
};

function childOutletState(name, env) {
  var topLevel = env.view.ownerView;
  if (!topLevel || !topLevel.outletState) { return; }

  var outletState = topLevel.outletState;
  if (!outletState.main) { return; }

  var selectedOutletState = outletState.main.outlets['__ember_orphans__'];
  if (!selectedOutletState) { return; }
  var matched = selectedOutletState.outlets[name];
  if (matched) {
    var childState = new EmptyObject();
    childState[matched.render.outlet] = matched;
    matched.wasUsed = true;
    return childState;
  }
}

function isStable(a, b) {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  for (var outletName in a) {
    if (!isStableOutlet(a[outletName], b[outletName])) {
      return false;
    }
  }
  return true;
}

function isStableOutlet(a, b) {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  a = a.render;
  b = b.render;
  for (var key in a) {
    if (a.hasOwnProperty(key)) {
      // name is only here for logging & debugging. If two different
      // names result in otherwise identical states, they're still
      // identical.
      if (a[key] !== b[key] && key !== 'name') {
        return false;
      }
    }
  }
  return true;
}
