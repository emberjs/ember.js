import { encodeImmediate, decodeImmediate, ImmediateConstants } from '..';

const { module, test } = QUnit;

module('immediate encoding tests', () => {
  test('it works', assert => {
    [ImmediateConstants.MIN_INT, -1, 0, ImmediateConstants.MAX_INT].forEach(val => {
      let encoded = encodeImmediate(val);

      assert.equal(val, decodeImmediate(encoded), 'correctly encoded and decoded');
      assert.ok(
        encoded >= ImmediateConstants.MIN_SMI && encoded <= ImmediateConstants.MAX_SMI,
        'encoded as an SMI'
      );
    });
  });
});
