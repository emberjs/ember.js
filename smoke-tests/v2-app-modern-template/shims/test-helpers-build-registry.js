/*
  Replacement for @ember/test-helpers dist/-internal/build-registry.js, swapped
  in by the vite plugin in vite.config.mjs.

  The published module calls `EmberObject.extend(...)` at module scope, which
  cannot evaluate against ember-source's modern build variant (no classic
  object model). This copy defers building the mock-owner class until it is
  actually used — tests that use `setApplication()` never hit it. It can be
  deleted once @ember/test-helpers makes the same load lazy upstream.
*/
import ApplicationInstance from '@ember/application/instance';
import Application from '@ember/application';
import * as emberObjectModule from '@ember/object';
import { Registry } from '@ember/-internals/container';
import * as emberRuntimeModule from '@ember/-internals/runtime';

/**
 * Adds methods that are normally only on registry to the container. This is largely to support the legacy APIs
 * that are not using `owner` (but are still using `this.container`).
 *
 * @private
 * @param {Object} container  the container to modify
 */
function exposeRegistryMethodsWithoutDeprecations(container) {
  const methods = [
    'register',
    'unregister',
    'resolve',
    'normalize',
    'typeInjection',
    'injection',
    'factoryInjection',
    'factoryTypeInjection',
    'has',
    'options',
    'optionsForType',
  ];
  for (let i = 0, l = methods.length; i < l; i++) {
    const methodName = methods[i];
    if (methodName && methodName in container) {
      const knownMethod = methodName;
      container[knownMethod] = function (...args) {
        return container._registry[knownMethod](...args);
      };
    }
  }
}

// NOTE: this is the same as what `EngineInstance`/`ApplicationInstance`
// implement, and is thus a superset of the `InternalOwner` contract from Ember
// itself.

// Lazily constructed: mock owners require the classic object model, which
// modern ember-source build variants do not include.
let _Owner;
function getOwnerClass() {
  if (_Owner === undefined) {
    const EmberObject = emberObjectModule.default;
    if (EmberObject === undefined || typeof EmberObject.extend !== 'function') {
      throw new Error(
        'Mock owners require the classic object model, which this ember-source build does not include. Use `setApplication()` / `setupApplicationContext` with a real application instead.'
      );
    }
    const { RegistryProxyMixin, ContainerProxyMixin } = emberRuntimeModule;
    _Owner = buildOwnerClass(
      EmberObject,
      RegistryProxyMixin,
      ContainerProxyMixin
    );
  }
  return _Owner;
}

function buildOwnerClass(EmberObject, RegistryProxyMixin, ContainerProxyMixin) {
  return EmberObject.extend(RegistryProxyMixin, ContainerProxyMixin, {
    _emberTestHelpersMockOwner: true,

    /**
     * Unregister a factory and its instance.
     *
     * Overrides `RegistryProxy#unregister` in order to clear any cached instances
     * of the unregistered factory.
     *
     * @param {string} fullName Name of the factory to unregister.
     *
     * @see {@link https://github.com/emberjs/ember.js/pull/12680}
     * @see {@link https://github.com/emberjs/ember.js/blob/v4.5.0-alpha.5/packages/%40ember/engine/instance.ts#L152-L167}
     */
    unregister(fullName) {
      this['__container__'].reset(fullName);

      // We overwrote this method from RegistryProxyMixin.
      this['__registry__'].unregister(fullName);
    },
  });
}

/**
 * @private
 * @param {Object} resolver the resolver to use with the registry
 * @returns {Object} owner, container, registry
 */
function buildRegistry(resolver) {
  const namespace = new Application();
  namespace.Resolver = {
    create() {
      return resolver;
    },
  };

  const fallbackRegistry = Application.buildRegistry(namespace);
  const registry = new Registry({
    fallback: fallbackRegistry,
  });

  ApplicationInstance.setupRegistry(registry);

  // these properties are set on the fallback registry by `buildRegistry`
  // and on the primary registry within the ApplicationInstance constructor
  // but we need to manually recreate them since ApplicationInstance's are not
  // exposed externally
  registry.normalizeFullName = fallbackRegistry.normalizeFullName;
  registry.makeToString = fallbackRegistry.makeToString;
  registry.describe = fallbackRegistry.describe;

  const owner = getOwnerClass().create({
    __registry__: registry,
    __container__: null,
  });

  const container = registry.container({
    owner: owner,
  });
  owner.__container__ = container;
  exposeRegistryMethodsWithoutDeprecations(container);
  return {
    registry,
    container,
    owner,
  };
}

export { buildRegistry as default };
