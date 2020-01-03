import { Reference, CachedReference } from '..';
import {
  combine,
  Tag,
  DirtyableTag,
  UpdatableTag,
  createTag,
  createUpdatableTag,
  dirty,
  update,
} from '@glimmer/validator';
import { dict } from '@glimmer/util';

class UpdatableRootReference<T> implements Reference<T> {
  public tag: DirtyableTag;
  private _tag: DirtyableTag;

  constructor(private content: T) {
    this.tag = this._tag = createTag();
  }

  value(): T {
    return this.content;
  }

  update(content: T) {
    dirty(this._tag);
    return (this.content = content);
  }
}

class TaggedDict<T> {
  public tag: DirtyableTag;
  private _tag: DirtyableTag;
  private data = dict<T>();

  constructor() {
    this.tag = this._tag = createTag();
  }

  get(key: string): T {
    return this.data[key];
  }

  set(key: string, value: T) {
    dirty(this._tag);
    return (this.data[key] = value);
  }
}

QUnit.module('References');

QUnit.test('CachedReference caches computation correctly', assert => {
  let computed = 0;

  class DictValueReference extends CachedReference<string> {
    public tag: Tag;

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

QUnit.test('CachedReference caches nested computation correctly', assert => {
  let computed = 0;

  class DictValueReference extends CachedReference<string> {
    public tag: Tag;
    private _tag: UpdatableTag;

    constructor(private parent: Reference<TaggedDict<string>>, private key: string) {
      super();
      let _tag = (this._tag = createUpdatableTag());
      this.tag = combine([parent.tag, _tag]);
    }

    compute(): string {
      computed++;

      let { parent, _tag, key } = this;

      let dict = parent.value();

      update(_tag, dict.tag);

      return dict.get(key);
    }
  }

  let first = new TaggedDict<string>();
  let second = new TaggedDict<string>();

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
