import {
  Reference,
  UpdatableReference,
  AbstractIterable,
  Iterator,
  IterationItem,
  IterationArtifacts,
  ReferenceIterator,
  IteratorSynchronizer,
  IteratorSynchronizerDelegate
} from 'glimmer-reference';
import { Opaque, LinkedList, ListNode, dict } from 'glimmer-util';

QUnit.module("Reference iterables");

class Target implements IteratorSynchronizerDelegate {
  private map = dict<ListNode<Reference<any>>>();
  private list = new LinkedList<ListNode<Reference<any>>>();

  retain(key: string, item: Reference<any>) {
    if (item !== this.map[key].value) {
      throw new Error("unstable reference");
    }
  }

  done() {}

  append(key: string, item: Reference<any>) {
    let node = this.map[key] = new ListNode(item);
    this.list.append(node);
  }

  insert(key: string, item: Reference<any>, before: string) {
    let referenceNode = before ? this.map[before] : null;
    let node = this.map[key] = new ListNode(item);
    this.list.insertBefore(node, referenceNode);
  }

  move(key: string, item: Reference<any>, before: string) {
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

  toArray(): Reference<any>[] {
    return this.list.toArray().map(node => node.value);
  }

  toValues(): any[] {
    return this.toArray().map(ref => ref.value());
  }
}

interface TestItem {
  key: string;
  name: string;
}

class TestIterationItem implements IterationItem<Opaque> {
  public key: string;
  public value: Opaque;

  constructor(key: string, value: any) {
    this.key = key;
    this.value = value;
  }
}

class TestIterator implements Iterator<Opaque> {
  private array: TestItem[];
  private position = 0;

  constructor(array: TestItem[]) {
    this.array = array;
  }

  isEmpty(): boolean {
    return this.array.length === 0;
  }

  next(): IterationItem<Opaque> {
    let { position, array } = this;

    if (position >= array.length) return null;

    let value = array[position];

    this.position++;

    return new TestIterationItem(value.key, value);
  }
}

class TestIterable implements AbstractIterable<Opaque, IterationItem<Opaque>, UpdatableReference<Opaque>> {
  private arrayRef: UpdatableReference<TestItem[]>;

  constructor(arrayRef: UpdatableReference<TestItem[]>) {
    this.arrayRef = arrayRef;
  }

  iterate(): TestIterator {
    return new TestIterator(this.arrayRef.value());
  }

  referenceFor(item: TestIterationItem): UpdatableReference<Opaque> {
    return new UpdatableReference(item.value);
  }

  updateReference(reference: UpdatableReference<Opaque>, item: TestIterationItem) {
    reference.update(item.value);
  }
}

function initialize(arr: TestItem[]): { artifacts: IterationArtifacts, target: Target, reference: UpdatableReference<TestItem[]> } {
  let target = new Target();
  let reference = new UpdatableReference(arr);
  let iterator = new ReferenceIterator(new TestIterable(reference));
  let item: IterationItem<Reference<Opaque>>;

  while (item = iterator.next()) {
    target.append(item.key, item.value);
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
