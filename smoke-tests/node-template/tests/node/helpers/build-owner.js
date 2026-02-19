/**
 * ESM port of tests/node/helpers/build-owner.js
 */
import EmberObject from 'ember-source/@ember/object/index.js';
import Application from 'ember-source/@ember/application/index.js';
import ApplicationInstance from 'ember-source/@ember/application/instance.js';
import { Registry } from 'ember-source/@ember/-internals/container/index.js';
import RegistryProxyMixin from 'ember-source/@ember/-internals/runtime/lib/mixins/registry_proxy.js';
import ContainerProxyMixin from 'ember-source/@ember/-internals/runtime/lib/mixins/container_proxy.js';

export function buildOwner(resolver) {
  let Owner = EmberObject.extend(RegistryProxyMixin, ContainerProxyMixin);

  let namespace = EmberObject.create({
    Resolver: {
      create: function () {
        return resolver;
      },
    },
  });

  let fallbackRegistry = Application.buildRegistry(namespace);
  let registry = new Registry({
    fallback: fallbackRegistry,
  });

  ApplicationInstance.setupRegistry(registry);

  let owner = Owner.create({
    __registry__: registry,
    __container__: null,
  });

  let container = registry.container({ owner: owner });
  owner.__container__ = container;

  return owner;
}
