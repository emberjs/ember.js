import {Mixin} from 'ember-metal/mixin';

var toString = Object.prototype.toString;

test('without should create a new mixin excluding named properties', function() {

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

test('willMergeMixin should receive an array of without properties', function() {
  expect(2);

  var MixinA = Mixin.create({
    foo: 'FOO',
    bar: 'BAR'
  });

  var MixinB = MixinA.without('bar');

  var obj = {
    willMergeMixin: function (props, without) {
      equal(toString.call(without), '[object Array]');
      deepEqual(['bar'], without);
    }
  };

  MixinB.apply(obj);
});
