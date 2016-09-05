import { SuiteModuleBuilder } from '../suite';
import { Freezable } from '../../../mixins/freezable';
import { get } from 'ember-metal';

const suite = SuiteModuleBuilder.create();

suite.module('frozenCopy');

suite.test('frozen objects should return same instance', function() {
  let obj, copy;

  obj = this.newObject();
  if (get(this, 'shouldBeFreezable')) {
    expectDeprecation('`frozenCopy` is deprecated, use Object.freeze instead.');

    ok(!Freezable || Freezable.detect(obj), 'object should be freezable');

    copy = obj.frozenCopy();
    ok(this.isEqual(obj, copy), 'new copy should be equal');
    ok(get(copy, 'isFrozen'), 'returned value should be frozen');

    copy = obj.freeze().frozenCopy();
    equal(copy, obj, 'returns frozen object should be same');
    ok(get(copy, 'isFrozen'), 'returned object should be frozen');
  } else {
    ok(!Freezable || !Freezable.detect(obj), 'object should not be freezable');
  }
});

export default suite;
