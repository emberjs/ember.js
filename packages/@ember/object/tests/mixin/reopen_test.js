import { get } from '@ember/object';
import Mixin from '@ember/object/mixin';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Mixin#reopen',
  class extends AbstractTestCase {
    ['@test using reopen() to add more properties to a simple'](assert) {
      let MixinA = Mixin.create({ foo: 'FOO', baz: 'BAZ' });
      MixinA.reopen({ bar: 'BAR', foo: 'FOO2' });
      let obj = {};
      MixinA.apply(obj);

      assert.equal(get(obj, 'foo'), 'FOO2', 'mixin() should override');
      assert.equal(get(obj, 'baz'), 'BAZ', 'preserve MixinA props');
      assert.equal(get(obj, 'bar'), 'BAR', 'include MixinB props');
    }
  }
);
