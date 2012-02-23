/*global Tag App*/

var get = Ember.get, set = Ember.set, getPath = Ember.getPath;

module("DS.Model");

test("exposes a hash of the associations on a model", function() {
  var Occupation = DS.Model.extend();

  var Person = DS.Model.extend({
    occupations: DS.hasMany(Occupation)
  });

  Person.reopen({
    people: DS.hasMany(Person),
    parent: DS.hasOne(Person)
  });

  var associations = get(Person, 'associations');
  deepEqual(associations.get(Person), [
    { name: "people", kind: "hasMany" },
    { name: "parent", kind: "belongsTo" }
  ]);

  deepEqual(associations.get(Occupation), [
    { name: "occupations", kind: "hasMany" }
  ]);
});

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
  store.load(Person, 2, { id: 2, name: "Yehuda Katz", tags: [12] });

  var person = store.find(Person, 1);
  equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

  equal(getPath(person, 'tags.length'), 2, "the list of tags should have the correct length");
  equal(get(get(person, 'tags').objectAt(0), 'name'), "friendly", "the first tag should be a Tag");

  strictEqual(get(person, 'tags').objectAt(0), get(person, 'tags').objectAt(0), "the returned object is always the same");
  strictEqual(get(person, 'tags').objectAt(0), store.find(Tag, 5), "association objects are the same as objects retrieved directly");

  var wycats = store.find(Person, 2);
  equal(get(wycats, 'name'), "Yehuda Katz", "precond - retrieves person record from store");

  equal(getPath(wycats, 'tags.length'), 1, "the list of tags should have the correct length");
  equal(get(get(wycats, 'tags').objectAt(0), 'name'), "oohlala", "the first tag should be a Tag");

  strictEqual(get(wycats, 'tags').objectAt(0), get(wycats, 'tags').objectAt(0), "the returned object is always the same");
  strictEqual(get(wycats, 'tags').objectAt(0), store.find(Tag, 12), "association objects are the same as objects retrieved directly");
});

test("should be able to retrieve the type for a hasMany association from its metadata", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany(Tag)
  });

  equal(Person.typeForAssociation('tags'), Tag, "returns the association type");
});

test("should be able to retrieve the type for a hasMany association specified using a string from its metadata", function() {
  window.Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('Tag')
  });

  equal(Person.typeForAssociation('tags'), Tag, "returns the association type");
});

test("should be able to retrieve the type for a hasOne association from its metadata", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasOne(Tag)
  });

  equal(Person.typeForAssociation('tags'), Tag, "returns the association type");
});

test("should be able to retrieve the type for a hasOne association specified using a string from its metadata", function() {
  window.Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasOne('Tag')
  });

  equal(Person.typeForAssociation('tags'), Tag, "returns the association type");
});

test("hasMany allows associations to be mapped to a user-specified key", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany(Tag, { key: 'tag_ids' })
  });

  var store = DS.Store.create();
  store.loadMany(Tag, [5, 2, 8], [
    { id: 5, name: 'curmudgeon' },
    { id: 2, name: 'cuddly' },
    { id: 8, name: 'drunk' }
  ]);
  store.load(Person, 1, { id: 1, name: 'Carsten Nielsen', tag_ids: [2, 8] });

  var person = store.find(Person, 1);
  equal(get(person, 'name'), "Carsten Nielsen", "precond - retrieves person record from store");
  equal(getPath(person, 'tags.length'), 2, "the list of tags should have the correct length");
  equal(get(get(person, 'tags').objectAt(0), 'name'), "cuddly", "the first tag should be a Tag");

  strictEqual(get(person, 'tags').objectAt(0), get(person, 'tags').objectAt(0), "the returned object is always the same");
  strictEqual(get(person, 'tags').objectAt(0), store.find(Tag, 2), "association objects are the same as objects retrieved directly");
});

test("associations work when declared with a string path", function() {
  window.App = {};

  App.Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('App.Tag')
  });

  App.Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var store = DS.Store.create();
  store.loadMany(App.Tag, [5, 2, 12], [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);
  store.load(App.Person, 1, { id: 1, name: "Tom Dale", tags: [5, 2] });

  var person = store.find(App.Person, 1);
  equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

  equal(getPath(person, 'tags.length'), 2, "the list of tags should have the correct length");
});

test("associations work when the data hash has not been loaded", function() {
  expect(13);

  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  Tag.toString = function() { return "Tag"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany(Tag)
  });

  Person.toString = function() { return "Person"; };

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
  equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

  equal(getPath(person, 'tags.length'), 2, "the list of tags should have the correct length");
  equal(get(get(person, 'tags').objectAt(0), 'name'), "friendly", "the first tag should be a Tag");

  strictEqual(get(person, 'tags').objectAt(0), get(person, 'tags').objectAt(0), "the returned object is always the same");
  strictEqual(get(person, 'tags').objectAt(0), store.find(Tag, 5), "association objects are the same as objects retrieved directly");
});

test("it is possible to add a new item to an association", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany(Tag)
  });

  var store = DS.Store.create();

  store.load(Person, { id: 1, name: "Tom Dale", tags: [ 1 ] });
  store.load(Tag, { id: 1, name: "ember" });

  var person = store.find(Person, 1);
  var tag = get(person, 'tags').objectAt(0);

  equal(get(tag, 'name'), "ember", "precond - associations work");

  tag = store.createRecord(Tag, { name: "js" });
  get(person, 'tags').pushObject(tag);

  equal(get(person, 'tags').objectAt(1), tag, "newly added association works");
});

test("it is possible to remove an item from an association", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany(Tag)
  });

  var store = DS.Store.create();

  store.load(Person, { id: 1, name: "Tom Dale", tags: [ 1 ] });
  store.load(Tag, { id: 1, name: "ember" });

  var person = store.find(Person, 1);
  var tag = get(person, 'tags').objectAt(0);

  equal(get(tag, 'name'), "ember", "precond - associations work");

  get(person, 'tags').removeObject(tag);

  equal(getPath(person, 'tags.length'), 0, "object is removed from the association");
});

module("ModelArray");

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
  tag = tags.objectAt(0);
  equal(get(tag, 'name'), "smarmy", "the lookup was updated");
});

module("DS.hasOne");

test("hasOne lazily loads associations as needed", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.hasOne(Tag)
  });

  var store = DS.Store.create();
  store.loadMany(Tag, [5, 2, 12], [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);
  store.load(Person, 1, { id: 1, name: "Tom Dale", tag: 5 });

  var person = store.find(Person, 1);
  equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

  equal(get(person, 'tag') instanceof Tag, true, "the tag property should return a tag");
  equal(getPath(person, 'tag.name'), "friendly", "the tag shuld have name");

  strictEqual(get(person, 'tag'), get(person, 'tag'), "the returned object is always the same");
  strictEqual(get(person, 'tag'), store.find(Tag, 5), "association object is the same as object retrieved directly");
});

test("hasOne allows associations to be mapped to a user-specified key", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.hasOne(Tag, { key: 'tag_id' })
  });

  var store = DS.Store.create();
  store.loadMany(Tag, [5, 2, 8], [
    { id: 5, name: 'curmudgeon' },
    { id: 2, name: 'cuddly' },
    { id: 8, name: 'drunk' }
  ]);
  store.load(Person, 1, { id: 1, name: 'Carsten Nielsen', tag_id: 2 });

  var person = store.find(Person, 1);
  equal(get(person, 'name'), "Carsten Nielsen", "precond - retrieves person record from store");
  equal(getPath(person, 'tag.name'), "cuddly", "the tag should be a Tag");

  strictEqual(get(person, 'tag'), get(person, 'tag'), "the returned object is always the same");
  strictEqual(get(person, 'tag'), store.find(Tag, 2), "association object are the same as object retrieved directly");
});

test("associations work when the data hash has not been loaded", function() {
  expect(12);

  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.hasOne(Tag)
  });

  var store = DS.Store.create({
    adapter: DS.Adapter.create({
      find: function(store, type, id) {
        if (type === Person) {
          equal(type, Person, "type should be Person");
          equal(id, 1, "id should be 1");

          stop();

          setTimeout(function() {
            start();
            store.load(type, id, { id: 1, name: "Tom Dale", tag: 2 });

            equal(get(person, 'name'), "Tom Dale", "The person is now populated");
            equal(get(person, 'tag') instanceof Tag, true, "the tag Model already exists");
            equal(getPath(person, 'tag.isLoaded'), false, "the tag objects exist, but are not yet loaded");
          }, 1);
        } else if (type === Tag) {
          equal(type, Tag, "type should be Tag");
          equal(id, 2, "id should be 2");

          stop();

          setTimeout(function() {
            start();
            store.load(type, 2, { id: 2, name: "friendly" });

            equal(get(person, 'name'), "Tom Dale", "precond - the person is still Tom Dale");
            equal(getPath(person, 'tag.name'), "friendly", "Tom Dale is now friendly");
            equal(getPath(person, 'tag.isLoaded'), true, "Tom Dale is now loaded");
          }, 1);
        }
      }
    })
  });

  var person = store.find(Person, 1);

  equal(get(person, 'isLoaded'), false, "isLoaded should be false");
  equal(get(person, 'tag'), null, "tag should be null");
});

test("hasOne embedded associations work the same as referenced ones, and have the same identity map functionality", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.hasOne(Tag, { embedded: true })
  });

  var store = DS.Store.create();
  store.load(Person, 1, { id: 1, name: "Tom Dale", tag: { id: 5, name: "friendly" } });

  var person = store.find(Person, 1);
  equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

  equal(getPath(person, 'tag.name'), "friendly", "the first tag should be a Tag");

  strictEqual(get(person, 'tag'), get(person, 'tag'), "the returned object is always the same");
  strictEqual(get(person, 'tag'), store.find(Tag, 5), "association object are the same as object retrieved directly");
});
