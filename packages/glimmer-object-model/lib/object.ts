export type GlimmerObjectClass = typeof GlimmerObject;

export interface Constructor<T extends GlimmerObject> {
  new(...args): T;
  prototype: T;
}

export interface GlimmerClass<Extensions extends GlimmerObject> extends Constructor<Extensions> {
  new(...args): Extensions;
  create<Extensions, CreateOptions, T extends typeof GlimmerObject>(this: T & GlimmerClass<Extensions>, properties?: CreateOptions): Extensions & CreateOptions & GlimmerObject;
  extend<Original extends GlimmerObject, Extensions extends GlimmerObject>(this: GlimmerClass<Original>, extensions?: Extensions): GlimmerClass<Original & Extensions>;
}

export abstract class GlimmerObjectBase<Extensions> {

}

export default class GlimmerObject {
  static create<Extensions extends GlimmerObject, CreateOptions extends GlimmerObject, T extends typeof GlimmerObject>(this: GlimmerClass<Extensions>, properties?: CreateOptions) {
    return new this(properties) as Extensions & CreateOptions & GlimmerObject;
  }

  static extend<Original extends GlimmerObject, Extensions extends GlimmerObject>(this: GlimmerClass<Original>, extensions?: Extensions): GlimmerClass<Original & Extensions & GlimmerObject> {
    // This method intentionally uses internal typecasts to convince TypeScript
    // that what we're doing is legitimate. The real action of this method is in
    // its signature (and the signature of GlimmerClass).

    let sub = class extends (this as any as ObjectConstructor) {};

    if (extensions !== undefined) {
      Object.assign(sub.prototype, extensions);
    }

    return sub as any;
  }

  constructor(properties?: Object) {
    if (properties !== undefined) {
      Object.assign(this, properties);
    }
  }
}

/**
 * Adapter for TypeScript.
 *
 * A shim library could just declare the variable as the type
 * GlimmerClass<FirstInstance>. The key point is that shimming
 * between the two worlds requires writing a static interface
 * definition, as TypeScript isn't willing to treat the dynamic
 * intersection as a valid constructor return type.
 *
 * This function is a noop and is used like this:
 *
 * ```ts
 * // in one file
 * let Person = GlimmerObject.extend({
 *   named: 'Dan'
 * });
 *
 *
 * // in a TypeScript wrapper file
 * import { Person as OriginalPerson } from 'original-definition';
 *
 * interface PersonInstance {
 *   named: string
 * }
 *
 * export let Person = classof<PersonInstance>(OriginalPerson);
 *
 * // in a subclassing file
 * import { Person } from 'wrapped-definition';
 *
 * class FancyPerson extends Person {
 *   salutation: string;
 *
 *   fullName() {
 *     return `${this.salutation} ${this.named}`;
 *   }
 * }
 *
 * FancyPerson.create({ name: 'Tom Dale', salutation: 'Mr.' }).fullName();
 * // typechecks and returns 'Mr. Tom Dale'
 * ```
*/
export function classof<T>(klass: any): GlimmerClass<T> {
  return klass as any;
}
