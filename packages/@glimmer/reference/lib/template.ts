import { ComponentInstanceState, CapturedArguments, Option } from '@glimmer/interfaces';
import { dict, isDict, symbol, debugToString } from '@glimmer/util';
import { dirtyTag, consumeTag, createTag } from '@glimmer/validator';
import { PathReference, CachedReference } from './reference';
import { DEBUG } from '@glimmer/env';
import { IteratorDelegate } from './iterable';

export const UPDATE_REFERENCED_VALUE: unique symbol = symbol('UPDATE_REFERENCED_VALUE');

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
export interface TemplatePathReference<T = unknown> extends PathReference<T> {
  [UPDATE_REFERENCED_VALUE]?: (value: T) => void;
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
  getProp(obj: unknown, prop: string): unknown;
  getPath(obj: unknown, path: string): unknown;
  setPath(obj: unknown, path: string, value: unknown): unknown;

  toIterator(obj: unknown): Option<IteratorDelegate>;
}

/**
 * RootReferences refer to a constant root value within a template. For
 * instance, the `this` in `{{this.some.prop}}`. This is typically a:
 *
 * - Component
 * - Controller
 * - Helper
 *
 * Or another "top level" template construct, if you will. PropertyReferences
 * chain off a root reference in the template, and can then be passed around and
 * used at will.
 */
export abstract class RootReference<T = unknown> extends CachedReference<T>
  implements TemplatePathReference<T> {
  private children = dict<PropertyReference>();
  debugLabel?: string;

  constructor(protected env: TemplateReferenceEnvironment) {
    super();
  }

  get(key: string): TemplatePathReference {
    // References should in general be identical to one another, so we can usually
    // deduplicate them in production. However, in DEBUG we need unique references
    // so we can properly key off them for the logging context.
    if (DEBUG) {
      return new PropertyReference(this, key, this.env);
    } else {
      let ref = this.children[key];

      if (ref === undefined) {
        ref = this.children[key] = new PropertyReference(this, key, this.env);
      }

      return ref;
    }
  }
}

export class ComponentRootReference<T extends ComponentInstanceState> extends RootReference<T> {
  constructor(private inner: T, env: TemplateReferenceEnvironment) {
    super(env);

    if (DEBUG) {
      this.debugLabel = 'this';
    }
  }

  value() {
    return this.inner;
  }

  isConst() {
    return true;
  }

  // Make type checker happy...
  compute() {
    return this.inner;
  }
}

export type InternalHelperFunction<T = unknown> = (args: CapturedArguments) => T;

export class HelperRootReference<T = unknown> extends RootReference<T> {
  compute: () => T;

  constructor(
    fn: InternalHelperFunction<T>,
    args: CapturedArguments,
    protected env: TemplateReferenceEnvironment,
    debugName?: string
  ) {
    super(env);

    if (DEBUG) {
      let name = debugName || fn.name;

      this.debugLabel = `(result of a \`${name}\` helper)`;
    }

    this.compute = fn.bind(null, args);
  }
}

/**
 * PropertyReferences represent a property that has been accessed on a root, or
 * another property (or iterable, see below). `some` and `prop` in
 * `{{this.some.prop}}` are each property references, `some` being a property of
 * `this`, and `prop` being a property of `some`. They are constructed by
 * recursively calling `get` on the previous reference as a template chain is
 * followed.
 */
export class PropertyReference extends CachedReference implements TemplatePathReference {
  private children = dict<PropertyReference>();
  debugLabel?: string;

  constructor(
    protected parentReference: TemplatePathReference,
    protected propertyKey: string,
    protected env: TemplateReferenceEnvironment
  ) {
    super();

    if (DEBUG) {
      this.debugLabel = `${parentReference.debugLabel!}.${propertyKey}`;
    }
  }

  compute() {
    let { parentReference, propertyKey } = this;

    let parentValue = parentReference.value();

    if (isDict(parentValue)) {
      return this.env.getProp(parentValue, propertyKey);
    }
  }

  get(key: string): TemplatePathReference {
    // References should in general be identical to one another, so we can usually
    // deduplicate them in production. However, in DEBUG we need unique references
    // so we can properly key off them for the logging context.
    if (DEBUG) {
      return new PropertyReference(this, key, this.env);
    } else {
      let ref = this.children[key];

      if (ref === undefined) {
        ref = this.children[key] = new PropertyReference(this, key, this.env);
      }

      return ref;
    }
  }

  [UPDATE_REFERENCED_VALUE](value: unknown) {
    let { parentReference, propertyKey } = this;
    let parentValue = parentReference.value();

    this.env.setPath(parentValue, propertyKey, value);
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
  private children = dict<PropertyReference>();
  private tag = createTag();
  debugLabel?: string;

  constructor(
    public parentReference: TemplatePathReference,
    private itemValue: T,
    itemKey: unknown,
    private env: TemplateReferenceEnvironment
  ) {
    if (DEBUG) {
      this.debugLabel = `${parentReference.debugLabel!}.${debugToString!(itemKey)}`;
    }
  }

  isConst() {
    return false;
  }

  value() {
    consumeTag(this.tag);

    return this.itemValue;
  }

  update(value: T) {
    if (value !== this.itemValue) {
      dirtyTag(this.tag!);
      this.itemValue = value;
    }
  }

  get(key: string): TemplatePathReference {
    // References should in general be identical to one another, so we can usually
    // deduplicate them in production. However, in DEBUG we need unique references
    // so we can properly key off them for the logging context.
    if (DEBUG) {
      return new PropertyReference(this, key, this.env);
    } else {
      let ref = this.children[key];

      if (ref === undefined) {
        ref = this.children[key] = new PropertyReference(this, key, this.env);
      }

      return ref;
    }
  }
}
