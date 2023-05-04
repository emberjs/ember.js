import { decodeImmediate, encodeImmediate, ImmediateConstants } from '..';

const { module, test } = QUnit;

module('immediate encoding tests', () => {
  // eslint-disable-next-line qunit/require-expect
  test('it works', (assert) => {
    [ImmediateConstants.MIN_INT, -1, 0, ImmediateConstants.MAX_INT].forEach((val) => {
      let encoded = encodeImmediate(val);

      assert.strictEqual(val, decodeImmediate(encoded), 'correctly encoded and decoded');
      const isSMI = encoded >= ImmediateConstants.MIN_SMI && encoded <= ImmediateConstants.MAX_SMI;
      assert.true(isSMI, 'encoded as an SMI');
    });
  });
});
