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
import require from 'require';

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

export function confirmExport(Ember, assert, path, moduleId, exportName) {
  let desc = getDescriptor(Ember, path);
  assert.ok(desc, 'the property exists on the global');

  let mod = require(moduleId);
  if (typeof exportName === 'string') {
    assert.equal(desc.value, mod[exportName], `Ember.${path} is exported correctly`);
    assert.notEqual(mod[exportName], undefined, `Ember.${path} is not \`undefined\``);
  } else {
    assert.equal(desc.get, mod[exportName.get], `Ember.${path} getter is exported correctly`);
    assert.notEqual(desc.get, undefined, `Ember.${path} getter is not undefined`);

    if (exportName.set) {
      assert.equal(desc.set, mod[exportName.set], `Ember.${path} setter is exported correctly`);
      assert.notEqual(desc.set, undefined, `Ember.${path} setter is not undefined`);
    }
  }
}

function getDescriptor(obj, path) {
  let parts = path.split('.');
  let value = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    let part = parts[i];
    value = value[part];
    if (!value) {
      return undefined;
    }
  }
  let last = parts[parts.length - 1];
  return Object.getOwnPropertyDescriptor(value, last);
}
