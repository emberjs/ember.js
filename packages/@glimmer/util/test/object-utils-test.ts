import { assign } from '@glimmer/util';

QUnit.module('object-utils tests');

QUnit.test('assign should ignore null/undefined arguments', (assert) => {
  let result = assign({}, { foo: 'bar' }, null, undefined, { derp: 'herk' });

  assert.deepEqual(result, { foo: 'bar', derp: 'herk' }, 'has correct result');
});
