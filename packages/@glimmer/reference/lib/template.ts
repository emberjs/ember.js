import { ComponentInstanceState, CapturedArguments, Option } from '@glimmer/interfaces';
import { dict, isDict, symbol, debugToString } from '@glimmer/util';
import {
  CONSTANT_TAG,
  Tag,
  combine,
  createUpdatableTag,
  UpdatableTag,
  dirtyTag,
  updateTag,
  track,
  Revision,
  isConstTagged,
  isConstTag,
  valueForTag,
  validateTag,
} from '@glimmer/validator';
import { VersionedPathReference } from './reference';
import { DEBUG } from '@glimmer/env';
import { IteratorDelegate } from './iterable-impl';

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
export interface TemplatePathReference<T = unknown> extends VersionedPathReference<T> {
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
  getPath(obj: unknown, path: string): unknown;
  setPath(obj: unknown, path: string, value: unknown): unknown;

  getTemplatePathDebugContext(ref: VersionedPathReference): string;
  setTemplatePathDebugContext(
    ref: VersionedPathReference,
    desc: string,
    parentRef: Option<VersionedPathReference>
  ): void;

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
export abstract class RootReference<T = unknown> implements TemplatePathReference<T> {
  private children = dict<PropertyReference>();

  protected didSetupDebugContext?: boolean;
  protected debugLogName?: string;

  tag: Tag = CONSTANT_TAG;

  constructor(protected env: TemplateReferenceEnvironment) {}

  abstract value(): T;

  get(key: string): TemplatePathReference {
    // References should in general be identical to one another, so we can usually
    // deduplicate them in production. However, in DEBUG we need unique references
    // so we can properly key off them for the logging context.
    if (DEBUG) {
      // We register the template debug context now since the reference is
      // created before the component itself. It shouldn't be possible to cause
      // errors when accessing the root, only subproperties of the root, so this
      // should be fine for the time being. The exception is helpers, but they
      // set their context earlier.
      //
      // TODO: This points to a need for more first class support for arguments in
      // the debugRenderTree. The fact that we can't accurately relate an argument
      // reference to its component is problematic for debug tooling.
      if (!this.didSetupDebugContext) {
        this.didSetupDebugContext = true;
        this.env.setTemplatePathDebugContext(this, this.debugLogName || 'this', null);
      }

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
  }

  value() {
    return this.inner;
  }
}

export type InternalHelperFunction<T = unknown> = (args: CapturedArguments) => T;

export class HelperRootReference<T = unknown> extends RootReference<T> {
  private computeRevision: Option<Revision> = null;
  private computeValue?: T;
  private computeTag: Option<Tag> = null;
  private valueTag?: UpdatableTag;

  constructor(
    private fn: InternalHelperFunction<T>,
    private args: CapturedArguments,
    env: TemplateReferenceEnvironment,
    debugName?: string
  ) {
    super(env);

    if (DEBUG) {
      let name = debugName || fn.name;

      env.setTemplatePathDebugContext(this, `(result of a \`${name}\` helper)`, null);
      this.didSetupDebugContext = true;
    }

    if (isConstTagged(args)) {
      this.compute();
    }

    let { tag, computeTag } = this;

    if (computeTag !== null && isConstTag(computeTag)) {
      // If the args are constant, and the first computation is constant, then
      // the helper itself is constant and will never update.
      tag = this.tag = CONSTANT_TAG;
      this.computeRevision = valueForTag(tag);
    } else {
      let valueTag = (this.valueTag = createUpdatableTag());
      tag = this.tag = combine([args.tag, valueTag]);

      if (computeTag !== null) {
        // We computed once, so setup the cache state correctly
        updateTag(valueTag, computeTag);
        this.computeRevision = valueForTag(tag);
      }
    }
  }

  compute() {
    this.computeTag = track(() => {
      this.computeValue = this.fn(this.args);
    }, DEBUG && this.env.getTemplatePathDebugContext(this));
  }

  value(): T {
    let { tag, computeRevision } = this;

    if (computeRevision === null || !validateTag(tag, computeRevision)) {
      this.compute();
      updateTag(this.valueTag!, this.computeTag!);
      this.computeRevision = valueForTag(tag);
    }

    return this.computeValue!;
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
export class PropertyReference implements TemplatePathReference {
  public tag: Tag;
  private valueTag: UpdatableTag;
  private children = dict<PropertyReference>();
  private lastRevision: Option<Revision> = null;
  private lastValue: unknown;

  constructor(
    protected parentReference: TemplatePathReference,
    protected propertyKey: string,
    protected env: TemplateReferenceEnvironment
  ) {
    if (DEBUG) {
      env.setTemplatePathDebugContext(this, propertyKey, parentReference);
    }

    let valueTag = (this.valueTag = createUpdatableTag());
    let parentReferenceTag = parentReference.tag;

    this.tag = combine([parentReferenceTag, valueTag]);
  }

  value() {
    let { tag, lastRevision, lastValue, parentReference, valueTag, propertyKey } = this;

    if (lastRevision === null || !validateTag(tag, lastRevision)) {
      let parentValue = parentReference.value();

      if (isDict(parentValue)) {
        let combined = track(() => {
          lastValue = this.env.getPath(parentValue, propertyKey);
        }, DEBUG && this.env.getTemplatePathDebugContext(this));

        updateTag(valueTag, combined);
      } else {
        lastValue = undefined;
      }

      this.lastValue = lastValue;
      this.lastRevision = valueForTag(tag);
    }

    return lastValue;
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
  public tag = createUpdatableTag();
  private children = dict<PropertyReference>();

  constructor(
    public parentReference: TemplatePathReference,
    private itemValue: T,
    itemKey: unknown,
    private env: TemplateReferenceEnvironment
  ) {
    if (DEBUG) {
      env.setTemplatePathDebugContext(this, debugToString!(itemKey), parentReference);
    }
  }

  value() {
    return this.itemValue;
  }

  update(value: T) {
    let { itemValue } = this;

    if (value !== itemValue) {
      dirtyTag(this.tag);
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
