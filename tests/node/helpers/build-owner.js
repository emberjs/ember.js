module.exports = function buildOwner(m, resolver) {
  let Owner = m.EmberObject.extend(m.RegistryProxyMixin, m.ContainerProxyMixin);

  let namespace = m.EmberObject.create({
    Resolver: {
      create: function () {
        return resolver;
      },
    },
  });

  let fallbackRegistry = m.Application.buildRegistry(namespace);
  let registry = new m.Registry({
    fallback: fallbackRegistry,
  });

  m.ApplicationInstance.setupRegistry(registry);

  let owner = Owner.create({
    __registry__: registry,
    __container__: null,
  });

  let container = registry.container({ owner: owner });
  owner.__container__ = container;

  return owner;
};
