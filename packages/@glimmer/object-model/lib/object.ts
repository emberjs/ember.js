import { GlimmerDescriptor, ValueBlueprint } from './blueprint';

export interface Constructor<T extends GlimmerObject> {
  new(...args: any[]): T;
  prototype: T;
}

export interface GlimmerClass<Extensions extends GlimmerObject> extends Constructor<Extensions> {
  new(...args: any[]): Extensions;
  create<Extensions, CreateOptions, T extends typeof GlimmerObject>(this: T & GlimmerClass<Extensions>, properties?: CreateOptions): Extensions & CreateOptions & GlimmerObject;
  extend<Original extends GlimmerObject, Extensions extends GlimmerObject>(this: GlimmerClass<Original>, extensions?: Extensions): GlimmerClass<Original & Extensions>;
}

export default class GlimmerObject {
  static create<Extensions extends GlimmerObject, CreateOptions extends GlimmerObject>(this: GlimmerClass<Extensions>, properties?: CreateOptions) {
    return new this(properties) as Extensions & CreateOptions & GlimmerObject;
  }

  static extend<Original extends GlimmerObject, Extensions extends GlimmerObject>(this: GlimmerClass<Original>, extensions?: Extensions): GlimmerClass<Original & Extensions & GlimmerObject> {
    // This method intentionally uses internal typecasts to convince TypeScript
    // that what we're doing is legitimate. The real action of this method is in
    // its signature (and the signature of GlimmerClass).

    let sub = class extends (this as any as ObjectConstructor) {};

    if (extensions !== undefined) {
      let blueprints = Object.keys(extensions).map(k => {
        let extension = extensions[k];
        if (extension instanceof GlimmerDescriptor) {
          return extension.blueprint(k);
        } else {
          return new ValueBlueprint(k, extensions[k]);
        }
      });

      blueprints.forEach(b => b.define(sub.prototype));
    }

    return sub as any;
  }

  constructor(properties?: Object) {
    if (properties !== undefined) {
      Object.assign(this, properties);
    }
  }
}

export type GlimmerObjectClass = typeof GlimmerObject;
