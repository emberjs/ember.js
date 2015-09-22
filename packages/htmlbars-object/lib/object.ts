import { Meta, MetaBuilder, ComputedBlueprint, setProperty } from 'htmlbars-reference';
import { InternedString, intern } from 'htmlbars-util';

interface HTMLBarsObjectFactory<T> {
  new<U>(attrs: U): T & U
}

export default class HTMLBarsObject {
  static extend<T extends Object>(object: T): HTMLBarsObjectFactory<T> {
    let builder = new MetaBuilder();

    let Class = class {
      static _Meta;
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

interface ComputedCallback {
  (): any;
}

class Computed {
  private callback: ComputedCallback;
  private deps: InternedString[][];

  constructor(callback: ComputedCallback, deps: string[]) {
    this.callback = callback;
    this.deps = deps.map(d => d.split('.').map(intern));
  }

  define(prototype: Object, key: InternedString) {
    Object.defineProperty(prototype, key, {
      enumerable: true,
      configurable: true,
      get: this.callback
    });
  }

  addReferenceType(builder: MetaBuilder, key: InternedString) {
    builder.addReferenceTypeFor(key, ComputedBlueprint(key, this.deps));
  }
}

export function computed(callback: ComputedCallback, ...deps: string[]) {
  return new Computed(callback, deps);
}