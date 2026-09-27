import EmberObject, { get } from '@ember/object';
import Mixin from '@ember/object/mixin';
import { run } from '@ember/runloop';
import { moduleFor, AbstractTestCase, expectDeprecation, testUnless } from 'internal-test-helpers';
import { DEPRECATIONS } from '../../../-internals/deprecations';

moduleFor(
  'Mixin#reopen',
  class extends AbstractTestCase {
    [`${testUnless(DEPRECATIONS.DEPRECATE_MIXINS.isRemoved)} @test using reopen() to add more properties to a simple`](
      assert
    ) {
      expectDeprecation(/Using mixins is deprecated/, DEPRECATIONS.DEPRECATE_MIXINS.isEnabled);

      let MixinA = Mixin.create({ foo: 'FOO', baz: 'BAZ' });
      MixinA.reopen({ bar: 'BAR', foo: 'FOO2' });
      let obj = {};
      MixinA.apply(obj);

      assert.equal(get(obj, 'foo'), 'FOO2', 'mixin() should override');
      assert.equal(get(obj, 'baz'), 'BAZ', 'preserve MixinA props');
      assert.equal(get(obj, 'bar'), 'BAR', 'include MixinB props');
    }

    ['@test using reopen() and calling _super where there is not a super function does not cause infinite recursion'](
      assert
    ) {
      let Taco = class extends EmberObject {
        createBreakfast() {
          // There is no original createBreakfast function.
          // Calling the wrapped _super function here
          // used to end in an infinite call loop
          this._super(...arguments);
          return 'Breakfast!';
        }
      };

      Taco.reopen({
        createBreakfast() {
          return this._super(...arguments);
        },
      });

      let taco = Taco.create();

      let result;
      run(() => {
        try {
          result = taco.createBreakfast();
        } catch {
          result = 'Your breakfast was interrupted by an infinite stack error.';
        }
      });

      assert.equal(result, 'Breakfast!');
    }
  }
);
