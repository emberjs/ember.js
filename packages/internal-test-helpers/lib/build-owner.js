import { Registry } from '@ember/-internals/container';
import { Router } from '@ember/-internals/routing';
import ApplicationInstance from '@ember/application/instance';
import Application from '@ember/application';
import {
  RegistryProxyMixin,
  ContainerProxyMixin,
  Object as EmberObject,
} from '@ember/-internals/runtime';

class ResolverWrapper {
  constructor(resolver) {
    this.resolver = resolver;
  }

  create() {
    return this.resolver;
  }
}

export default function buildOwner(options = {}) {
  let ownerOptions = options.ownerOptions || {};
  let resolver = options.resolver;
  let bootOptions = options.bootOptions || {};

  let Owner = EmberObject.extend(RegistryProxyMixin, ContainerProxyMixin);

  let namespace = EmberObject.create({
    Resolver: new ResolverWrapper(resolver),
  });

  let fallbackRegistry = Application.buildRegistry(namespace);
  fallbackRegistry.register('router:main', Router);

  let registry = new Registry({
    fallback: fallbackRegistry,
  });

  ApplicationInstance.setupRegistry(registry, bootOptions);

  let owner = Owner.create(
    {
      __registry__: registry,
      __container__: null,
    },
    ownerOptions
  );

  let container = registry.container({ owner });
  owner.__container__ = container;

  return owner;
}
