import { computed } from "ember-metal/computed";
import { get as emberGet } from "ember-metal/property_get";
import { observer } from "ember-metal/mixin";
import { testWithDefault } from "ember-metal/tests/props_helper";
import EmberObject from "ember-runtime/system/object";

function K() { return this; }

QUnit.module('EmberObject computed property');

testWithDefault('computed property on instance', function(get, set) {

  var MyClass = EmberObject.extend({
    foo: computed(function() { return 'FOO'; })
  });

  equal(get(new MyClass(), 'foo'), 'FOO');

});


testWithDefault('computed property on subclass', function(get, set) {

  var MyClass = EmberObject.extend({
    foo: computed(function() { return 'FOO'; })
  });

  var Subclass = MyClass.extend({
    foo: computed(function() { return 'BAR'; })
  });

  equal(get(new Subclass(), 'foo'), 'BAR');

});


testWithDefault('replacing computed property with regular val', function(get, set) {

  var MyClass = EmberObject.extend({
    foo: computed(function() { return 'FOO'; })
  });

  var Subclass = MyClass.extend({
    foo: 'BAR'
  });

  equal(get(new Subclass(), 'foo'), 'BAR');

});

testWithDefault('complex depndent keys', function(get, set) {

  var MyClass = EmberObject.extend({

    init: function() {
      this._super.apply(this, arguments);
      set(this, 'bar', { baz: 'BIFF' });
    },

    count: 0,

    foo: computed(function() {
      set(this, 'count', get(this, 'count')+1);
      return emberGet(get(this, 'bar'), 'baz') + ' ' + get(this, 'count');
    }).property('bar.baz')

  });

  var Subclass = MyClass.extend({
    count: 20
  });

  var obj1 = new MyClass();
  var obj2 = new Subclass();

  equal(get(obj1, 'foo'), 'BIFF 1');
  equal(get(obj2, 'foo'), 'BIFF 21');

  set(get(obj1, 'bar'), 'baz', 'BLARG');

  equal(get(obj1, 'foo'), 'BLARG 2');
  equal(get(obj2, 'foo'), 'BIFF 21');

  set(get(obj2, 'bar'), 'baz', 'BOOM');

  equal(get(obj1, 'foo'), 'BLARG 2');
  equal(get(obj2, 'foo'), 'BOOM 22');
});

testWithDefault('complex dependent keys changing complex dependent keys', function(get, set) {

  var MyClass = EmberObject.extend({

    init: function() {
      this._super.apply(this, arguments);
      set(this, 'bar', { baz: 'BIFF' });
    },

    count: 0,

    foo: computed(function() {
      set(this, 'count', get(this, 'count')+1);
      return emberGet(get(this, 'bar'), 'baz') + ' ' + get(this, 'count');
    }).property('bar.baz')

  });

  var Subclass = MyClass.extend({

    init: function() {
      this._super.apply(this, arguments);
      set(this, 'bar2', { baz: 'BIFF2' });
    },

    count: 0,

    foo: computed(function() {
      set(this, 'count', get(this, 'count')+1);
      return emberGet(get(this, 'bar2'), 'baz') + ' ' + get(this, 'count');
    }).property('bar2.baz')
  });

  var obj2 = new Subclass();

  equal(get(obj2, 'foo'), 'BIFF2 1');

  set(get(obj2, 'bar'), 'baz', 'BLARG');
  equal(get(obj2, 'foo'), 'BIFF2 1', 'should not invalidate property');

  set(get(obj2, 'bar2'), 'baz', 'BLARG');
  equal(get(obj2, 'foo'), 'BLARG 2', 'should invalidate property');
});

QUnit.test("can retrieve metadata for a computed property", function() {
  var MyClass = EmberObject.extend({
    computedProperty: computed(function() {
    }).meta({ key: 'keyValue' })
  });

  equal(emberGet(MyClass.metaForProperty('computedProperty'), 'key'), 'keyValue', "metadata saved on the computed property can be retrieved");

  var ClassWithNoMetadata = EmberObject.extend({
    computedProperty: computed(function() {
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

QUnit.test("can iterate over a list of computed properties for a class", function() {
  var MyClass = EmberObject.extend({
    foo: computed(function() {

    }),

    fooDidChange: observer('foo', function() {

    }),

    bar: computed(function() {

    })
  });

  var SubClass = MyClass.extend({
    baz: computed(function() {

    })
  });

  SubClass.reopen({
    bat: computed(function() {

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

QUnit.test("list of properties updates when an additional property is added (such cache busting)", function() {
  var MyClass = EmberObject.extend({
    foo: computed(K),

    fooDidChange: observer('foo', function() {

    }),

    bar: computed(K)
  });

  var list = [];

  MyClass.eachComputedProperty(function(name) {
    list.push(name);
  });

  deepEqual(list.sort(), ['bar', 'foo'].sort(), 'expected two computed properties');

  MyClass.reopen({
    baz: computed(K)
  });

  MyClass.create(); // force apply mixins

  list = [];

  MyClass.eachComputedProperty(function(name) {
    list.push(name);
  });

  deepEqual(list.sort(), ['bar', 'foo', 'baz'].sort(), 'expected three computed properties');
});
