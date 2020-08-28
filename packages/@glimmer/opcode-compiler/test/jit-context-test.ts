import { JitContext } from '..';

QUnit.module('Jit Context Test');

QUnit.test('Jit template metas are not not stringified and parsed', (assert) => {
  let context = JitContext();

  let { constants } = context.program;

  let meta = {};
  let handle = constants.value(meta);
  assert.equal(constants.getValue(handle), meta, 'Meta is not serialized');
});
