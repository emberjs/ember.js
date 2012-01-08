require('ember-data/adapters/rest_adapter');

var get = SC.get, set = SC.set;

var adapter, store, ajaxUrl, ajaxType, ajaxHash;
var Person, person;

module("the REST adapter", {
  setup: function() {
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

test("updating a person makes a PUT to /person/:id with the data hash", function() {
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

test("deleting a person makes a DELETE to /person/:id", function() {
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

  ajaxHash.success({ success: true });
  expectState('deleted');
});
