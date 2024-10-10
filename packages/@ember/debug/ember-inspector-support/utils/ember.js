import { emberSafeRequire } from '@ember/debug/ember-inspector-support/utils/ember/loader';

let Ember;

try {
  Ember = requireModule('ember').default;
} catch {
  Ember = window.Ember;
}

let {
  ArrayProxy,
  Namespace,
  ActionHandler,
  ControllerMixin,
  CoreObject,
  Application,
  MutableArray,
  MutableEnumerable,
  NativeArray,
  Component,
  Observable,
  Evented,
  PromiseProxyMixin,
  Service,
  Object: EmberObject,
  ObjectProxy,
  VERSION,
  ComputedProperty,
  meta,
  get,
  set,
  computed,
  _captureRenderTree: captureRenderTree,
} = Ember || {};

let getEnv = () => Ember.ENV;

if (!Ember) {
  captureRenderTree = emberSafeRequire('@ember/debug')?.captureRenderTree;
  getEnv = emberSafeRequire('@ember/-internals/environment')?.getENV;
  ArrayProxy = emberSafeRequire('@ember/array/proxy')?.default;
  ObjectProxy = emberSafeRequire('@ember/object/proxy')?.default;
  MutableArray = emberSafeRequire('@ember/array/mutable')?.default;
  Namespace = emberSafeRequire('@ember/application/namespace')?.default;
  MutableEnumerable = emberSafeRequire('@ember/enumerable/mutable')?.default;
  NativeArray = emberSafeRequire('@ember/array')?.NativeArray;
  ControllerMixin = emberSafeRequire('@ember/controller')?.ControllerMixin;
  CoreObject = emberSafeRequire('@ember/object/core')?.default;
  Application = emberSafeRequire('@ember/application')?.default;
  Component = emberSafeRequire('@ember/component')?.default;
  Observable = emberSafeRequire('@ember/object/observable')?.default;
  Evented = emberSafeRequire('@ember/object/evented')?.default;
  PromiseProxyMixin = emberSafeRequire(
    '@ember/object/promise-proxy-mixin'
  )?.default;
  Service = emberSafeRequire('@ember/service')?.default;
  EmberObject = emberSafeRequire('@ember/object')?.default;
  VERSION = emberSafeRequire('ember/version')?.default;
  ComputedProperty = emberSafeRequire(
    '@ember/-internals/metal'
  )?.ComputedProperty;
  meta = emberSafeRequire('@ember/-internals/meta')?.meta;
  set = emberSafeRequire('@ember/object')?.set;
  get = emberSafeRequire('@ember/object')?.get;
}

export {
  ArrayProxy,
  Namespace,
  ActionHandler,
  Application,
  ControllerMixin,
  MutableArray,
  MutableEnumerable,
  NativeArray,
  CoreObject,
  ObjectProxy,
  Component,
  Observable,
  Evented,
  Service,
  PromiseProxyMixin,
  EmberObject,
  VERSION,
  ComputedProperty,
  meta,
  computed,
  get,
  set,
  captureRenderTree,
  getEnv,
};

export default Ember;
