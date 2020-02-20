import {
  AbstractIterable,
  Iterator,
  IterationItem,
  IterationArtifacts,
  UpdatableRootReference,
} from '..';
import { Tag } from '@glimmer/validator';

import { Option } from '@glimmer/util';

import {
  initialize as utilInitialize,
  sync,
  shuffleArray,
  getInitialArray,
  Target,
} from './utils/iterator';

QUnit.module('Reference iterables');

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
      UpdatableRootReference<unknown>,
      UpdatableRootReference<unknown>
    > {
  public tag: Tag;
  private arrayRef: UpdatableRootReference<TestItem[]>;

  constructor(arrayRef: UpdatableRootReference<TestItem[]>) {
    this.tag = arrayRef.tag;
    this.arrayRef = arrayRef;
  }

  iterate(): Iterator<unknown, unknown> {
    return new TestIterator(this.arrayRef.value());
  }

  valueReferenceFor(item: TestIterationItem): UpdatableRootReference<unknown> {
    return new UpdatableRootReference(item.value);
  }

  updateValueReference(reference: UpdatableRootReference<unknown>, item: TestIterationItem) {
    reference.update(item.value);
  }

  memoReferenceFor(item: TestIterationItem): UpdatableRootReference<unknown> {
    return new UpdatableRootReference(item.memo);
  }

  updateMemoReference(reference: UpdatableRootReference<unknown>, item: TestIterationItem) {
    reference.update(item.memo);
  }
}

function initialize(
  arr: TestItem[]
): {
  artifacts: IterationArtifacts;
  target: Target;
  reference: UpdatableRootReference<TestItem[]>;
} {
  let reference = new UpdatableRootReference(arr);
  let iterable = new TestIterable(reference);
  let { target, artifacts } = utilInitialize(iterable);

  return { reference, target, artifacts };
}

QUnit.test('They provide a sequence of references with keys', assert => {
  let arr = [
    { key: 'a', name: 'Yehuda' },
    { key: 'b', name: 'Godfrey' },
  ];
  let { target } = initialize(arr);

  assert.deepEqual(target.toValues(), arr);
});

QUnit.test('When re-iterated via mutation, the original references are updated', assert => {
  let arr = [
    { key: 'a', name: 'Yehuda' },
    { key: 'b', name: 'Godfrey' },
  ];
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
  let arr = [
    { key: 'a', name: 'Yehuda' },
    { key: 'b', name: 'Godfrey' },
  ];
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
  let arr = [
    { key: 'a', name: 'Yehuda' },
    { key: 'b', name: 'Godfrey' },
  ];
  let { target, reference, artifacts } = initialize(arr);

  assert.deepEqual(target.toValues(), arr);

  arr = arr.slice();
  arr.reverse();
  reference.update(arr);

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), arr);

  reference.update([
    { key: 'a', name: 'Tom' },
    { key: 'b', name: 'Stef ' },
  ]);

  sync(target, artifacts);

  assert.deepEqual(target.toValues(), [
    { key: 'a', name: 'Tom' },
    { key: 'b', name: 'Stef ' },
  ]);

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
      [
        { key: '11', name: 'i-11' },
        { key: '12', name: 'i-12' },
      ] as any
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
