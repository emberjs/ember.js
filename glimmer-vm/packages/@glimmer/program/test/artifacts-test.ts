import { artifacts } from '@glimmer/program';

QUnit.module('Artifacts Test');

QUnit.test('template metas are not not stringified and parsed', (assert) => {
  let { constants } = artifacts();

  let meta = {};
  let handle = constants.value(meta);
  assert.strictEqual(constants.getValue(handle), meta, 'Meta is not serialized');
});
