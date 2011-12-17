var get = SC.get, set = SC.set, getPath = SC.getPath;

module("DS.hasMany");

test("hasMany lazily loads associations as needed", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany(Tag)
  });

  var store = DS.Store.create();
  store.loadMany(Tag, [5, 2, 12], [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);
  store.load(Person, 1, { id: 1, name: "Tom Dale", tags: [5, 2] });

  var person = store.find(Person, 1);
  equals(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

  equals(getPath(person, 'tags.length'), 2, "the list of tags should have the correct length");
  equals(get(get(person, 'tags').objectAt(0), 'name'), "friendly", "the first tag should be a Tag");

  strictEqual(get(person, 'tags').objectAt(0), get(person, 'tags').objectAt(0), "the returned object is always the same");
  strictEqual(get(person, 'tags').objectAt(0), store.find(Tag, 5), "association objects are the same as objects retrieved directly");
});

test("associations work when the data hash has not been loaded", function() {
  expect(13);

  var Tag = DS.Model.extend({
    name: DS.attr('string'),
  });

  Tag.toString = function() { return "Tag"; }

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany(Tag),
  });

  Person.toString = function() { return "Person"; }

  var store = DS.Store.create({
    adapter: DS.Adapter.create({
      findMany: function(store, type, ids) {
        equal(type, Tag, "type should be Tag");
        deepEqual(ids, [5, 2], "ids should be 5 and 2");

        stop();

        setTimeout(function() {
          start();
          store.loadMany(type, ids, [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }]);

          equal(get(person, 'name'), "Tom Dale", "precond - the person is still Tom Dale");
          equal(getPath(person, 'tags.length'), 2, "the tags object still exists");
          equal(get(getPath(person, 'tags').objectAt(0), 'name'), "friendly", "Tom Dale is now friendly");
          equal(get(getPath(person, 'tags').objectAt(0), 'isLoaded'), true, "Tom Dale is now loaded");
        }, 1);
      },

      find: function(store, type, id) {
        equal(type, Person, "type should be Person");
        equal(id, 1, "id should be 1");

        stop();

        setTimeout(function() {
          start();
          store.load(type, id, { id: 1, name: "Tom Dale", tags: [5, 2] });

          equal(get(person, 'name'), "Tom Dale", "The person is now populated");
          equal(getPath(person, 'tags.length'), 2, "the tags Array already exists");
          equal(get(getPath(person, 'tags').objectAt(0), 'isLoaded'), false, "the tag objects exist, but are not yet loaded");
        }, 1);
      }
    })
  });

  var person = store.find(Person, 1);

  equal(get(person, 'isLoaded'), false, "isLoaded should be false");
  equal(getPath(person, 'tags.length'), 0, "tags should be empty");
});

test("embedded associations work the same as referenced ones, and have the same identity map functionality", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany(Tag, { embedded: true })
  });

  var store = DS.Store.create();
  store.load(Person, 1, { id: 1, name: "Tom Dale", tags: [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }] });

  var person = store.find(Person, 1);
  equals(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

  equals(getPath(person, 'tags.length'), 2, "the list of tags should have the correct length");
  equals(get(get(person, 'tags').objectAt(0), 'name'), "friendly", "the first tag should be a Tag");

  strictEqual(get(person, 'tags').objectAt(0), get(person, 'tags').objectAt(0), "the returned object is always the same");
  strictEqual(get(person, 'tags').objectAt(0), store.find(Tag, 5), "association objects are the same as objects retrieved directly");
});

test("updating the content of a ModelArray updates its content", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var store = DS.Store.create();
  var loaded = store.loadMany(Tag, [5, 2, 12], [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);

  var clientIds = loaded.clientIds;

  var tags = DS.ModelArray.create({ content: Ember.A([clientIds[0], clientIds[1]]), store: store, type: Tag });

  var tag = tags.objectAt(0);
  equal(get(tag, 'name'), "friendly", "precond - we're working with the right tags");

  set(tags, 'content', Ember.A([clientIds[1], clientIds[2]]));
  var tag = tags.objectAt(0);
  equal(get(tag, 'name'), "smarmy", "the lookup was updated");
});
