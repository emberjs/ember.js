/* eslint-disable import-x/no-extraneous-dependencies */

import { TrackedArray } from '@glimmer/validator';
import { expectTypeOf } from 'expect-type';

import { module, test } from '../-utils';

expectTypeOf<TrackedArray>().toMatchTypeOf<Array<unknown>>();

module('@glimmer/validator: TrackedArray', () => {
  test('Can get values on array directly', (assert) => {
    let arr = new TrackedArray(['foo']);

    assert.strictEqual(arr[0], 'foo');
  });

  test('Can get length on array directly', (assert) => {
    let arr = new TrackedArray(['foo']);

    assert.strictEqual(arr.length, 1);
  });

  test('Can set values on array directly', (assert) => {
    let arr = new TrackedArray();
    arr[0] = 123;

    assert.strictEqual(arr[0], 123);
  });

  test('Can set length on array directly', (assert) => {
    let arr = new TrackedArray();
    arr.length = 123;

    assert.strictEqual(arr.length, 123);
  });

  test('Can clear array by setting length to 0', (assert) => {
    let arr = new TrackedArray([123]);
    arr.length = 0;

    assert.strictEqual(arr.length, 0);
    assert.strictEqual(arr[0], undefined);
  });

  module('methods', () => {
    test('isArray', (assert) => {
      let arr = new TrackedArray();

      assert.ok(Array.isArray(arr));
    });

    test('length', (assert) => {
      let arr = new TrackedArray();

      assert.strictEqual(arr.length, 0);

      arr[100] = 1;

      assert.strictEqual(arr.length, 101);
    });

    test('concat', (assert) => {
      let arr = new TrackedArray();
      let arr2 = arr.concat([1], new TrackedArray([2]));

      assert.deepEqual(arr2, [1, 2]);
      assert.notOk(arr2 instanceof TrackedArray);
    });

    test('copyWithin', (assert) => {
      let arr = new TrackedArray([1, 2, 3]);
      arr.copyWithin(1, 0, 1);

      assert.deepEqual(arr, [1, 1, 3]);
    });

    test('entries', (assert) => {
      let arr = new TrackedArray([1, 2, 3]);
      let iter = arr.entries();

      assert.deepEqual(iter.next().value, [0, 1]);
      assert.deepEqual(iter.next().value, [1, 2]);
      assert.deepEqual(iter.next().value, [2, 3]);
      assert.true(iter.next().done);
    });

    test('every', (assert) => {
      let arr = new TrackedArray([1, 2, 3]);

      assert.ok(arr.every((v) => typeof v === 'number'));
      assert.notOk(arr.every((v) => v !== 2));
    });

    test('fill', (assert) => {
      let arr = new TrackedArray();
      arr.length = 100;
      arr.fill(123);

      let count = 0;
      let isCorrect = true;

      for (let value of arr) {
        count++;
        isCorrect = isCorrect && value === 123;
      }

      assert.strictEqual(count, 100);
      assert.ok(isCorrect);
    });

    test('filter', (assert) => {
      let arr = new TrackedArray([1, 2, 3]);
      let arr2 = arr.filter((v) => v > 1);

      assert.deepEqual(arr2, [2, 3]);
      assert.notOk(arr2 instanceof TrackedArray);
    });

    test('find', (assert) => {
      let arr = new TrackedArray([1, 2, 3]);

      assert.strictEqual(
        arr.find((v) => v > 1),
        2
      );
    });

    test('findIndex', (assert) => {
      let arr = new TrackedArray([1, 2, 3]);

      assert.strictEqual(
        arr.findIndex((v) => v > 1),
        1
      );
    });

    test('flat', (assert) => {
      let arr = new TrackedArray([1, 2, [3]]);

      assert.deepEqual(arr.flat(), [1, 2, 3]);
      assert.deepEqual(arr, [1, 2, [3]]);
    });

    test('flatMap', (assert) => {
      let arr = new TrackedArray([1, 2, [3]]);

      assert.deepEqual(
        arr.flatMap((v) => (typeof v === 'number' ? v + 1 : v)),
        [2, 3, 3]
      );
      assert.deepEqual(arr, [1, 2, [3]]);
    });

    test('forEach', (assert) => {
      let arr = new TrackedArray([1, 2, 3]);

      arr.forEach((v, i) => assert.strictEqual(v, i + 1));
    });

    test('includes', (assert) => {
      let arr = new TrackedArray([1, 2, 3]);

      assert.true(arr.includes(1));
      assert.false(arr.includes(5));
    });

    test('indexOf', (assert) => {
      let arr = new TrackedArray([1, 2, 1]);

      assert.strictEqual(arr.indexOf(1), 0);
      assert.strictEqual(arr.indexOf(5), -1);
    });

    test('join', (assert) => {
      let arr = new TrackedArray([1, 2, 3]);

      assert.strictEqual(arr.join(','), '1,2,3');
    });

    test('keys', (assert) => {
      let arr = new TrackedArray([1, 2, 3]);
      let iter = arr.keys();

      assert.strictEqual(iter.next().value, 0);
      assert.strictEqual(iter.next().value, 1);
      assert.strictEqual(iter.next().value, 2);
      assert.true(iter.next().done);
    });

    test('lastIndexOf', (assert) => {
      let arr = new TrackedArray([3, 2, 3]);

      assert.strictEqual(arr.lastIndexOf(3), 2);
      assert.strictEqual(arr.lastIndexOf(5), -1);
    });

    test('map', (assert) => {
      let arr = new TrackedArray([1, 2, 3]);
      let arr2 = arr.map((v) => v + 1);

      assert.deepEqual(arr2, [2, 3, 4]);
      assert.notOk(arr2 instanceof TrackedArray);
    });

    test('pop', (assert) => {
      let arr = new TrackedArray([1, 2, 3]);
      let val = arr.pop();

      assert.deepEqual(arr, [1, 2]);
      assert.strictEqual(val, 3);
    });

    test('push', (assert) => {
      let arr = new TrackedArray([1, 2, 3]);
      let val = arr.push(4);

      assert.deepEqual(arr, [1, 2, 3, 4]);
      assert.strictEqual(val, 4);
    });

    test('reduce', (assert) => {
      let arr = new TrackedArray([1, 2, 3]);

      assert.strictEqual(
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        arr.reduce((s, v) => s + v, ''),
        '123'
      );
    });

    test('reduceRight', (assert) => {
      let arr = new TrackedArray([1, 2, 3]);

      assert.strictEqual(
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        arr.reduceRight((s, v) => s + v, ''),
        '321'
      );
    });

    test('reverse', (assert) => {
      let arr = new TrackedArray([1, 2, 3]);
      arr.reverse();

      assert.deepEqual(arr, [3, 2, 1]);
    });

    test('shift', (assert) => {
      let arr = new TrackedArray([1, 2, 3]);
      let val = arr.shift();

      assert.deepEqual(arr, [2, 3]);
      assert.strictEqual(val, 1);
    });

    test('slice', (assert) => {
      let arr = new TrackedArray([1, 2, 3]);
      let arr2 = arr.slice();

      assert.notEqual(arr, arr2);
      assert.notOk(arr2 instanceof TrackedArray);
      assert.deepEqual(arr, arr2);
    });

    test('some', (assert) => {
      let arr = new TrackedArray([1, 2, 3]);

      assert.ok(arr.some((v) => v > 1));
      assert.notOk(arr.some((v) => v < 1));
    });

    test('sort', (assert) => {
      let arr = new TrackedArray([3, 1, 2]);
      let arr2 = arr.sort();

      assert.strictEqual(arr, arr2);
      assert.deepEqual(arr, [1, 2, 3]);
    });

    test('sort (with method)', (assert) => {
      let arr = new TrackedArray([3, 1, 2, 2]);
      let arr2 = arr.sort((a, b) => {
        if (a > b) return -1;
        if (a < b) return 1;
        return 0;
      });

      assert.strictEqual(arr, arr2);
      assert.deepEqual(arr, [3, 2, 2, 1]);
    });

    test('splice', (assert) => {
      let arr = new TrackedArray([1, 2, 3]);
      let arr2 = arr.splice(1, 1);

      assert.notOk(arr2 instanceof TrackedArray);
      assert.deepEqual(arr, [1, 3]);
      assert.deepEqual(arr2, [2]);
    });

    test('unshift', (assert) => {
      let arr = new TrackedArray([1, 2, 3]);
      let val = arr.unshift(0);

      assert.deepEqual(arr, [0, 1, 2, 3]);
      assert.strictEqual(val, 4);
    });

    test('values', (assert) => {
      let arr = new TrackedArray([1, 2, 3]);
      let iter = arr.values();

      assert.strictEqual(iter.next().value, 1);
      assert.strictEqual(iter.next().value, 2);
      assert.strictEqual(iter.next().value, 3);
      assert.true(iter.next().done);
    });

    test('of', (assert) => {
      let arr = TrackedArray.of(1, 2, 3);

      assert.deepEqual(arr, [1, 2, 3]);
    });

    test('from', (assert) => {
      let arr = TrackedArray.from([1, 2, 3]);

      assert.deepEqual(arr, [1, 2, 3]);
    });
  });
});
