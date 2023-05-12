import { decodeImmediate, encodeImmediate, ImmediateConstants } from '@glimmer/util';

const { module, test } = QUnit;

module('immediate encoding tests', () => {
  test('it works', (assert) => {
    let cases = [ImmediateConstants.MIN_INT, -1, 0, ImmediateConstants.MAX_INT];

    for (const val of cases) {
      let encoded = encodeImmediate(val);

      assert.strictEqual(val, decodeImmediate(encoded), 'correctly encoded and decoded');
      const isSMI = encoded >= ImmediateConstants.MIN_SMI && encoded <= ImmediateConstants.MAX_SMI;
      assert.true(isSMI, 'encoded as an SMI');
      assert.step(`testing ${val}`);
    }

    assert.verifySteps(cases.map((val) => `testing ${val}`));
  });
});
