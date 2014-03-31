import {Mixin} from 'ember-metal/mixin';

test('without should create a new mixin excluding named properties - DEPRECATED', function() {

  var MixinA = Mixin.create({
        foo: 'FOO',
        bar: 'BAR'
      }),
      MixinB;

  expectDeprecation(function(){
    MixinB = MixinA.without('bar');
  }, /Mixin#without will be removed/);

  var obj = {};
  MixinB.apply(obj);

  equal(obj.foo, 'FOO', 'should defined foo');
  equal(obj.bar, undefined, 'should not define bar');

});
