import EmberObject, { Mixin } from 'glimmer-object';
import { get } from './support';

QUnit.module('Mixin#reopen');

QUnit.test('using reopen() to add more properties to a simple', function() {
  let MixinA = Mixin.create({ foo: 'FOO', baz: 'BAZ' });
  MixinA.reopen({ bar: 'BAR', foo: 'FOO2' });
  let obj = {};
  MixinA.apply(obj);

  equal(get(obj, 'foo'), 'FOO2', 'mixin() should override');
  equal(get(obj, 'baz'), 'BAZ', 'preserve MixinA props');
  equal(get(obj, 'bar'), 'BAR', 'include MixinB props');
});

QUnit.test('using reopen() and calling _super where there is not a super function does not cause infinite recursion', function() {
  let Taco = EmberObject.extend({
    createBreakfast() {
      // There is no original createBreakfast function.
      // Calling the wrapped _super function here
      // used to end in an infinite call loop
      this._super.apply(this, arguments);
      return 'Breakfast!';
    }
  });

  Taco.reopen({
    createBreakfast() {
      return this._super.apply(this, arguments);
    }
  });

  let taco: any = Taco.create();

  let result;
  try {
    result = taco.createBreakfast();
  } catch(e) {
    result = 'Your breakfast was interrupted by an infinite stack error.';
    throw e;
  }

  equal(result, 'Breakfast!');
});
