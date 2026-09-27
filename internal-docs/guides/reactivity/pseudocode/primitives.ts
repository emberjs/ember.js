import { type Tag, MutableTag, runtime } from './tags';

export class PrimitiveCell<T> {
  readonly #tag: MutableTag = MutableTag.init(this, 'value');
  #value: T;

  /**
   * Unsafely read the value of the cell. This is unsafe because it exposes the raw value of the tag
   * and the last value of the cell, but relies on the caller to ensure that the tag is consumed if
   * the abstraction needs to invalidate when the cell changes.
   *
   * Callers of `unsafeSnapshot` must satisfy the transactionality law by consuming the tag whenever a
   * change to the value would result in a change to the computed value of the abstraction.
   */
  unsafeSnapshot(): Snapshot<T> {
    return Snapshot.of({ value: this.#value, tag: this.#tag });
  }

  write(value: T): void {
    this.#tag.update();
    this.#value = value;
  }
}
export type Status<T> = { value: T; tag: Tag };
type Last<T> = { value: T; tag: Tag; revision: number };

export class Snapshot<T> {
  static of<T>(status: Status<T>): Snapshot<T> {
    return new Snapshot({ value: status.value, tag: status.tag });
  }
  readonly #value: T;
  readonly #tag: Tag;
  readonly #revision: number;

  private constructor({ value, tag }: Status<T>) {
    this.#value = value;
    this.#tag = tag;
    this.#revision = tag.revision;
  }

  get tag(): Tag {
    return this.#tag;
  }

  get value(): T {
    return this.#value;
  }
}

export class PrimitiveCache<T> {
  readonly #compute: () => T;
  #last: Last<T>;

  constructor(compute: () => T) {
    this.#compute = compute;

    // A `PrimitiveCache` must always be initialized with a value. If all of the primitives used
    // inside of a `PrimitiveCache` are compliant with the Fundamental Laws of Reactivity, then
    // initializing a cache will never change the revision counter.
    this.read();
  }

  /**
   * Unsafely read the status of the cache. This is unsafe because it exposes the raw value of the
   * tag and the last value of the cache, but relies on the caller to ensure that the tag is
   * consumed if the abstraction needs to invalidate when the cache changes.
   *
   * Callers of `unsafeSnapshot` must satisfy the transactionality law by consuming the tag whenever a
   * change to the value would result in a change to the computed value of the abstraction.
   */
  snapshot(): Snapshot<T> {
    return Snapshot.of(this.#last);
  }

  /**
   * Safely read the value of the cache. This satisfies the transactionality law because:
   *
   * 1. If the cache is valid, then it will return the last value of the cache. This is guaranteed
   *    to be the same value for all reads in the same rendering transaction because any mutations
   *    to any _members_ of the last tag will trigger a backtracking assertion.
   * 2. If the cache is invalid, then the previous value of the cache is thrown away and the
   *    computation is run again. Any subsequent reads from the cache will return the same value
   *    because of (1).
   */
  read(): T {
    if (this.#last && this.#last.revision >= this.#last.tag.revision) {
      runtime.consume(this.#last.tag);
      return this.#last.value;
    }

    runtime.begin();
    try {
      const result = this.#compute();
      const tag = runtime.commit();
      this.#last = { value: result, tag, revision: runtime.current() };
      runtime.consume(tag);
      return result;
    } catch (e) {
      // This is possible, but not currently modelled at all. The approach used by the error
      // recovery branch that was not merged is: tags are permitted to capture errors, and
      // value abstractions expose those errors in their safe read() abstractions.
      throw e;
    }
  }
}
