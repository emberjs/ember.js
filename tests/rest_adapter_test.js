require('ember-data/adapters/rest_adapter');

var get = SC.get, set = SC.set;

var adapter, store, ajaxUrl, ajaxType, ajaxHash;
var Person, person;

module("the REST adapter", {
  setup: function() {
    ajaxUrl = undefined;
    ajaxType = undefined;
    ajaxHash = undefined;

    adapter = DS.RESTAdapter.create({
      ajax: function(url, type, hash) {
        ajaxUrl = url;
        ajaxType = type;
        ajaxHash = hash;
      },

      plurals: {
        person: 'people'
      }
    });

    store = DS.Store.create({
      adapter: adapter
    });

    Person = DS.Model.extend()
    Person.toString = function() {
      return "App.Person";
    }
  },

  teardown: function() {
    adapter.destroy();
    store.destroy();
    person.destroy();
  }
});

var expectUrl = function(url, desc) {
  equal(url, ajaxUrl, "the URL is " + desc);
};

var expectType = function(type) {
  equal(type, ajaxType, "the HTTP method is " + type);
};

var expectData = function(hash) {
  deepEqual(hash, ajaxHash.data, "the hash was passed along");
};

var expectState = function(state, value) {
  if (value === undefined) { value = true; }

  var flag = "is" + state.charAt(0).toUpperCase() + state.substr(1);
 equal(get(person, flag), value, "the person is " + (value === false ? "not " : "") + state);
}

test("creating a person makes a POST to /people, with the data hash", function() {
  person = store.createRecord(Person, { name: "Tom Dale" });

  expectState('new');
  store.commit();
  expectState('saving');

  expectUrl("/people", "the collection at the plural of the model name");
  expectType("POST");
  expectData({ person: { name: "Tom Dale" } });

  ajaxHash.success({ person: { id: 1, name: "Tom Dale" } });
  expectState('saving', false);

  equal(person, store.find(Person, 1), "it is now possible to retrieve the person by the ID supplied");
});

test("updating a person makes a PUT to /people/:id with the data hash", function() {
  store.load(Person, { id: 1, name: "Yehuda Katz" });

  person = store.find(Person, 1);

  expectState('new', false);
  expectState('loaded');
  expectState('dirty', false);

  set(person, 'name', "Brohuda Brokatz");

  expectState('dirty');
  store.commit();
  expectState('saving');

  expectUrl("/people/1", "the plural of the model name with its ID");
  expectType("PUT");

  ajaxHash.success({ person: { id: 1, name: "Brohuda Brokatz" } });
  expectState('saving', false);

  equal(person, store.find(Person, 1), "the same person is retrieved by the same ID");
});

test("deleting a person makes a DELETE to /people/:id", function() {
  store.load(Person, { id: 1, name: "Tom Dale" });

  person = store.find(Person, 1);

  expectState('new', false);
  expectState('loaded');
  expectState('dirty', false);

  person.deleteRecord();

  expectState('dirty');
  expectState('deleted');
  store.commit();
  expectState('saving');

  expectUrl("/people/1", "the plural of the model name with its ID");
  expectType("DELETE");

  ajaxHash.success({ success: true });
  expectState('deleted');
});

test("finding a person by ID makes a GET to /people/:id", function() {
  person = store.find(Person, 1);

  expectState('loaded', false);
  expectUrl("/people/1", "the plural of the model name with the ID requested");
  expectType("GET");

  ajaxHash.success({ person: { id: 1, name: "Yehuda Katz" } });

  expectState('loaded');
  expectState('dirty', false);

  equal(person, store.find(Person, 1), "the record is now in the store, and can be looked up by ID without another Ajax request");
});

test("finding many people by a list of IDs", function() {
  var Group = DS.Model.extend({
    people: DS.hasMany(Person)
  });

  store.load(Group, { id: 1, people: [ 1, 2, 3 ] });

  var group = store.find(Group, 1);

  equal(ajaxUrl, undefined, "no Ajax calls have been made yet");

  var people = get(group, 'people');

  equal(get(people, 'length'), 3, "there are three people in the association already");

  people.forEach(function(person) {
    equal(get(person, 'isLoaded'), false, "the person is being loaded");
  });

  expectUrl("/people");
  expectType("GET");
  expectData({ ids: [ 1, 2, 3 ] });

  ajaxHash.success({
    people: [
      { id: 1, name: "Rein Heinrichs" },
      { id: 2, name: "Tom Dale" },
      { id: 3, name: "Yehuda Katz" }
    ]
  });

  var rein = people.objectAt(0);
  equal(get(rein, 'name'), "Rein Heinrichs");
  equal(get(rein, 'id'), 1);

  var tom = people.objectAt(1);
  equal(get(tom, 'name'), "Tom Dale");
  equal(get(tom, 'id'), 2);

  var yehuda = people.objectAt(2);
  equal(get(yehuda, 'name'), "Yehuda Katz");
  equal(get(yehuda, 'id'), 3);

  people.forEach(function(person) {
    equal(get(person, 'isLoaded'), true, "the person is being loaded");
  });
});

test("finding people by a query", function() {
  var people = store.find(Person, { page: 1 });

  equal(get(people, 'length'), 0, "there are no people yet, as the query has not returned");

  expectUrl("/people", "the collection at the plural of the model name");
  expectType("GET");
  expectData({ page: 1 });

  ajaxHash.success({
    people: [
      { id: 1, name: "Rein Heinrichs" },
      { id: 2, name: "Tom Dale" },
      { id: 3, name: "Yehuda Katz" }
    ]
  });

  equal(get(people, 'length'), 3, "the people are now loaded");

  var rein = people.objectAt(0);
  equal(get(rein, 'name'), "Rein Heinrichs");
  equal(get(rein, 'id'), 1);

  var tom = people.objectAt(1);
  equal(get(tom, 'name'), "Tom Dale");
  equal(get(tom, 'id'), 2);

  var yehuda = people.objectAt(2);
  equal(get(yehuda, 'name'), "Yehuda Katz");
  equal(get(yehuda, 'id'), 3);

  people.forEach(function(person) {
    equal(get(person, 'isLoaded'), true, "the person is being loaded");
  });
});
