module('Ember.Mixin.prototype.didApply');

test('is called with the recipient after reopen', function() {
  var MixinA = Ember.Mixin.create({ foo: 'foo' }),
      appliedTo;

  MixinA.didApply = function(object) {
    appliedTo = object;
  };

  var obj = {};
  MixinA.reopen.call(obj, MixinA);

  equal(appliedTo, obj, 'didApply called with recipient of reopen');
});

test('is called in order, left to right', function() {
  var Foo = Ember.Mixin.create(),
      Bar = Ember.Mixin.create();

  Foo.didApply = function(object) { object.value = 'foo'; };
  Bar.didApply = function(object) { object.value = 'bar'; };

  var obj = {};
  Foo.reopen.call(obj, Foo, Bar);

  equal(Ember.get(obj, 'value'), 'bar', 'later mixins win over earlier');
});
