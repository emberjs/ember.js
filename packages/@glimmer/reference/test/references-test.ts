import {
  CONSTANT_TAG,

  DirtyableTag,
  UpdatableTag,
  RevisionTag,
  TagWrapper,

  Reference,
  CachedReference,

  combine
} from '@glimmer/reference';

import {
  dict
} from '@glimmer/util';

class UpdatableReference<T> implements Reference<T> {
  public tag: TagWrapper<RevisionTag | null>;
  private _tag: TagWrapper<DirtyableTag>;

  constructor(private content: T) {
    this.tag = this._tag = DirtyableTag.create();
  }

  value(): T {
    return this.content;
  }

  update(content: T) {
    this._tag.inner.dirty();
    return this.content = content;
  }
}

class TaggedDict<T> {
  public tag: TagWrapper<RevisionTag | null>;
  private _tag: TagWrapper<DirtyableTag>;
  private data = dict<T>();

  constructor() {
    this.tag = this._tag = DirtyableTag.create();
  }

  get(key: string): T {
    return this.data[key];
  }

  set(key: string, value: T) {
    this._tag.inner.dirty();
    return this.data[key] = value;
  }
}

QUnit.module("References");

QUnit.test("CachedReference caches computation correctly", assert => {
  let computed = 0;

  class DictValueReference extends CachedReference<string> {
    public tag: TagWrapper<RevisionTag | null>;

    constructor(private dict: TaggedDict<string>, private key: string) {
      super();
      this.tag = dict.tag;
    }

    compute(): string {
      computed++;
      return this.dict.get(this.key);
    }
  }

  let dict = new TaggedDict<string>();
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

QUnit.test("CachedReference caches nested computation correctly", assert => {
  let computed = 0;

  class DictValueReference extends CachedReference<string> {
    public tag: TagWrapper<RevisionTag | null>;
    private _tag: TagWrapper<UpdatableTag>;

    constructor(private parent: Reference<TaggedDict<string>>, private key: string) {
      super();
      let _tag = this._tag = UpdatableTag.create(CONSTANT_TAG);
      this.tag = combine([parent.tag, _tag]);
    }

    compute(): string {
      computed++;

      let { parent, _tag, key } = this;

      let dict = parent.value();

      _tag.inner.update(dict.tag);

      return dict.get(key);
    }
  }

  let first = new TaggedDict<string>();
  let second = new TaggedDict<string>();

  let dictReference = new UpdatableReference(first);
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
