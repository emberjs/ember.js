module('system/object/subclasses');

test('chains should copy forward to subclasses when prototype created', function () {
  var ObjectWithChains, objWithChains, SubWithChains, SubSub, subSub;
  Ember.run(function () {
    ObjectWithChains = Ember.Object.extend({
      obj: {
        a: 'a',
        hi: 'hi'
      },
      aBinding: 'obj.a' // add chain
    });
    // realize prototype
    objWithChains = ObjectWithChains.create();
    // should not copy chains from parent yet
    SubWithChains = ObjectWithChains.extend({
      hiBinding: 'obj.hi', // add chain
      hello: Ember.computed(function() {
        return this.get('obj.hi') + ' world';
      }).property('hi').volatile(), // observe chain
      greetingBinding: 'hello'
    });
    SubSub = SubWithChains.extend();
    // should realize prototypes and copy forward chains
    subSub = SubSub.create();
  });
  equal(subSub.get('greeting'), 'hi world');
  Ember.run(function () {
    objWithChains.set('obj.hi', 'hello');
  });
  equal(subSub.get('greeting'), 'hello world');
});
