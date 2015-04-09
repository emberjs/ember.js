import Ember from "ember-metal/core"; // assert
import EmberError from "ember-metal/error";
import create from 'ember-metal/platform/create';
import { isStream, read } from "ember-metal/streams/utils";
import { camelize } from "ember-runtime/system/string";
import generateController from "ember-routing/system/generate_controller";
import { generateControllerFactory } from "ember-routing/system/generate_controller";
import ComponentNode from "ember-htmlbars/system/component-node";

export default {
  willRender(renderNode, env) {
    var topLevel = toplevelOutlet(env);
    if (topLevel) {
      // We make sure we will get dirtied when outlet state changes.
      topLevel._outlets.push(renderNode);
    }
  },

  setupState(prevState, env, scope, params, hash) {
    var name = params[0];

    Ember.assert(
      "The first argument of {{render}} must be quoted, e.g. {{render \"sidebar\"}}.",
      typeof name === 'string'
    );

    return {
      parentView: scope.view,
      componentNode: prevState.componentNode,
      controller: prevState.controller,
      childOutletState: childOutletState(name, env)
    };
  },

  childEnv(state) {
    return { outletState: state.childOutletState };
  },

  isStable(lastState, nextState) {
    return isStable(lastState.childOutletState, nextState.childOutletState);
  },

  isEmpty(state) {
    return false;
  },

  render(node, env, scope, params, hash, template, inverse, visitor) {
    var state = node.state;
    var currentView = state.parentView;

    var name = params[0];
    var context = params[1];

    var container = env.container;
    var router = container.lookup('router:main');

    Ember.assert(
      "The second argument of {{render}} must be a path, e.g. {{render \"post\" post}}.",
      params.length < 2 || isStream(params[1])
    );

    if (params.length === 1) {
      // use the singleton controller
      Ember.assert(
        "You can only use the {{render}} helper once without a model object as " +
        "its second argument, as in {{render \"post\" post}}.",
        !router || !router._lookupActiveView(name)
      );
    } else if (params.length !== 2) {
      throw new EmberError("You must pass a templateName to render");
    }

    // # legacy namespace
    name = name.replace(/\//g, '.');
    // \ legacy slash as namespace support

    var templateName = 'template:' + name;
    Ember.assert(
      "You used `{{render '" + name + "'}}`, but '" + name + "' can not be " +
      "found as either a template or a view.",
      container._registry.has("view:" + name) || container._registry.has(templateName) || !!template
    );

    var view = container.lookup('view:' + name);
    if (!view) {
      view = container.lookup('view:default');
      template = template || container.lookup(templateName);
    }

    // provide controller override
    var controllerName;
    var controllerFullName;

    if (hash.controller) {
      controllerName = hash.controller;
      controllerFullName = 'controller:' + controllerName;
      delete hash.controller;

      Ember.assert(
        "The controller name you supplied '" + controllerName + "' " +
        "did not resolve to a controller.",
        container._registry.has(controllerFullName)
      );
    } else {
      controllerName = name;
      controllerFullName = 'controller:' + controllerName;
    }

    var parentController = read(scope.locals.controller);
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

    view.set('controller', controller);
    state.controller = controller;

    hash.viewName = camelize(name);

    if (router && params.length === 1) {
      router._connectActiveView(name, view);
    }


    // var state = node.state;
    // var parentView = scope.view;
    if (template && template.raw) {
      template = template.raw;
    }

    var options = {
      component: view,
      layout: null,
      self: controller
    };

    var componentNode = ComponentNode.create(node, env, hash, options, currentView, null, null, template);
    state.componentNode = componentNode;
    view._outlets = Ember.A();
    componentNode.render(env, hash, visitor);
  },

  rerender(node, env, scope, params, hash, template, inverse, visitor) {
    var model = read(params[1]);
    node.state.controller.set('model', model);
  }
};

function toplevelOutlet(env) {
  var pointer = env.view.ownerView;
  var po;
  while (pointer && (po = pointer.ownerView) && po !== pointer) {
    pointer = po;
  }
  if (pointer && pointer._outlets) {
    return pointer;
  }
}


function childOutletState(name, env) {
  var topLevel = toplevelOutlet(env);
  if (!topLevel) { return; }

  var outletState = topLevel.outletState;
  if (!outletState.main) { return; }

  var selectedOutletState = outletState.main.outlets['__ember_orphans__'];
  if (!selectedOutletState) { return; }
  var matched = selectedOutletState.outlets[name];
  if (matched) {
    var childState = create(null);
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
