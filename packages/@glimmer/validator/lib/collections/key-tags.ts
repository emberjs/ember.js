import { consumeTag, isTracking } from '../tracking';
import { createUpdatableTag, DIRTY_TAG } from '../validators';

type Tag = ReturnType<typeof createUpdatableTag>;

function isWeakKey(key: unknown): key is object {
  return (typeof key === 'object' && key !== null) || typeof key === 'function';
}

/**
 * The per-key tags of a `trackedSet` or `trackedMap`.
 *
 * Tags are created when a key is read, whether or not the collection has that
 * key, so that the reader is notified when the key is added. Holding those
 * tags in a `Map` would keep every object that was ever looked up alive for as
 * long as the collection is. Tags for objects are held in a `WeakMap` instead.
 * Primitives can't be `WeakMap` keys (and can't leak), so they keep using a
 * `Map`.
 */
export class KeyTags<Key> {
  #objects = new WeakMap<object, Tag>();
  #primitives = new Map<Key, Tag>();

  #tagsFor(key: Key): { get(key: unknown): Tag | undefined; delete(key: unknown): boolean } {
    return isWeakKey(key) ? this.#objects : this.#primitives;
  }

  consume(key: Key): void {
    // Outside of a tracking frame nothing can be notified, so there is no
    // reason to create a tag.
    if (!isTracking()) return;

    let tag = this.#tagsFor(key).get(key);

    if (tag === undefined) {
      tag = createUpdatableTag();

      if (isWeakKey(key)) {
        this.#objects.set(key, tag);
      } else {
        this.#primitives.set(key, tag);
      }
    }

    consumeTag(tag);
  }

  dirty(key: Key): void {
    const tag = this.#tagsFor(key).get(key);

    if (tag) {
      DIRTY_TAG(tag);
    }
  }

  delete(key: Key): void {
    this.dirty(key);
    this.#tagsFor(key).delete(key);
  }

  /**
   * Called with the keys that are about to be removed from the collection.
   *
   * A `WeakMap` can't be enumerated, so the tags of object keys are found
   * through the keys being removed.
   */
  clear(keys: Iterable<Key>): void {
    for (const key of keys) {
      if (isWeakKey(key)) {
        this.delete(key);
      }
    }

    this.#primitives.forEach((tag) => DIRTY_TAG(tag));
    this.#primitives.clear();
  }
}
