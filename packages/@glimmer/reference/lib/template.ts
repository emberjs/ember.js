import { dict, isDict } from '@glimmer/util';
import {
  CONSTANT_TAG,
  Tag,
  combine,
  createUpdatableTag,
  UpdatableTag,
  dirty,
  update,
  track,
} from '@glimmer/validator';
import { VersionedPathReference } from './reference';

/**
 * This module contains the references relevant to the Glimmer templating layer.
 * Fundamentally, templates consist of 3 basic types of references:
 *
 * 1. RootReference
 * 2. PropertyReference
 * 3. IterationItemReference
 *
 * Every value in a template (e.g. `{{this.some.prop}}`, `<SomeComponent/>`,
 * `{{my-helper}}`, etc) is ultimately represented by these references.
 * Components, helpers, and modifiers are represented by a single root
 * reference. Paths are represented by a chain of references, and iterables
 * consist of an array of many item references.
 */
export interface TemplatePathReference<T = unknown> extends VersionedPathReference<T> {
  getDebugPath(): string;
}

/**
 * Define a minimal subset of Environment so that reference roots can be used
 * with an environment (e.g. State).
 *
 * TODO: This doesn't really make sense, but State exists so we need to do
 * something. We should probably refactor so that State is created by the the
 * renderer, and gets `env` passed to it.
 */
export interface TemplateReferenceEnvironment {
  getPath(obj: unknown, path: string): unknown;
  setPath(obj: unknown, path: string, value: unknown): unknown;
  getDebugContext(): string;
}

/**
 * RootReferences refer to a constant root value within a template. For
 * instance, the `this` in `{{this.some.prop}}`. This is typically a:
 *
 * - Component
 * - Controller
 * - Helper
 * - Modifier
 *
 * Or another "top level" template construct, if you will. PropertyReferences
 * chain off a root reference in the template, and can then be passed around and
 * used at will.
 */
export class RootReference<T> implements TemplatePathReference<T> {
  private children = dict<PropertyReference>();

  tag: Tag = CONSTANT_TAG;

  constructor(protected inner: T, private env: TemplateReferenceEnvironment) {}

  value(): T {
    return this.inner;
  }

  get(propertyKey: string): PropertyReference {
    let ref = this.children[propertyKey];

    if (!ref) {
      ref = this.children[propertyKey] = new PropertyReference(this, propertyKey, this.env);
    }

    return ref;
  }

  getDebugPath() {
    return 'this';
  }
}

// export function cached<T>(inner: VersionedPathReference<T>): VersionedPathReference<T> {
//   return new Cached(inner);
// }

// export class Cached<T = unknown> implements VersionedPathReference<T> {
//   private _lastRevision: number | null = null;
//   private _lastValue: any = null;

//   tag: Tag = CONSTANT_TAG;

//   constructor(private inner: VersionedPathReference<T>) {}

//   value() {
//     let { tag, _lastRevision, _lastValue } = this;

//     if (!_lastRevision || !validate(tag, _lastRevision)) {
//       _lastValue = this._lastValue = this.inner.value();
//       this._lastRevision = value(tag);
//     }

//     return _lastValue;
//   }

//   get(key: string): VersionedPathReference {
//     return new PropertyReference(this, key);
//   }
// }

// export function data(value: unknown): VersionedPathReference {
//   if (isDict(value)) {
//     return new RootReference(value);
//   } else {
//     return new PrimitiveReference(value as null | undefined);
//   }
// }

// export function property(parentReference: VersionedPathReference, propertyKey: string) {
//   // if (isConst(parentReference)) {
//   //   return new RootPropertyReference(parentReference.value(), propertyKey);
//   // } else {
//     return new PropertyReference(parentReference, propertyKey);
//   // }
// }

// function isMutable(value: unknown): boolean {
//   return value !== null && typeof value === 'object' && !Object.isFrozen(value);
// }

// function child(value: unknown, key: string): VersionedPathReference {}

// export class RootPropertyReference implements VersionedPathReference {
//   tag = createUpdatableTag();

//   constructor(private _parentValue: unknown, private _propertyKey: string) {}

//   value(): unknown {
//     let { _parentValue } = this;
//     if (isDict(_parentValue)) {
//       let ret;
//       let tag = track(() => {
//         ret = (_parentValue as Dict)[this._propertyKey];
//       });
//       update(this.tag, tag);
//       return ret;
//     } else {
//       return undefined;
//     }
//   }

//   get(key: string): VersionedPathReference {
//     return new PropertyReference(this, key);
//   }
// }

/**
 * PropertyReferences represent a property that has been accessed on a root, or
 * another property (or iterable, see below). `some` and `prop` in
 * `{{this.some.prop}}` are each property references, `some` being a property of
 * `this`, and `prop` being a property of `some`. They are constructed by
 * recursively calling `get` on the previous reference as a template chain is
 * followed.
 */
export class PropertyReference implements TemplatePathReference {
  public tag: Tag;
  private parentObjectTag: UpdatableTag;

  constructor(
    private parentReference: TemplatePathReference,
    private propertyKey: string,
    private env: TemplateReferenceEnvironment
  ) {
    let parentObjectTag = (this.parentObjectTag = createUpdatableTag());
    let parentReferenceTag = parentReference.tag;

    this.tag = combine([parentReferenceTag, parentObjectTag]);
  }

  value() {
    let { parentReference, parentObjectTag, propertyKey } = this;

    let parentValue = parentReference.value();

    if (isDict(parentValue)) {
      let ret;
      let tag = track(() => {
        ret = this.env.getPath(parentValue, propertyKey);
      });
      update(parentObjectTag, tag);
      return ret;
    } else {
      return undefined;
    }
  }

  get(key: string): TemplatePathReference {
    return new PropertyReference(this, key, this.env);
  }

  updateReferencedValue(value: unknown) {
    let { parentReference, propertyKey } = this;
    let parentValue = parentReference.value();

    this.env.setPath(parentValue, propertyKey, value);
  }

  getDebugPath() {
    let parentPath = this.parentReference.getDebugPath();

    return `${parentPath}.${this.propertyKey}`;
  }
}

//////////

/**
 * IterationItemReferences represent an individual item in an iterable `each`.
 * They are similar to PropertyReferences, but since iteration items need to be
 * updated they have slightly different behavior. Concretely, they are the
 * `item` in:
 *
 * ```hbs
 * {{#each this.items as |item|}}
 *   {{item.foo}}
 * {{/each}}
 * ```
 *
 * Properties can chain off an iteration item, just like with the other template
 * reference types.
 */
export class IterationItemReference<T = unknown> implements TemplatePathReference<T> {
  public tag = createUpdatableTag();

  constructor(
    private parentReference: TemplatePathReference,
    private itemValue: T,
    private itemKey: unknown,
    private env: TemplateReferenceEnvironment
  ) {}

  value() {
    return this.itemValue;
  }

  update(value: T) {
    dirty(this.tag);
    this.itemValue = value;
  }

  // dirty() {
  //   dirty(this.tag);
  // }

  get(key: string): TemplatePathReference {
    return new PropertyReference(this, key, this.env);
  }

  getDebugPath() {
    let parentPath = this.parentReference.getDebugPath();

    return `${parentPath}[${this.itemKey}]`;
  }
}
