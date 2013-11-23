require('ember-runtime/~tests/props_helper');

module('Ember.Object computed property');

testWithDefault('computed property on instance', function(get, set) {

  var MyClass = Ember.Object.extend({
    foo: Ember.computed(function() { return 'FOO'; })
  });

  equal(get(new MyClass(), 'foo'), 'FOO');

});


testWithDefault('computed property on subclass', function(get, set) {

  var MyClass = Ember.Object.extend({
    foo: Ember.computed(function() { return 'FOO'; })
  });

  var Subclass = MyClass.extend({
    foo: Ember.computed(function() { return 'BAR'; })
  });

  equal(get(new Subclass(), 'foo'), 'BAR');

});


testWithDefault('replacing computed property with regular val', function(get, set) {

  var MyClass = Ember.Object.extend({
    foo: Ember.computed(function() { return 'FOO'; })
  });

  var Subclass = MyClass.extend({
    foo: 'BAR'
  });

  equal(get(new Subclass(), 'foo'), 'BAR');

});

testWithDefault('complex depndent keys', function(get, set) {

  var MyClass = Ember.Object.extend({

    init: function() {
      this._super();
      set(this, 'bar', { baz: 'BIFF' });
    },

    count: 0,

    foo: Ember.computed(function() {
      set(this, 'count', get(this, 'count')+1);
      return Ember.get(get(this, 'bar'), 'baz') + ' ' + get(this, 'count');
    }).property('bar.baz')

  });

  var Subclass = MyClass.extend({
    count: 20
  });

  var obj1 = new MyClass(),
      obj2 = new Subclass();

  equal(get(obj1, 'foo'), 'BIFF 1');
  equal(get(obj2, 'foo'), 'BIFF 21');

  set(get(obj1, 'bar'), 'baz', 'BLARG');

  equal(get(obj1, 'foo'), 'BLARG 2');
  equal(get(obj2, 'foo'), 'BIFF 21');

  set(get(obj2, 'bar'), 'baz', 'BOOM');

  equal(get(obj1, 'foo'), 'BLARG 2');
  equal(get(obj2, 'foo'), 'BOOM 22');
});

testWithDefault('complex depndent keys changing complex dependent keys', function(get, set) {

  var MyClass = Ember.Object.extend({

    init: function() {
      this._super();
      set(this, 'bar', { baz: 'BIFF' });
    },

    count: 0,

    foo: Ember.computed(function() {
      set(this, 'count', get(this, 'count')+1);
      return Ember.get(get(this, 'bar'), 'baz') + ' ' + get(this, 'count');
    }).property('bar.baz')

  });

  var Subclass = MyClass.extend({

    init: function() {
      this._super();
      set(this, 'bar2', { baz: 'BIFF2' });
    },

    count: 0,

    foo: Ember.computed(function() {
      set(this, 'count', get(this, 'count')+1);
      return Ember.get(get(this, 'bar2'), 'baz') + ' ' + get(this, 'count');
    }).property('bar2.baz')
  });

  var obj2 = new Subclass();

  equal(get(obj2, 'foo'), 'BIFF2 1');

  set(get(obj2, 'bar'), 'baz', 'BLARG');
  equal(get(obj2, 'foo'), 'BIFF2 1', 'should not invalidate property');

  set(get(obj2, 'bar2'), 'baz', 'BLARG');
  equal(get(obj2, 'foo'), 'BLARG 2', 'should invalidate property');
});

test("can retrieve metadata for a computed property", function() {
  var get = Ember.get;

  var MyClass = Ember.Object.extend({
    computedProperty: Ember.computed(function() {
    }).meta({ key: 'keyValue' })
  });

  equal(get(MyClass.metaForProperty('computedProperty'), 'key'), 'keyValue', "metadata saved on the computed property can be retrieved");

  var ClassWithNoMetadata = Ember.Object.extend({
    computedProperty: Ember.computed(function() {
    }).volatile(),

    staticProperty: 12
  });

  equal(typeof ClassWithNoMetadata.metaForProperty('computedProperty'), "object", "returns empty hash if no metadata has been saved");

  expectAssertion(function() {
    ClassWithNoMetadata.metaForProperty('nonexistentProperty');
  }, "metaForProperty() could not find a computed property with key 'nonexistentProperty'.");

  expectAssertion(function() {
    ClassWithNoMetadata.metaForProperty('staticProperty');
  }, "metaForProperty() could not find a computed property with key 'staticProperty'.");
});

testBoth("can iterate over a list of computed properties for a class", function(get, set) {
  var MyClass = Ember.Object.extend({
    foo: Ember.computed(function() {

    }),

    fooDidChange: Ember.observer('foo', function() {

    }),

    bar: Ember.computed(function() {

    })
  });

  var SubClass = MyClass.extend({
    baz: Ember.computed(function() {

    })
  });

  SubClass.reopen({
    bat: Ember.computed(function() {

    }).meta({ iAmBat: true })
  });

  var list = [];

  MyClass.eachComputedProperty(function(name) {
    list.push(name);
  });

  deepEqual(list.sort(), ['bar', 'foo'], "watched and unwatched computed properties are iterated");

  list = [];

  SubClass.eachComputedProperty(function(name, meta) {
    list.push(name);

    if (name === 'bat') {
      deepEqual(meta, { iAmBat: true });
    } else {
      deepEqual(meta, {});
    }
  });

  deepEqual(list.sort(), ['bar', 'bat', 'baz', 'foo'], "all inherited properties are included");
});
