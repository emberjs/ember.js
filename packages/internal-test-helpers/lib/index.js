export { default as factory } from './factory';
import {
  Registry
} from 'container';
import {
  Application,
  ApplicationInstance
} from 'ember-application';
import {
  Router
} from 'ember-routing';
import {
  RegistryProxyMixin,
  ContainerProxyMixin,
  Object as EmberObject
} from 'ember-runtime';
import { ENV } from 'ember-environment';
import {
  get as getFromEmberMetal,
  getWithDefault as getWithDefaultFromEmberMetal,
  set as setFromEmberMetal
} from 'ember-metal';

import require from 'require';

export function buildOwner(_createOptions, resolver) {
  let createOptions = _createOptions || {};
  let Owner = EmberObject.extend(RegistryProxyMixin, ContainerProxyMixin);

  let namespace = EmberObject.create({
    Resolver: { create() { return resolver; } }
  });

  let fallbackRegistry = Application.buildRegistry(namespace);
  fallbackRegistry.register('router:main', Router);

  let registry = new Registry({
    fallback: fallbackRegistry
  });

  ApplicationInstance.setupRegistry(registry);

  let owner = Owner.create({
    __registry__: registry,
    __container__: null
  }, createOptions);

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

// used by unit tests to test both accessor mode and non-accessor mode
export function testBoth(testname, callback) {
  function emberget(x, y) { return getFromEmberMetal(x, y); }
  function emberset(x, y, z) { return setFromEmberMetal(x, y, z); }
  function aget(x, y) { return x[y]; }
  function aset(x, y, z) { return (x[y] = z); }

  QUnit.test(testname + ' using getFromEmberMetal()/Ember.set()', function() {
    callback(emberget, emberset);
  });

  QUnit.test(testname + ' using accessors', function() {
    if (ENV.USES_ACCESSORS) {
      callback(aget, aset);
    } else {
      ok('SKIPPING ACCESSORS');
    }
  });
}

export function testWithDefault(testname, callback) {
  function emberget(x, y) { return getFromEmberMetal(x, y); }
  function embergetwithdefault(x, y, z) { return getWithDefaultFromEmberMetal(x, y, z); }
  function getwithdefault(x, y, z) { return x.getWithDefault(y, z); }
  function emberset(x, y, z) { return setFromEmberMetal(x, y, z); }
  function aget(x, y) { return x[y]; }
  function aset(x, y, z) { return (x[y] = z); }

  QUnit.test(testname + ' using obj.get()', function() {
    callback(emberget, emberset);
  });

  QUnit.test(testname + ' using obj.getWithDefault()', function() {
    callback(getwithdefault, emberset);
  });

  QUnit.test(testname + ' using getFromEmberMetal()', function() {
    callback(emberget, emberset);
  });

  QUnit.test(testname + ' using Ember.getWithDefault()', function() {
    callback(embergetwithdefault, emberset);
  });

  QUnit.test(testname + ' using accessors', function() {
    if (ENV.USES_ACCESSORS) {
      callback(aget, aset);
    } else {
      ok('SKIPPING ACCESSORS');
    }
  });
}
