var get = Ember.get;

module('Ember.Mixin Computed Properties');

test('overriding computed properties', function() {
  var MixinA, MixinB, MixinC, MixinD;
  var obj;

  MixinA = Ember.Mixin.create({
    aProp: Ember.computed(function() {
      return 'A';
    })
  });

  MixinB = Ember.Mixin.create(MixinA, {
    aProp: Ember.computed(function() {
      return this._super()+'B';
    })
  });

  MixinC = Ember.Mixin.create(MixinA, {
    aProp: Ember.computed(function() {
      return this._super()+'C';
    })
  });

  MixinD = Ember.Mixin.create({
    aProp: Ember.computed(function() {
      return this._super()+'D';
    })
  });

  obj = {};
  MixinB.apply(obj);
  equal(get(obj, 'aProp'), 'AB', "should expose super for B");

  obj = {};
  MixinC.apply(obj);
  equal(get(obj, 'aProp'), 'AC', "should expose super for C");

  obj = {};

  MixinA.apply(obj);
  MixinD.apply(obj);
  equal(get(obj, 'aProp'), 'AD', "should define super for D");

  obj = { };
  Ember.defineProperty(obj, 'aProp', Ember.computed(function(key, value) {
    return 'obj';
  }));
  MixinD.apply(obj);
  equal(get(obj, 'aProp'), "objD", "should preserve original computed property");
});
