import { Mixin } from 'ember-metal/mixin';

QUnit.test('without should create a new mixin excluding named properties', function() {

  var MixinA = Mixin.create({
    foo: 'FOO',
    bar: 'BAR'
  });

  var MixinB = MixinA.without('bar');

  var obj = {};
  MixinB.apply(obj);

  equal(obj.foo, 'FOO', 'should defined foo');
  equal(obj.bar, undefined, 'should not define bar');

});
