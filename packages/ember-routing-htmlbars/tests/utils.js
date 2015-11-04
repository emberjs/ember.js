import Ember from 'ember-metal/core';
import { get } from 'ember-metal/property_get';
import {
  classify,
  decamelize
} from 'ember-runtime/system/string';

import Controller from 'ember-runtime/controllers/controller';

import EmberView from 'ember-views/views/view';
import EmberRouter from 'ember-routing/system/router';
import {
  OutletView,
  CoreOutletView
} from 'ember-routing-views/views/outlet';

import HashLocation from 'ember-routing/location/hash_location';
import EmberObject from 'ember-runtime/system/object';
import Registry from 'container/registry';
import RegistryProxy from 'ember-runtime/mixins/registry_proxy';
import ContainerProxy from 'ember-runtime/mixins/container_proxy';

function resolverFor(namespace) {
  return function(fullName) {
    var nameParts = fullName.split(':');
    var type = nameParts[0];
    var name = nameParts[1];

    if (type === 'template') {
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

function buildAppInstance() {
  let registry;
  let App = EmberObject.extend(RegistryProxy, ContainerProxy, {
    init() {
      this._super(...arguments);
      registry = this.__registry__ = new Registry();
      this.__container__ = registry.container({ owner: this });
    }
  });
  let appInstance = App.create();

  registry.resolver = resolverFor(App);

  registry.optionsForType('view', { singleton: false });
  registry.optionsForType('template', { instantiate: false });
  registry.register('application:main', App, { instantiate: false });
  registry.injection('router:main', 'namespace', 'application:main');

  registry.register('location:hash', HashLocation);

  registry.register('controller:basic', Controller, { instantiate: false });

  registry.register('view:toplevel', EmberView.extend());
  registry.register('view:-outlet', OutletView);
  registry.register('view:core-outlet', CoreOutletView);
  registry.register('router:main', EmberRouter.extend());

  registry.typeInjection('route', 'router', 'router:main');

  return appInstance;
}

export {
  resolverFor,
  buildAppInstance
};
