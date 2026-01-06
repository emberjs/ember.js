import type { IteratorDelegate } from '@glimmer/reference';

abstract class BoundedIterator implements IteratorDelegate {
  private position = 0;

  constructor(private length: number) {}

  isEmpty(): false {
    return false;
  }

  abstract valueFor(position: number): unknown;

  memoFor(position: number): unknown {
    return position;
  }

  next() {
    let { length, position } = this;

    if (position >= length) {
      return null;
    }

    let value = this.valueFor(position);
    let memo = this.memoFor(position);

    this.position++;

    return { value, memo };
  }
}

interface Indexable {
  readonly [key: string]: unknown;
}

class ObjectIterator extends BoundedIterator {
  static fromIndexable(obj: Indexable) {
    let keys = Object.keys(obj);
    let values = Object.values(obj);

    return new this(keys, values);
  }

  constructor(
    private keys: unknown[],
    private values: unknown[]
  ) {
    super(values.length);
  }

  valueFor(position: number): unknown {
    return this.values[position];
  }

  override memoFor(position: number): unknown {
    return this.keys[position];
  }
}

export const TestContext = {
  getProp(obj: object, path: string) {
    return Reflect.get(obj, path);
  },

  getPath(obj: object, path: string) {
    return Reflect.get(obj, path);
  },

  setProp(obj: object, path: string, value: unknown) {
    Reflect.set(obj, path, value);
  },

  toIterator(obj: unknown) {
    if (typeof obj === 'object' && obj !== null) {
      return ObjectIterator.fromIndexable(obj as Indexable);
    }

    return null;
  },
};
