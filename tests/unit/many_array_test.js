var get = Ember.get, set = Ember.set;
var store, Group, Person;

module("DS.ManyArray", {
  setup: function() {
    store = DS.Store.create();

    Person = DS.Model.extend();
    Person.toString = function() { return "Person"; };
    Group = DS.Model.extend({
      people: DS.hasMany(Person)
    });
    Group.toString = function() { return "Group"; };

    Person.reopen({
      group: DS.belongsTo(Group)
    });
  },

  teardown: function() {
    store.destroy();
  }
});

test("if a record is created, its association's isDirty is false", function() {
  var group = store.createRecord(Group);
  var people = get(group, 'people');

  equal(get(people, 'isDirty'), false, "the association should not be dirty");
});

test("if a record is loaded from the server, its association's isDirty is false", function() {
  store.load(Group, { id: 1, people: [ 1, 2 ] });   
  store.loadMany(Person, [{ id: 1 }, { id: 2 }]);

  var group = store.find(Group, 1);
  var people = get(group, 'people');

  equal(get(people, 'isDirty'), false, "the association is not isDirty");
});

test("if an association has existing records added to it, its isDirty is true", function() {
  store.load(Group, { id: 1, people: [ 1, 2 ] });   
  store.loadMany(Person, [{ id: 1 }, { id: 2 }, { id: 3 }]);

  var group = store.find(Group, 1);
  var people = get(group, 'people');
  var person = store.find(Person, 3);

  equal(get(people, 'length'), 2, "precond - association has two items");

  people.pushObject(person);

  equal(get(people, 'isDirty'), true, "the association becomes dirty after a record is added");
  equal(get(people, 'length'), 3, "the length of the association has increased");
});

test("if an association has newly created records added to it, its isDirty is true", function() {
  store.load(Group, { id: 1, people: [ 1, 2 ] });   
  store.loadMany(Person, [{ id: 1 }, { id: 2 }, { id: 3 }]);

  var group = store.find(Group, 1);
  var people = get(group, 'people');
  var person = store.createRecord(Person, {});

  equal(get(people, 'length'), 2, "precond - association has two items");

  people.pushObject(person);

  equal(get(people, 'isDirty'), true, "the association becomes dirty after a record is added");
  equal(get(people, 'length'), 3, "the length of the association has increased");
});

test("if an association has records removed from it, its isDirty is true", function() {
  store.load(Group, { id: 1, people: [ 1, 2 ] });   
  store.loadMany(Person, [{ id: 1 }, { id: 2 }, { id: 3 }]);

  var group = store.find(Group, 1);
  var people = get(group, 'people');
  var person = store.find(Person, 2);

  people.removeObject(person);

  equal(get(people, 'isDirty'), true, "the association becomes dirty after a record is removed");
  equal(get(people, 'length'), 1, "the length of the association has decreased");
});

test("if an association's added and removed records are persisted, its isDirty is false", function() {
  store.set('adapter', DS.Adapter.create({
    createRecord: function(store, type, record) {
      store.didCreateRecord(record, { id: 77 });
    },

    updateRecord: function(store, type, record) {
      store.didUpdateRecord(record);
    },

    deleteRecord: function(store, type, record) {
      store.didDeleteRecord(record);
    }
  }));

  store.load(Group, { id: 1, people: [ 1, 2 ] });   
  store.loadMany(Person, [{ id: 1 }, { id: 2 }, { id: 3 }]);

  var group = store.find(Group, 1);
  var people = get(group, 'people');
  var person = store.createRecord(Person, {});
  var person2 = store.find(Person, 2);
  var person3 = store.find(Person, 3);

  people.pushObject(person);
  people.removeObject(person2);
  people.pushObject(person3);

  equal(get(people, 'isDirty'), true, "the association becomes dirty after a record is added and a record is removed");

  equal(get(person3, 'isDirty'), true, "precond - person 3 is dirty");

  Ember.run(function() {
    store.commit();
  });

  equal(get(person3, 'isDirty'), false, "precond - person 3 is clean");
  equal(get(people, 'isDirty'), false, "the association becomes clean after records are committed");
});

