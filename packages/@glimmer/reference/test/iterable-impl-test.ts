import { module, test } from './utils/qunit';

import { IterableImpl, IterationArtifacts, UpdatableRootReference } from '..';
import { symbol } from '@glimmer/util';

import { initialize as utilInitialize, sync, Target } from './utils/iterator';

import { TestEnv } from './utils/template';
import objectValues from './utils/platform';

function initialize(
  arr: unknown,
  key = '@identity',
  env = new TestEnv()
): {
  artifacts: IterationArtifacts;
  target: Target;
  reference: UpdatableRootReference<unknown>;
} {
  let reference = new UpdatableRootReference(arr);
  let iterable = new IterableImpl(reference, key, env);
  let { target, artifacts } = utilInitialize(iterable);

  return { reference, target, artifacts };
}

module('@glimmer/reference: IterableImpl', () => {
  module('native arrays', () => {
    test('it correctly iterates native arrays', assert => {
      let arr = [{ key: 'a', name: 'Yehuda' }, { key: 'b', name: 'Godfrey' }];
      let { target } = initialize(arr);

      assert.deepEqual(target.toValues(), arr);
    });

    test('it correctly synchronizes native arrays when changed', assert => {
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
  });

  module('iterator delegates', () => {
    test('it correctly iterates delegates', assert => {
      let obj = { a: 'Yehuda', b: 'Godfrey' };
      let { target } = initialize(obj);

      assert.deepEqual(target.toValues(), objectValues(obj));
    });

    test('it correctly synchronizes delegates when changed', assert => {
      let obj = { a: 'Yehuda', b: 'Godfrey' } as any;
      let { target, artifacts } = initialize(obj);

      assert.deepEqual(target.toValues(), objectValues(obj));

      obj.c = 'Rob';

      sync(target, artifacts);

      assert.deepEqual(target.toValues(), objectValues(obj));

      obj.a = 'Godhuda';

      sync(target, artifacts);

      assert.deepEqual(target.toValues(), objectValues(obj));
    });

    test('it handles null delegates', assert => {
      // Passing null will return an empty iterator
      let { target } = initialize(null);

      assert.deepEqual(target.toValues(), []);
    });
  });

  module('keys', () => {
    test('@identity works', assert => {
      let arr = [{ key: 'a', name: 'Yehuda' }, { key: 'b', name: 'Godfrey' }];
      let { target } = initialize(arr);

      assert.deepEqual(target.toKeys(), arr);
    });

    test('@identity works with multiple values that are the same', assert => {
      let yehuda = { key: 'a', name: 'Yehuda' };
      let godfrey = { key: 'b', name: 'Godfrey' };
      let arr = [yehuda, godfrey, godfrey];

      let { target, artifacts } = initialize(arr);

      let keys1 = target.toKeys();

      assert.equal(keys1.length, 3);
      assert.equal(keys1[0], yehuda);
      assert.equal(keys1[1], godfrey);

      arr.pop();
      arr.unshift(godfrey);

      sync(target, artifacts);

      let keys2 = target.toKeys();

      assert.equal(keys2.length, 3);
      assert.equal(keys2[0], godfrey);
      assert.equal(keys2[1], yehuda);

      // Test that a unique key was created and is used consistently
      assert.equal(keys1[2], keys2[2]);
    });

    test('@identity works with primitives (except null)', assert => {
      let arr = [undefined, 123, 'foo', symbol('bar'), true];
      let { target } = initialize(arr);

      assert.deepEqual(target.toValues(), arr);
      assert.deepEqual(target.toKeys(), arr);
    });

    test('@identity works with null', assert => {
      let arr: any[] = [null];
      let { target, artifacts } = initialize(arr);

      let keys1 = target.toKeys();

      arr.unshift(undefined);
      sync(target, artifacts);

      let keys2 = target.toKeys();

      assert.equal(keys1[0], keys2[1]);
    });

    test('@key works', assert => {
      let arr = [{ key: 'a', name: 'Yehuda' }, { key: 'b', name: 'Godfrey' }];
      let { target } = initialize(arr, '@key');

      assert.deepEqual(target.toKeys(), [0, 1]);
    });

    test('@index works', assert => {
      let arr = [{ key: 'a', name: 'Yehuda' }, { key: 'b', name: 'Godfrey' }];
      let { target } = initialize(arr, '@index');

      assert.deepEqual(target.toKeys(), ['0', '1']);
    });

    test('paths work', assert => {
      let arr = [{ key: 'a', name: 'Yehuda' }, { key: 'b', name: 'Godfrey' }];
      let { target } = initialize(arr, 'key');

      assert.deepEqual(target.toKeys(), ['a', 'b']);
    });
  });
});
