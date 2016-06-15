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
} from 'ember-htmlbars/views/outlet';

import HashLocation from 'ember-routing/location/hash_location';
import EmberObject from 'ember-runtime/system/object';
import Registry from 'container/registry';
import RegistryProxy from 'ember-runtime/mixins/registry_proxy';
import ContainerProxy from 'ember-runtime/mixins/container_proxy';
import { get as getTemplate, has as hasTemplate } from 'ember-templates/template_registry';
import plugins, { registerPlugin } from 'ember-template-compiler/plugins';

function registerAstPlugin(plugin) {
  registerPlugin('ast', plugin);
}

function removeAstPlugin(plugin) {
  let index = plugins['ast'].indexOf(plugin);
  plugins['ast'].splice(index, 1);
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

function resolverFor(namespace) {
  return {
    resolve(fullName) {
      let nameParts = fullName.split(':');
      let type = nameParts[0];
      let name = nameParts[1];

      if (type === 'template') {
        let templateName = decamelize(name);
        if (hasTemplate(templateName)) {
          return getTemplate(templateName);
        }
      }

      let className = classify(name) + classify(type);
      let factory = get(namespace, className);

      if (factory) { return factory; }
    }
  };
}

export {
  registerAstPlugin,
  removeAstPlugin,
  resolverFor,
  buildAppInstance
};
