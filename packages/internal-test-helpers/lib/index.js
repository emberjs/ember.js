import {
  Registry
} from 'container';
import {
  Application,
  ApplicationInstance
} from 'ember-application';
import {
  RegistryProxyMixin,
  ContainerProxyMixin,
  Object as EmberObject
} from 'ember-runtime';

export function buildOwner(resolver) {
  let Owner = EmberObject.extend(RegistryProxyMixin, ContainerProxyMixin);

  let namespace = EmberObject.create({
    Resolver: { create() { return resolver; } }
  });

  let fallbackRegistry = Application.buildRegistry(namespace);
  let registry = new Registry({
    fallback: fallbackRegistry
  });

  ApplicationInstance.setupRegistry(registry);

  let owner = Owner.create({
    __registry__: registry,
    __container__: null
  });

  let container = registry.container({ owner: owner });
  owner.__container__ = container;

  return owner;
}
