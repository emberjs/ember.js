import { Mixin } from 'ember-metal/mixin';

QUnit.module('Mixin.detect');

QUnit.test('detect() finds a directly applied mixin', function() {
  var MixinA = Mixin.create();
  var obj = {};

  equal(MixinA.detect(obj), false, 'MixinA.detect(obj) before apply()');

  MixinA.apply(obj);
  equal(MixinA.detect(obj), true, 'MixinA.detect(obj) after apply()');
});

QUnit.test('detect() finds nested mixins', function() {
  var MixinA = Mixin.create({});
  var MixinB = Mixin.create(MixinA);
  var obj = {};

  equal(MixinA.detect(obj), false, 'MixinA.detect(obj) before apply()');

  MixinB.apply(obj);
  equal(MixinA.detect(obj), true, 'MixinA.detect(obj) after apply()');
});

QUnit.test('detect() finds mixins on other mixins', function() {
  var MixinA = Mixin.create({});
  var MixinB = Mixin.create(MixinA);
  equal(MixinA.detect(MixinB), true, 'MixinA is part of MixinB');
  equal(MixinB.detect(MixinA), false, 'MixinB is not part of MixinA');
});

QUnit.test('detect handles null values', function() {
  var MixinA = Mixin.create();
  equal(MixinA.detect(null), false);
});
