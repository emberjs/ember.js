module.exports = function buildOwner(Ember, resolver) {
  let Owner = Ember.Object.extend(Ember._RegistryProxyMixin, Ember._ContainerProxyMixin);

  let namespace = Ember.Object.create({
    Resolver: {
      create: function () {
        return resolver;
      },
    },
  });

  let fallbackRegistry = Ember.Application.buildRegistry(namespace);
  let registry = new Ember.Registry({
    fallback: fallbackRegistry,
  });

  Ember.ApplicationInstance.setupRegistry(registry);

  let owner = Owner.create({
    __registry__: registry,
    __container__: null,
  });

  let container = registry.container({ owner: owner });
  owner.__container__ = container;

  return owner;
};
