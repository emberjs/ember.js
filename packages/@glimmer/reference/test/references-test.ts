import { Reference, CachedReference } from '..';
import { createTag, dirtyTag, consumeTag } from '@glimmer/validator';
import { dict } from '@glimmer/util';

class UpdatableRootReference<T> implements Reference<T> {
  private tag = createTag();

  constructor(private content: T) {}

  value(): T {
    consumeTag(this.tag);
    return this.content;
  }

  isConst() {
    return false;
  }

  update(content: T) {
    dirtyTag(this.tag);
    return (this.content = content);
  }
}

class TrackedDict<T> {
  private tag = createTag();
  private data = dict<T>();

  get(key: string): T {
    consumeTag(this.tag);
    return this.data[key];
  }

  set(key: string, value: T) {
    dirtyTag(this.tag);
    return (this.data[key] = value);
  }
}

QUnit.module('References');

QUnit.test('CachedReference caches computation correctly', assert => {
  let computed = 0;

  class DictValueReference extends CachedReference<string> {
    constructor(private dict: TrackedDict<string>, private key: string) {
      super();
    }

    compute(): string {
      computed++;
      return this.dict.get(this.key);
    }
  }

  let dict = new TrackedDict<string>();
  let reference = new DictValueReference(dict, 'foo');

  dict.set('foo', 'bar');

  assert.strictEqual(computed, 0, 'precond');

  assert.equal(reference.value(), 'bar');
  assert.equal(reference.value(), 'bar');
  assert.equal(reference.value(), 'bar');

  assert.strictEqual(computed, 1, 'computed');

  dict.set('foo', 'BAR');

  assert.equal(reference.value(), 'BAR');
  assert.equal(reference.value(), 'BAR');
  assert.equal(reference.value(), 'BAR');

  assert.strictEqual(computed, 2, 'computed');

  dict.set('baz', 'bat');

  assert.equal(reference.value(), 'BAR');
  assert.equal(reference.value(), 'BAR');
  assert.equal(reference.value(), 'BAR');

  assert.strictEqual(computed, 3, 'computed');

  dict.set('foo', 'bar');

  assert.equal(reference.value(), 'bar');
  assert.equal(reference.value(), 'bar');
  assert.equal(reference.value(), 'bar');

  assert.strictEqual(computed, 4, 'computed');
});

QUnit.test('CachedReference caches nested computation correctly', assert => {
  let computed = 0;

  class DictValueReference extends CachedReference<string> {
    constructor(private parent: Reference<TrackedDict<string>>, private key: string) {
      super();
    }

    compute(): string {
      computed++;
      return this.parent.value().get(this.key);
    }
  }

  let first = new TrackedDict<string>();
  let second = new TrackedDict<string>();

  let dictReference = new UpdatableRootReference(first);
  let valueReference = new DictValueReference(dictReference, 'foo');

  first.set('foo', 'bar');

  assert.strictEqual(computed, 0, 'precond');

  assert.equal(valueReference.value(), 'bar');
  assert.equal(valueReference.value(), 'bar');
  assert.equal(valueReference.value(), 'bar');

  assert.strictEqual(computed, 1, 'computed');

  second.set('foo', 'BAR');

  assert.equal(valueReference.value(), 'bar');
  assert.equal(valueReference.value(), 'bar');
  assert.equal(valueReference.value(), 'bar');

  assert.strictEqual(computed, 1, 'computed');

  dictReference.update(second);

  assert.equal(valueReference.value(), 'BAR');
  assert.equal(valueReference.value(), 'BAR');
  assert.equal(valueReference.value(), 'BAR');

  assert.strictEqual(computed, 2, 'computed');

  second.set('foo', 'foo-bar');

  assert.equal(valueReference.value(), 'foo-bar');
  assert.equal(valueReference.value(), 'foo-bar');
  assert.equal(valueReference.value(), 'foo-bar');

  assert.strictEqual(computed, 3, 'computed');
});
