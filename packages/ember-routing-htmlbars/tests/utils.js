import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import {
  classify,
  decamelize
} from "ember-runtime/system/string";

import Registry from "container/registry";
import Controller from "ember-runtime/controllers/controller";
import ObjectController from "ember-runtime/controllers/object_controller";
import ArrayController from "ember-runtime/controllers/array_controller";

import _MetamorphView from "ember-views/views/metamorph_view";
import EmberView from "ember-views/views/view";
import EmberRouter from "ember-routing/system/router";
import {
  OutletView,
  CoreOutletView
} from "ember-routing-views/views/outlet";

import HashLocation from "ember-routing/location/hash_location";

function resolverFor(namespace) {
  return function(fullName) {
    var nameParts = fullName.split(":");
    var type = nameParts[0];
    var name = nameParts[1];

    if (type === "template") {
      var templateName = decamelize(name);
      if (Ember.TEMPLATES[templateName]) {
        return Ember.TEMPLATES[templateName];
      }
    }

    var className = classify(name) + classify(type);
    var factory = get(namespace, className);

    if (factory) { return factory; }
  };
}

function buildRegistry(namespace) {
  var registry = new Registry();

  registry.set = set;
  registry.resolver = resolverFor(namespace);
  registry.optionsForType("view", { singleton: false });
  registry.optionsForType("template", { instantiate: false });
  registry.register("application:main", namespace, { instantiate: false });
  registry.injection("router:main", "namespace", "application:main");

  registry.register("location:hash", HashLocation);

  registry.register("controller:basic", Controller, { instantiate: false });
  registry.register("controller:object", ObjectController, { instantiate: false });
  registry.register("controller:array", ArrayController, { instantiate: false });

  registry.register("view:default", _MetamorphView);
  registry.register("view:toplevel", EmberView.extend());
  registry.register("view:-outlet", OutletView);
  registry.register("view:core-outlet", CoreOutletView);
  registry.register("router:main", EmberRouter.extend());

  registry.typeInjection("route", "router", "router:main");

  return registry;
}

export {
  resolverFor,
  buildRegistry
};
