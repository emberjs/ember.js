import {
  BasicReference,
  RevisionTag,
  AbstractIterable,
  Iterator,
  IterationItem,
  IterationArtifacts,
  ReferenceIterator,
  IteratorSynchronizer,
  IteratorSynchronizerDelegate,
  TagWrapper,
  CURRENT_TAG,
  END,
} from '@glimmer/reference';

import { UpdatableReference } from '@glimmer/object-reference';

import { Option, LinkedList, ListNode } from '@glimmer/util';

QUnit.module('Reference iterables');

type IteratorAction = 'retain' | 'append' | 'insert' | 'move' | 'delete';
type HistoryZip = [IteratorAction, any];
class Target implements IteratorSynchronizerDelegate<null> {
  private map = new Map<unknown, ListNode<BasicReference<unknown>>>();
  private list = new LinkedList<ListNode<BasicReference<unknown>>>();
  public tag = CURRENT_TAG;
  public history: HistoryZip[] = [];

  cleanHistory() {
    this.history = [];
  }

  serializeHistory() {
    return this.history.map((item: any) => item.join(':')).join(',');
  }

  get historyStats() {
    const stats = {
      retain: 0,
      append: 0,
      insert: 0,
      move: 0,
      delete: 0,
    };
    this.history.forEach(([key]: HistoryZip) => {
      stats[key]++;
    });
    return stats;
  }

  retain(_env: null, key: unknown, item: BasicReference<unknown>) {
    if (item !== this.map.get(key)!.value) {
      throw new Error('unstable reference');
    }
    this.history.push(['retain', key]);
  }

  done() {}

  append(key: unknown, item: BasicReference<unknown>) {
    let node = new ListNode(item);
    this.map.set(key, node);
    this.list.append(node);
    this.history.push(['append', key]);
  }

  insert(
    _env: null,
    key: unknown,
    item: BasicReference<unknown>,
    _: BasicReference<unknown>,
    before: unknown
  ) {
    let referenceNode = before === END ? null : this.map.get(before);
    let node = new ListNode(item);
    this.map.set(key, node);
    this.list.insertBefore(node, referenceNode);
    this.history.push(['insert', key]);
  }

  move(
    _env: null,
    key: unknown,
    item: BasicReference<unknown>,
    _: BasicReference<unknown>,
    before: unknown
  ) {
    let referenceNode = before === END ? null : this.map.get(before);
    let node = this.map.get(key)!;

    if (item !== node.value) {
      throw new Error('unstable reference');
    }

    this.list.remove(node);
    this.list.insertBefore(node, referenceNode);
    this.history.push(['move', key]);
  }

  delete(_env: null, key: string) {
    let node = this.map.get(key)!;
    this.map.delete(key);
    this.list.remove(node);
    this.history.push(['delete', key]);
  }

  toArray(): BasicReference<unknown>[] {
    return this.list.toArray().map(node => node.value);
  }

  toValues(): unknown[] {
    return this.toArray().map(ref => ref.value());
  }
}

interface TestItem {
  key: string;
  name: string;
}

class TestIterationItem implements IterationItem<unknown, unknown> {
  public key: string;
  public value: unknown;
  public memo: unknown;

  constructor(key: string, value: unknown, memo: unknown) {
    this.key = key;
    this.value = value;
    this.memo = memo;
  }
}

class TestIterator implements Iterator<unknown, unknown> {
  private array: TestItem[];
  private position = 0;

  constructor(array: TestItem[]) {
    this.array = array;
  }

  isEmpty(): boolean {
    return this.array.length === 0;
  }

  next(): Option<IterationItem<unknown, unknown>> {
    let { position, array } = this;

    if (position >= array.length) return null;

    let value = array[position];

    this.position++;

    return new TestIterationItem(value.key, value, position);
  }
}

class TestIterable
  implements
    AbstractIterable<
      unknown,
      unknown,
      IterationItem<unknown, unknown>,
      UpdatableReference<unknown>,
      UpdatableReference<unknown>
    > {
  public tag: TagWrapper<RevisionTag | null>;
  private arrayRef: UpdatableReference<TestItem[]>;

  constructor(arrayRef: UpdatableReference<TestItem[]>) {
    this.tag = arrayRef.tag;
    this.arrayRef = arrayRef;
  }

  iterate(): Iterator<unknown, unknown> {
    return new TestIterator(this.arrayRef.value());
  }

  valueReferenceFor(item: TestIterationItem): UpdatableReference<unknown> {
    return new UpdatableReference(item.value);
  }

  updateValueReference(reference: UpdatableReference<unknown>, item: TestIterationItem) {
    reference.update(item.value);
  }

  memoReferenceFor(item: TestIterationItem): UpdatableReference<unknown> {
    return new UpdatableReference(item.memo);
  }

  updateMemoReference(reference: UpdatableReference<unknown>, item: TestIterationItem) {
    reference.update(item.memo);
  }
}

function initialize(
  arr: TestItem[]
): { artifacts: IterationArtifacts; target: Target; reference: UpdatableReference<TestItem[]> } {
  let target = new Target();
  let reference = new UpdatableReference(arr);
  let iterator = new ReferenceIterator(new TestIterable(reference));
  let item;

  while ((item = iterator.next())) {
    target.append(item.key, item.value);
  }

  return { reference, target, artifacts: iterator.artifacts };
}

function shuffleArray(array: any) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function getInitialArray(length = 10, firstItem = 0, namePrefix = 'i-') {
  // Array.fill don't work in IE, going to Grow array manually.
  const result = [];
  for (let i = 0; i < length; i++) {
    result.push({
      key: String(i + firstItem),
      name: `${namePrefix}${String(i + firstItem)}`,
    });
  }
  return result;
}

function sync(target: Target, artifacts: IterationArtifacts) {
  let synchronizer = new IteratorSynchronizer({ target, artifacts, env: null });
  synchronizer.sync();
}

QUnit.test('They provide a sequence of references with keys', assert => {
  let arr = [{ key: 'a', name: 'Yehuda' }, { key: 'b', name: 'Godfrey' }];
  let { target } = initialize(arr);

  assert.deepEqual(target.toValues(), arr);
});

QUnit.test('When re-iterated via mutation, the original references are updated', assert => {
  let arr = [{ key: 'a', name: 'Yehuda' }, { key: 'b', name: 'Godfrey' }];
  let { target, artifacts } = initialize(arr);

  assert.deepEqual(target.toValues(), arr);

  arr.reverse();

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), arr);

  arr.push({ key: 'c', name: 'Godhuda' });

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), arr);

  arr.shift();

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), arr);
});

QUnit.test('When re-iterated via deep mutation, the original references are updated', assert => {
  let arr = [{ key: 'a', name: 'Yehuda' }, { key: 'b', name: 'Godfrey' }];
  let { target, artifacts } = initialize(arr);

  assert.deepEqual(target.toValues(), arr);

  arr[0].key = 'b';
  arr[0].name = 'Godfrey';
  arr[1].key = 'a';
  arr[1].name = 'Yehuda';

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), arr);

  arr[0].name = 'Yehuda';
  arr[1].name = 'Godfrey';

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), arr);

  arr.push({ key: 'c', name: 'Godhuda' });

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), arr);

  arr.shift();

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), arr);
});

QUnit.test('When re-iterated via replacement, the original references are updated', assert => {
  let arr = [{ key: 'a', name: 'Yehuda' }, { key: 'b', name: 'Godfrey' }];
  let { target, reference, artifacts } = initialize(arr);

  assert.deepEqual(target.toValues(), arr);

  arr = arr.slice();
  arr.reverse();
  reference.update(arr);

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), arr);

  reference.update([{ key: 'a', name: 'Tom' }, { key: 'b', name: 'Stef ' }]);

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), [{ key: 'a', name: 'Tom' }, { key: 'b', name: 'Stef ' }]);

  arr = arr.slice();
  arr.push({ key: 'c', name: 'Godhuda' });
  reference.update(arr);

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), arr);

  arr = arr.slice();
  arr.shift();
  reference.update(arr);

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), arr);
});

QUnit.test('When re-iterated via swap #1, the original references are updated', assert => {
  let arr = getInitialArray(8, 1, 'i-');
  let { target, reference, artifacts } = initialize(arr);
  assert.deepEqual(target.toValues(), arr);

  let a = arr[1];
  let b = arr[7];
  arr[7] = a;
  arr[1] = b;

  reference.update(arr);

  target.cleanHistory();
  sync(target, artifacts);

  assert.equal(
    target.serializeHistory(),
    'retain:1,move:8,retain:3,retain:4,retain:5,retain:6,retain:7,move:2'
  );
  assert.equal(target.historyStats.move, 2, 'moved nodes count');
  assert.equal(target.historyStats.retain, 6, 'retained nodes count');
  assert.deepEqual(target.toValues(), arr, 'the array is correct');
});

QUnit.test('When re-iterated via swap #2, the original references are updated', assert => {
  let arr = getInitialArray(8, 1, 'i-');
  let { target, reference, artifacts } = initialize(arr);
  assert.deepEqual(target.toValues(), arr);

  let a = arr[0];
  let b = arr[7];
  arr[7] = a;
  arr[0] = b;

  reference.update(arr);

  target.cleanHistory();
  sync(target, artifacts);

  assert.equal(
    target.serializeHistory(),
    'move:8,retain:2,retain:3,retain:4,retain:5,retain:6,retain:7,move:1',
    'has valid changeset history'
  );
  assert.equal(target.historyStats.move, 2, 'moved nodes count');
  assert.equal(target.historyStats.retain, 6, 'retained nodes count');
  assert.deepEqual(target.toValues(), arr);
});

QUnit.test('When re-iterated via swap #3, the original references are updated', assert => {
  let arr = getInitialArray(8, 1, 'i-');
  let { target, reference, artifacts } = initialize(arr);
  assert.deepEqual(target.toValues(), arr);

  let a = arr[0];
  let b = arr[6];
  arr[6] = a;
  arr[0] = b;

  reference.update(arr);

  target.cleanHistory();
  sync(target, artifacts);

  assert.equal(
    target.serializeHistory(),
    'move:7,retain:2,retain:3,retain:4,retain:5,retain:6,move:1,retain:8',
    'has valid changeset history'
  );
  assert.equal(target.historyStats.move, 2, 'moved nodes count');
  assert.equal(target.historyStats.retain, 6, 'retained nodes count');
  assert.deepEqual(target.toValues(), arr);
});

QUnit.test('When re-iterated via swap #4, the original references are updated', assert => {
  let arr = getInitialArray(8, 1, 'i-');
  let { target, reference, artifacts } = initialize(arr);
  assert.deepEqual(target.toValues(), arr);

  let a = arr[1];
  let b = arr[3];
  let c = arr[4];
  let d = arr[6];
  arr[6] = b;
  arr[4] = a;
  arr[3] = d;
  arr[1] = c;

  reference.update(arr);

  target.cleanHistory();
  sync(target, artifacts);

  assert.equal(
    target.serializeHistory(),
    'retain:1,move:5,retain:3,move:7,move:2,retain:6,move:4,retain:8',
    'has valid changeset history'
  );
  assert.equal(target.historyStats.move, 4, 'moved nodes count');
  assert.equal(target.historyStats.retain, 4, 'retained nodes count');
  assert.deepEqual(target.toValues(), arr);
});

QUnit.test('When re-iterated via swap #5, the original references are updated', assert => {
  let arr = getInitialArray(8, 1, 'i-');
  let { target, reference, artifacts } = initialize(arr);
  assert.deepEqual(target.toValues(), arr);

  let a = arr[1];
  let b = arr[3];
  arr[3] = a;
  arr[1] = b;
  arr.push({ key: '9', name: 'i-9' });

  reference.update(arr);

  target.cleanHistory();
  sync(target, artifacts);

  assert.equal(
    target.serializeHistory(),
    'retain:1,move:4,retain:3,move:2,retain:5,retain:6,retain:7,retain:8,insert:9',
    'has valid changeset history'
  );
  assert.equal(target.historyStats.move, 2, 'moved nodes count');
  assert.equal(target.historyStats.retain, 6, 'retained nodes count');
  assert.equal(target.historyStats.insert, 1, 'inserted nodes count');
  assert.deepEqual(target.toValues(), arr);
});

QUnit.test('When re-iterated via swap #6, the original references are updated', assert => {
  let arr = getInitialArray(8, 1, 'i-');
  let { target, reference, artifacts } = initialize(arr);
  assert.deepEqual(target.toValues(), arr);

  let a = arr[1];
  let b = arr[6];
  arr[6] = a;
  arr[1] = b;

  arr.splice(2, 0, { key: '9', name: 'i-9' });

  reference.update(arr);

  target.cleanHistory();
  sync(target, artifacts);

  assert.equal(
    target.serializeHistory(),
    'retain:1,move:7,insert:9,retain:3,retain:4,retain:5,retain:6,move:2,retain:8',
    'has valid changeset history'
  );
  assert.equal(target.historyStats.move, 2, 'moved nodes count');
  assert.equal(target.historyStats.retain, 6, 'retained nodes count');
  assert.equal(target.historyStats.insert, 1, 'inserted nodes count');
  assert.deepEqual(target.toValues(), arr);
});

QUnit.test('When re-iterated via swap #7, the original references are updated', assert => {
  let arr = getInitialArray(8, 1, 'i-');
  let { target, reference, artifacts } = initialize(arr);
  assert.deepEqual(target.toValues(), arr);

  arr.shift();
  arr.splice(2, 0, { key: '9', name: 'i-9' });

  reference.update(arr);

  target.cleanHistory();
  sync(target, artifacts);

  assert.equal(
    target.serializeHistory(),
    'retain:3,insert:9,retain:4,retain:5,retain:6,retain:7,retain:8,delete:1',
    'has valid changeset history'
  );
  assert.equal(target.historyStats.move, 0, 'moved nodes count');
  assert.equal(target.historyStats.retain, 6, 'retained nodes count');
  assert.equal(target.historyStats.insert, 1, 'inserted nodes count');
  assert.equal(target.historyStats.delete, 1, 'deleted nodes count');
  assert.deepEqual(target.toValues(), arr);
});

QUnit.test('When re-iterated via swap #8, the original references are updated', assert => {
  let arr = getInitialArray(8, 1, 'i-');
  let { target, reference, artifacts } = initialize(arr);
  assert.deepEqual(target.toValues(), arr);

  let shiftedArray = [arr[7], arr[0], arr[1], arr[2], arr[3], arr[4], arr[5], arr[6]];

  reference.update(shiftedArray);

  target.cleanHistory();
  sync(target, artifacts);

  assert.equal(
    target.serializeHistory(),
    'move:8,retain:2,retain:3,retain:4,retain:5,retain:6,retain:7',
    'has valid changeset history'
  );
  assert.equal(target.historyStats.move, 1, 'moved nodes count');
  assert.equal(target.historyStats.retain, 6, 'retained nodes count');
  assert.equal(target.historyStats.insert, 0, 'inserted nodes count');
  assert.equal(target.historyStats.delete, 0, 'deleted nodes count');
  assert.deepEqual(target.toValues(), shiftedArray);
});

QUnit.test('When re-iterated via swap #9, the original references are updated', assert => {
  let arr = getInitialArray(8, 1, 'i-');
  let { target, reference, artifacts } = initialize(arr);
  assert.deepEqual(target.toValues(), arr);

  let shiftedArray = [arr[1], arr[2], arr[3], arr[4], arr[5], arr[6], arr[7], arr[0]];

  reference.update(shiftedArray);

  target.cleanHistory();
  sync(target, artifacts);

  assert.equal(
    target.serializeHistory(),
    'retain:3,retain:4,retain:5,retain:6,retain:7,retain:8,move:1',
    'has valid changeset history'
  );
  assert.equal(target.historyStats.move, 1, 'moved nodes count');
  assert.equal(target.historyStats.retain, 6, 'retained nodes count');
  assert.equal(target.historyStats.insert, 0, 'inserted nodes count');
  assert.equal(target.historyStats.delete, 0, 'deleted nodes count');
  assert.deepEqual(target.toValues(), shiftedArray);
});

QUnit.test('When re-iterated via swap #10, the original references are updated', assert => {
  let arr = getInitialArray(8, 1, 'i-');
  let { target, reference, artifacts } = initialize(arr);
  assert.deepEqual(target.toValues(), arr);

  for (let i = 0; i < 1000; i++) {
    shuffleArray(arr);
    reference.update(arr);
    target.cleanHistory();
    sync(target, artifacts);
    let history = target.historyStats;
    const changedNodes = history.move + history.retain;
    assert.equal(changedNodes <= arr.length, true, target.serializeHistory());
    assert.equal(history.insert, 0, 'inserted nodes count');
    assert.equal(history.delete, 0, 'deleted nodes count');
    assert.deepEqual(target.toValues(), arr);
  }
});

QUnit.test('When re-iterated via swap #11, the original references are updated', assert => {
  let arr = getInitialArray(8, 1, 'i-');
  let { target, reference, artifacts } = initialize(arr);
  assert.deepEqual(target.toValues(), arr);

  for (let i = 0; i < 1000; i++) {
    let newArr = arr.slice();
    shuffleArray(newArr);
    let semiArr = newArr.slice(0, 5);
    reference.update(semiArr);
    target.cleanHistory();
    sync(target, artifacts);
    let history = target.historyStats;
    const changedNodes = history.move + history.retain;
    assert.equal(changedNodes <= arr.length, true, target.serializeHistory());
    assert.equal(history.insert <= 3, true, 'inserted nodes count');
    assert.equal(history.delete <= 3, true, 'deleted nodes count');
    assert.deepEqual(target.toValues(), semiArr);
  }
});

QUnit.test('When re-iterated via swap #12, the original references are updated', assert => {
  let arr = getInitialArray(8, 1, 'i-');
  let { target, reference, artifacts } = initialize(arr);
  assert.deepEqual(target.toValues(), arr);

  for (let i = 0; i < 1000; i++) {
    let newArr = arr.slice(0);
    shuffleArray(newArr);
    let semiArr = [].concat(
      newArr.slice(0, 5) as any,
      [{ key: '11', name: 'i-11' }, { key: '12', name: 'i-12' }] as any
    );
    reference.update(semiArr);
    target.cleanHistory();
    sync(target, artifacts);
    let history = target.historyStats;
    const changedNodes = history.move + history.retain + history.insert + history.delete;
    assert.equal(changedNodes <= semiArr.length + 3, true, target.serializeHistory());
    assert.equal(history.insert <= 3, true, 'inserted nodes count');
    assert.equal(history.delete <= 3, true, 'deleted nodes count');
    assert.deepEqual(target.toValues(), semiArr);
  }
});
