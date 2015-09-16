import { Meta, MetaBuilder, ComputedBlueprint, intern } from 'htmlbars-reference';

export default class HTMLBarsObject {
  static extend(object) {
    let builder = new MetaBuilder();

    let Class = class {
      constructor(attrs) {
        Object.assign(this, attrs);
      }
    };

    Object.keys(object).forEach(key => {
      object[key].define(Class.prototype, key);
      object[key].addReferenceType(builder, key);
    });

    Class._Meta = builder.seal();
    return Class;
  }
}

class Computed {
  constructor(callback, deps) {
    this._callback = callback;
    this._deps = deps.map(d => d.split('.').map(intern));
  }

  define(prototype, key) {
    Object.defineProperty(prototype, key, {
      enumerable: true,
      configurable: true,
      get: this._callback
    });
  }

  addReferenceType(builder, key) {
    /*jshint -W064*/
    builder.addReferenceTypeFor(key, ComputedBlueprint(key, this._deps)); /*jshint +W064*/
  }
}

export function computed(callback, ...deps) {
  return new Computed(callback, deps);
}

export function setProperty(parent, property, val) {
  var rootProp = Meta.for(parent).root()._chains[property];

  var referencesToNotify = Meta.for(parent).referencesFor(property);

  parent[property] = val;

  if (referencesToNotify) {
    referencesToNotify.forEach(function(ref) { ref._reparent(); });
  }

  if (rootProp) rootProp.notify();
}
