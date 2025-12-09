import type { ReactiveOptions } from './types';

import { consumeTag } from '../tracking';
import { createUpdatableTag, DIRTY_TAG } from '../validators';

class TrackedObject<ObjectType extends NonNullable<object>> {
  #options: ReactiveOptions<ObjectType[keyof ObjectType]>;
  #storages = new Map<PropertyKey, ReturnType<typeof createUpdatableTag>>();
  #collection = createUpdatableTag();

  #readStorageFor(key: PropertyKey) {
    let storage = this.#storages.get(key);

    if (storage === undefined) {
      storage = createUpdatableTag();
      this.#storages.set(key, storage);
    }

    consumeTag(storage);
  }

  #dirtyStorageFor(key: PropertyKey) {
    const storage = this.#storages.get(key);

    if (storage) {
      DIRTY_TAG(storage);
    }
  }

  #dirtyCollection() {
    DIRTY_TAG(this.#collection);
  }

  /**
   * This implementation of trackedObject is far too dynamic for TS to be happy with
   */
  constructor(obj: ObjectType, options: ReactiveOptions<ObjectType[keyof ObjectType]>) {
    this.#options = options;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const proto = Object.getPrototypeOf(obj);
    const descs = Object.getOwnPropertyDescriptors(obj);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const clone = Object.create(proto) as ObjectType;

    for (const prop in descs) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      Object.defineProperty(clone, prop, descs[prop]!);
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    return new Proxy(clone, {
      get(target, prop) {
        self.#readStorageFor(prop);

        return target[prop as keyof ObjectType];
      },

      has(target, prop) {
        self.#readStorageFor(prop);

        return prop in target;
      },

      ownKeys(target: ObjectType) {
        consumeTag(self.#collection);

        return Reflect.ownKeys(target);
      },

      set(target, prop, value) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        let isUnchanged = self.#options.equals(target[prop as keyof ObjectType], value);

        if (isUnchanged) {
          return true;
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        target[prop as keyof ObjectType] = value;

        self.#dirtyStorageFor(prop);
        self.#dirtyCollection();

        return true;
      },

      deleteProperty(target, prop) {
        if (prop in target) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete target[prop as keyof ObjectType];
          self.#dirtyStorageFor(prop);
          self.#storages.delete(prop);
          self.#dirtyCollection();
        }

        return true;
      },

      getPrototypeOf() {
        return TrackedObject.prototype;
      },
    }) as TrackedObject<ObjectType>;
  }
}

export function trackedObject<ObjectType extends object>(
  data?: ObjectType,
  options?: {
    equals?: (a: ObjectType[keyof ObjectType], b: ObjectType[keyof ObjectType]) => boolean;
    description?: string;
  }
): ObjectType {
  return new TrackedObject(data ?? ({} as ObjectType), {
    equals: options?.equals ?? Object.is,
    description: options?.description,
    /**
     * SAFETY: we are trying to mimic the same behavior as a plain object, so if anything about
     *         the object that is returned behaves differently from a native object in a surprising
     *         way, we should fix that and make the behavior match native objects.
     */
  }) as unknown as ObjectType;
}
