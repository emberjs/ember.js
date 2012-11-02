module('Mixin.detect');

test('detect() finds a directly applied mixin', function() {

  var MixinA = Ember.Mixin.create();
  var obj = {};

  equal(MixinA.detect(obj), false, 'MixinA.detect(obj) before apply()');

  MixinA.apply(obj);
  equal(MixinA.detect(obj), true, 'MixinA.detect(obj) after apply()');
});

test('detect() finds nested mixins', function() {
  var MixinA = Ember.Mixin.create({});
  var MixinB = Ember.Mixin.create(MixinA);
  var obj = {};

  equal(MixinA.detect(obj), false, 'MixinA.detect(obj) before apply()');

  MixinB.apply(obj);
  equal(MixinA.detect(obj), true, 'MixinA.detect(obj) after apply()');
});

test('detect() finds mixins on other mixins', function() {
  var MixinA = Ember.Mixin.create({});
  var MixinB = Ember.Mixin.create(MixinA);
  equal(MixinA.detect(MixinB), true, 'MixinA is part of MixinB');
  equal(MixinB.detect(MixinA), false, 'MixinB is not part of MixinA');
});

test('detect handles null values', function() {
  var MixinA = Ember.Mixin.create();
  equal(MixinA.detect(null), false);
});
