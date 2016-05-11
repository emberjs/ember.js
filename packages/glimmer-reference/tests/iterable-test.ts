import {
  VOLATILE_TAG,
  BasicReference,
  Reference,
  AbstractIterable,
  Iterator,
  IterationItem,
  IterationArtifacts,
  ReferenceIterator,
  IteratorSynchronizer,
  IteratorSynchronizerDelegate
} from 'glimmer-reference';

import { UpdatableReference } from 'glimmer-object-reference';

import { Opaque, LinkedList, ListNode, dict } from 'glimmer-util';

QUnit.module("Reference iterables");

class Target implements IteratorSynchronizerDelegate {
  private map = dict<ListNode<BasicReference<Opaque>>>();
  private list = new LinkedList<ListNode<BasicReference<Opaque>>>();
  public tag = VOLATILE_TAG;

  retain(key: string, item: BasicReference<Opaque>, memo: BasicReference<Opaque>) {
    if (item !== this.map[key].value) {
      throw new Error("unstable reference");
    }
  }

  done() {}

  append(key: string, item: BasicReference<Opaque>, memo: BasicReference<Opaque>) {
    let node = this.map[key] = new ListNode(item);
    this.list.append(node);
  }

  insert(key: string, item: BasicReference<Opaque>, memo: BasicReference<Opaque>, before: string) {
    let referenceNode = before ? this.map[before] : null;
    let node = this.map[key] = new ListNode(item);
    this.list.insertBefore(node, referenceNode);
  }

  move(key: string, item: BasicReference<Opaque>, memo: BasicReference<Opaque>, before: string) {
    let referenceNode = before ? this.map[before] : null;
    let node = this.map[key];

    if (item !== node.value) {
      throw new Error("unstable reference");
    }

    this.list.remove(node);
    this.list.insertBefore(node, referenceNode);
  }

  delete(key: string) {
    let node = this.map[key];
    delete this.map[key];
    this.list.remove(node);
  }

  toArray(): BasicReference<Opaque>[] {
    return this.list.toArray().map(node => node.value);
  }

  toValues(): Opaque[] {
    return this.toArray().map(ref => ref.value());
  }
}

interface TestItem {
  key: string;
  name: string;
}

class TestIterationItem implements IterationItem<Opaque, Opaque> {
  public key: string;
  public value: Opaque;
  public memo: Opaque;

  constructor(key: string, value: Opaque, memo: Opaque) {
    this.key = key;
    this.value = value;
    this.memo = memo;
  }
}

class TestIterator implements Iterator<Opaque, Opaque> {
  private array: TestItem[];
  private position = 0;

  constructor(array: TestItem[]) {
    this.array = array;
  }

  isEmpty(): boolean {
    return this.array.length === 0;
  }

  next(): IterationItem<Opaque, Opaque> {
    let { position, array } = this;

    if (position >= array.length) return null;

    let value = array[position];

    this.position++;

    return new TestIterationItem(value.key, value, position);
  }
}

class TestIterable implements AbstractIterable<Opaque, Opaque, IterationItem<Opaque, Opaque>, UpdatableReference<Opaque>, UpdatableReference<Opaque>> {
  private arrayRef: UpdatableReference<TestItem[]>;

  constructor(arrayRef: UpdatableReference<TestItem[]>) {
    this.arrayRef = arrayRef;
  }

  iterate(): TestIterator {
    return new TestIterator(this.arrayRef.value());
  }

  valueReferenceFor(item: TestIterationItem): UpdatableReference<Opaque> {
    return new UpdatableReference(item.value);
  }

  updateValueReference(reference: UpdatableReference<Opaque>, item: TestIterationItem) {
    reference.update(item.value);
  }

  memoReferenceFor(item: TestIterationItem): UpdatableReference<Opaque> {
    return new UpdatableReference(item.memo);
  }

  updateMemoReference(reference: UpdatableReference<Opaque>, item: TestIterationItem) {
    reference.update(item.memo);
  }
}

function initialize(arr: TestItem[]): { artifacts: IterationArtifacts, target: Target, reference: UpdatableReference<TestItem[]> } {
  let target = new Target();
  let reference = new UpdatableReference(arr);
  let iterator = new ReferenceIterator(new TestIterable(reference));
  let item: IterationItem<Reference<Opaque>, Reference<Opaque>>;

  while (item = iterator.next()) {
    target.append(item.key, item.value, item.memo);
  }

  return { reference, target, artifacts: iterator.artifacts };
}

function sync(target: Target, artifacts: IterationArtifacts) {
  let synchronizer = new IteratorSynchronizer({ target, artifacts });
  synchronizer.sync();
}

QUnit.test("They provide a sequence of references with keys", assert => {
  let arr = [{ key: "a", name: "Yehuda" }, { key: "b", name: "Godfrey" }];
  let { target } = initialize(arr);

  assert.deepEqual(target.toValues(), arr);
});

QUnit.test("When re-iterated via mutation, the original references are updated", assert => {
  let arr = [{ key: "a", name: "Yehuda" }, { key: "b", name: "Godfrey" }];
  let { target, artifacts } = initialize(arr);

  assert.deepEqual(target.toValues(), arr);

  arr.reverse();

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), arr);

  arr.push({ key: "c", name: "Godhuda" });

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), arr);

  arr.shift();

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), arr);
});

QUnit.test("When re-iterated via deep mutation, the original references are updated", assert => {
  let arr = [{ key: "a", name: "Yehuda" }, { key: "b", name: "Godfrey" }];
  let { target, artifacts } = initialize(arr);

  assert.deepEqual(target.toValues(), arr);

  arr[0].key = "b";
  arr[0].name = "Godfrey";
  arr[1].key = "a";
  arr[1].name = "Yehuda";

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), arr);

  arr[0].name = "Yehuda";
  arr[1].name = "Godfrey";

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), arr);

  arr.push({ key: "c", name: "Godhuda" });

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), arr);

  arr.shift();

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), arr);
});

QUnit.test("When re-iterated via replacement, the original references are updated", assert => {
  let arr = [{ key: "a", name: "Yehuda" }, { key: "b", name: "Godfrey" }];
  let { target, reference, artifacts } = initialize(arr);

  assert.deepEqual(target.toValues(), arr);

  arr = arr.slice();
  arr.reverse();
  reference.update(arr);

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), arr);

  reference.update([{ key: 'a', name: "Tom" }, { key: "b", name: "Stef "}]);

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), [{ key: 'a', name: "Tom" }, { key: "b", name: "Stef "}]);

  arr = arr.slice();
  arr.push({ key: "c", name: "Godhuda" });
  reference.update(arr);

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), arr);

  arr = arr.slice();
  arr.shift();
  reference.update(arr);

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), arr);
});
