/*globals setup */

test('without should create a new mixin excluding named properties', function() {

  var MixinA = Ember.Mixin.create({
    foo: 'FOO',
    bar: 'BAR'
  });

  var MixinB = MixinA.without('bar');

  var obj = {};
  MixinB.apply(obj);

  equal(obj.foo, 'FOO', 'should defined foo');
  equal(obj.bar, undefined, 'should not define bar');

});
