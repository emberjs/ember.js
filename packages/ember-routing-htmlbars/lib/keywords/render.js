import Ember from "ember-metal/core"; // assert
import EmberError from "ember-metal/error";
import create from 'ember-metal/platform/create';
import { isStream, read } from "ember-metal/streams/utils";
import { camelize } from "ember-runtime/system/string";
import generateController from "ember-routing/system/generate_controller";
import { generateControllerFactory } from "ember-routing/system/generate_controller";
import ComponentNode from "ember-htmlbars/system/component-node";

export default {
  setupState(prevState, env, scope, params, hash) {
    return {
      parentView: scope.view,
      componentNode: prevState.componentNode,
      controller: prevState.controller
    };
  },

  isStable() {
    return true;
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
      "The first argument of {{render}} must be quoted, e.g. {{render \"sidebar\"}}.",
      typeof name === 'string'
    );

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
      // isOutlet: true
    };

    var componentNode = ComponentNode.create(node, env, hash, options, currentView, null, null, template);
    state.componentNode = componentNode;
    componentNode.render(env, hash, visitor);

    impersonateAnOutlet(currentView, view, name);
  },

  rerender(node, env, scope, params, hash, template, inverse, visitor) {
    var model = read(params[1]);
    node.state.controller.set('model', model);
  }
};

// Megahax to make outlets inside the render helper work, until we
// can kill that behavior at 2.0.
function impersonateAnOutlet(currentView, view, name) {
  view._childOutlets = Ember.A();
  view._isOutlet = true;
  view._outletName = '__ember_orphans__';
  view._matchOutletName = name;
  view.setOutletState = function(state) {
    var ownState;
    if (state && (ownState = state.outlets[this._matchOutletName])) {
      this._outletState = {
        render: { name: 'render helper stub' },
        outlets: create(null)
      };
      this._outletState.outlets[ownState.render.outlet] = ownState;
      ownState.wasUsed = true;
    } else {
      this._outletState = null;
    }
    for (var i = 0; i < this._childOutlets.length; i++) {
      var child = this._childOutlets[i];
      child.setOutletState(this._outletState && this._outletState.outlets[child._outletName]);
    }
  };

  var pointer = currentView;
  var po;
  while (pointer && !pointer._isOutlet) {
    pointer = pointer._parentView;
  }
  while (pointer && (po = pointer._parentOutlet())) {
    pointer = po;
  }
  if (pointer) {
    // we've found the toplevel outlet. Subscribe to its
    // __ember_orphan__ child outlet, which is our hack convention for
    // stashing outlet state that may target the render helper.
    pointer._childOutlets.push(view);
    if (pointer._outletState) {
      view.setOutletState(pointer._outletState.outlets[view._outletName]);
    }
  }
}
