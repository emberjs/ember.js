import { Mixin } from '../..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'without',
  class extends AbstractTestCase {
    ['@test without should create a new mixin excluding named properties'](
      assert
    ) {
      let MixinA = Mixin.create({
        foo: 'FOO',
        bar: 'BAR'
      });

      let MixinB = MixinA.without('bar');

      let obj = {};
      MixinB.apply(obj);

      assert.equal(obj.foo, 'FOO', 'should defined foo');
      assert.equal(obj.bar, undefined, 'should not define bar');
    }
  }
);
