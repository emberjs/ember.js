/**
  DS.Model classes contain aliases for common methods that act on the default
  store. This file tests that those are operating correctly.
*/

var get = Ember.get;
var store, Person, findCalled;

module("Integration test - DS.Model class methods", {
  setup: function() {
    store = DS.Store.create({
      isDefaultStore: true
    });

    Person = DS.Model.extend({
      name: DS.attr('string')
    });
  },

  teardown: function() {
    store.destroy();
  }
});

test("the find method should be aliased", function() {
  expect(2);

  store.find = function(type, id) {
    equal(type, Person, "find called with correct type");
    equal(id, 1, "find called with correct arguments");
  };

  Person.find(1);
});

test("the filter method should be aliased", function() {
  expect(2);

  var filter = function() {};

  store.filter = function(type, passedFilter) {
    equal(type, Person, "filter called with correct type");
    equal(passedFilter, filter, "filter was called with correct arguments");
  };

  Person.filter(filter);
});

test("the create method should raise an exception", function() {
  raises(function() {
    Person.create();
  }, Ember.Error);
});

test("the createRecord method should be aliased", function() {
  expect(4);

  var hash = {};

  store = DS.Store.create({
    isDefaultStore: true,

    createRecord: function(type, passedHash, transaction) {
      equal(type, Person, "createRecord called with correct type");
      equal(hash, passedHash);

      return this._super(type, passedHash, transaction);
    }
  });

  var person = Person.createRecord(hash);

  equal(get(person, 'store'), store, "the store was set");
  equal(Person.detectInstance(person), true, "the person is an instance of Person");
});
