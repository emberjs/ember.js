import { PrimitiveCache, PrimitiveCell, type Status } from './primitives';
import { runtime, MutableTag, type Tag } from './tags';

export class LocalCopy<T> {
  #upstream: PrimitiveCache<T>;
  #local: PrimitiveCell<T>;

  constructor(compute: () => T) {
    this.#upstream = new PrimitiveCache(compute);
    this.#local = new PrimitiveCell();
  }

  /**
   * Safely return the value of the upstream computation or the local cell, whichever is more
   * recent. This satisfies the laws of reactivity transitively through `mostRecent`.
   */
  read(): T {
    return mostRecent(this.#upstream.snapshot(), this.#local.unsafeSnapshot()).value;
  }

  /**
   * Safely write a value to the local cell during the "action" phase.
   */
  write(value: T): void {
    this.#local.write(value);
  }
}

/**
 * Safely returns the most recent status from the given statuses. If there are multiple status with
 * the same, latest revision, the first such status in the list will be returned.
 *
 * This satisfies the transactionality law because we consume all tags in all cases, which means
 * that:
 *
 * > The value of the most recent status cannot change after the `MostRecent` was computed in the
 * > same rendering transaction, because a change to any of the specified statuses would trigger a
 * > backtracking assertion.
 *
 * The granularity of `mostRecent` is: the call to `mostRecent` will invalidate when the tags of any
 * of the statuses passed to it invalidate. This is as granular as possible because a change to any
 * of the tags would, by definition, make it the most recent.
 */
function mostRecent<S extends [Status<unknown>, ...Status<unknown>[]]>(...statuses: S): S[number] {
  const [first, ...rest] = statuses;
  runtime.consume(first.tag);

  return rest.reduce((latest, status) => {
    runtime.consume(latest.tag);
    return status.tag.revision > latest.tag.revision ? status : latest;
  }, first);
}

export function tracked<V, This extends object>(
  _value: ClassAccessorDecoratorTarget<This, V>,
  context: ClassAccessorDecoratorContext<This, V>
): ClassAccessorDecoratorResult<This, V> {
  // When the field is initialized, initialize a mutable tag to represent the root storage.
  context.addInitializer(function (this: This) {
    MutableTag.init(this, context.name);
  });

  return {
    get(this: This): V {
      // When the field is accessed, consume the tag to track the read, and return the underlying
      // value stored in the field.
      const tag = MutableTag.get(this, context.name);
      tag.consume();
      return context.access.get(this);
    },

    set(this: This, value: V): void {
      // When the field is written, update the tag to track the write, and update the underlying
      // value stored in the field.
      const tag = MutableTag.get(this, context.name);
      context.access.set(this, value);
      tag.update();
    },
  };
}

const COMPUTE = new WeakMap<Cache<unknown>, () => unknown>();

declare const FN: unique symbol;
type FN = typeof FN;
type Cache<T> = {
  [FN]: () => T;
};

export function createCache<T>(fn: () => T): Cache<T> {
  const cache = {} as Cache<T>;
  let last = undefined as { value: T; tag: Tag; revision: number } | undefined;

  COMPUTE.set(cache, () => {
    if (last && last.revision >= last.tag.revision) {
      runtime.consume(last.tag);
      return last.value;
    }

    runtime.begin();
    try {
      const result = fn();
      const tag = runtime.commit();
      last = { value: result, tag, revision: runtime.current() };
      runtime.consume(tag);
      return result;
    } catch {
      last = undefined;
    }
  });

  return cache;
}

export function getCache<T>(cache: Cache<T>): T {
  const fn = COMPUTE.get(cache);

  if (!fn) {
    throw new Error('You must only call `getCache` with the return value of `createCache`');
  }

  return fn() as T;
}
