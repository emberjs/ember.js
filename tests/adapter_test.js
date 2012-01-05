/**
 This is an integration test that tests the communication between a store
 and its adapter.

 Typically, when a method is invoked on the store, it calls a related
 method on its adapter. The adapter notifies the store that it has
 completed the assigned task, either synchronously or asynchronously,
 by calling a method on the store.

 These tests ensure that the proper methods get called, and, if applicable,
 the given model or model array changes state appropriately.
*/

var get = SC.get, set = SC.set, getPath = SC.getPath;
var Person, store, adapter;

module("DS.Adapter", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: DS.attr('string')
    });

    adapter = DS.Adapter.create();
    store = DS.Store.create({ adapter: adapter });
  }
});

test("when a single record is requested, the adapter's find method is called unless it's loaded", function() {
  expect(2);

  var count = 0;

  adapter.find = function(store, type, id) {
    equals(type, Person, "the find method is called with the correct type");
    equals(count, 0, "the find method is only called once");

    store.load(type, id, { id: 1, name: "Braaaahm Dale" });

    count++;
  };

  store.find(Person, 1);
  store.find(Person, 1);
});

test("when multiple models are requested, the adapter's findMany method is called", function() {
  expect(1);

  adapter.findMany = function(store, type, ids) {
    deepEqual(ids, [1,2,3], "ids are passed");
  };

  store.findMany(Person, [1,2,3]);
  store.findMany(Person, [1,2,3]);
});

test("when multiple models are requested, the adapter's find method is called multiple times if findMany is not implemented", function() {
  expect(3);

  var count = 0;
  adapter.find = function(store, type, id) {
    count++;

    equal(id, count);
  };

  store.findMany(Person, [1,2,3]);
  store.findMany(Person, [1,2,3]);
});

test("when many records are requested with query parameters, the adapter's findQuery method is called", function() {
  expect(6);
  adapter.findQuery = function(store, type, query, modelArray) {
    equal(type, Person, "the find method is called with the correct type");

    stop();

    setTimeout(function() {
      modelArray.load([{ id: 1, name: "Peter Wagenet" }, { id: 2, name: "Brohuda Katz" }]);
      start();
    }, 100);
  };

  var array = store.find(Person, { page: 1 });
  equal(get(array, 'length'), 0, "The array is 0 length do far");

  array.addArrayObserver(this, {
    willChange: function(target, start, removed, added) {
      equal(removed, 0, "0 items are being removed");
    },

    didChange: function(target, start, removed, added) {
      equal(added, 2, "2 items are being added");

      equal(get(array, 'length'), 2, "The array is now populated");
      equal(get(array.objectAt(0), 'name'), "Peter Wagenet", "The array is populated correctly");
    }
  });
});

test("when all records for a type are requested, the adapter's findAll method is called", function() {
  expect(2);

  adapter.findAll = function(store, type) {
    stop();

    setTimeout(function() {
      start();

      store.load(type, { id: 1, name: "Braaaahm Dale" });
      equal(get(array, 'length'), 1, "The array is now 1 length");
    }, 100);
  };

  var array = store.findAll(Person);
  equal(get(array, 'length'), 0, "The array is 0 length do far");
});

test("when a store is committed, the adapter's commit method is called with updates", function() {
  expect(2);

  adapter.commit = function(store, records) {
    records.updated.eachType(function(type, array) {
      equal(type, Person, "the type is correct");
      equal(get(array, 'length'), 1, "the array is the right length");
      store.didUpdateModels(array);
    });
  };

  store.load(Person, { id: 1, name: "Braaaahm Dale" });
  var tom = store.find(Person, 1);

  set(tom, "name", "Tom Dale");

  store.commit();

  // there is nothing to commit, so eachType won't do anything
  store.commit();
});

test("when a store is committed, the adapter's commit method is called with creates", function() {
  expect(3);

  adapter.commit = function(store, records) {
    records.updated.eachType(function() {
      ok(false, "updated should not be populated");
    });

    records.created.eachType(function(type, array) {
      equal(type, Person, "the type is correct");
      equal(get(array, 'length'), 1, "the array is the right length");
      store.didCreateModels(Person, array, [{ id: 1, name: "Tom Dale" }]);
    });
  };

  var tom = store.createRecord(Person, { name: "Tom Dale" });

  store.commit();

  equal(tom, store.find(Person, 1), "Once an ID is in, find returns the same object");

  store.commit();
});

test("when a store is committed, the adapter's commit method is called with deletes", function() {
  expect(3);

  adapter.commit = function(store, records) {
    records.updated.eachType(function() {
      ok(false, "updated should not be populated");
    });

    records.created.eachType(function() {
      ok(false, "updated should not be populated");
    });

    records.deleted.eachType(function(type, array) {
      equal(type, Person, "the type is correct");
      equal(get(array, 'length'), 1, "the array is the right length");
      store.didDeleteModels(array);
    });
  };

  store.load(Person, { id: 1, name: "Tom Dale" });
  var tom = store.find(Person, 1);

  tom.deleteRecord();
  store.commit();

  equal(get(tom, 'isDeleted'), true, "model is marked as deleted");
});

test("by default, commit calls createRecords once per type", function() {
  expect(6);

  adapter.createRecords = function(store, type, array) {
    equal(type, Person, "the type is correct");
    equal(get(array, 'length'), 2, "the array is the right length");
    var records = [{ id: 1, name: "Tom Dale", updatedAt: 'right nao' }, { id: 2, name: "Yehuda Katz" }];
    store.didCreateModels(Person, array, records);
  };

  var tom = store.createRecord(Person, { name: "Tom Dale", updatedAt: null });
  var yehuda = store.createRecord(Person, { name: "Yehuda Katz" });

  var callCount = 0;
  tom.addObserver('updatedAt', function() {
    callCount++;
    equal(get(tom, 'updatedAt'), 'right nao', "property returned from adapter is updated");
  });

  store.commit();
  equal(callCount, 1, "calls observer on the model when it has been changed");

  equal(tom, store.find(Person, 1), "Once an ID is in, find returns the same object");
  equal(yehuda, store.find(Person, 2), "Once an ID is in, find returns the same object");
  store.commit();
});

test("by default, commit calls updateRecords once per type", function() {
  expect(9);

  adapter.updateRecords = function(store, type, array) {
    equal(type, Person, "the type is correct");
    equal(get(array, 'length'), 2, "the array is the right length");

    array.forEach(function(item) {
      equal(get(item, 'isSaving'), true, "the item is saving");
    });

    store.didUpdateModels(array);

    array.forEach(function(item) {
      equal(get(item, 'isSaving'), false, "the item is no longer saving");
      equal(get(item, 'isLoaded'), true, "the item is loaded");
    });
  };

  store.load(Person, { id: 1, name: "Braaaahm Dale" });
  store.load(Person, { id: 2, name: "Gentile Katz" });

  var tom = store.find(Person, 1);
  var yehuda = store.find(Person, 2);

  set(tom, "name", "Tom Dale");
  set(yehuda, "name", "Yehuda Katz");

  store.commit();

  equal(get(store.find(Person, 2), "name"), "Yehuda Katz", "model was updated");

  // there is nothing to commit, so eachType won't do anything
  store.commit();
});

test("updateRecords can return an array of Hashes to update the store with", function() {
  expect(8);

  adapter.updateRecords = function(store, type, array) {
    equal(type, Person, "the type is correct");
    equal(get(array, 'length'), 2, "the array is the right length");

    store.didUpdateModels(array, [ { id: 1, name: "Tom Dale", updatedAt: "now" }, { id: 2, name: "Yehuda Katz", updatedAt: "now!" } ]);

    equal(get(array[0], 'updatedAt'), "now", "the data was inserted");
    equal(get(array[1], 'updatedAt'), "now!", "the data was inserted");
    equal(get(array[0], 'isDirty'), false, "the object is not dirty");
    equal(get(array[1], 'isDirty'), false, "the object is not dirty");
  };

  store.load(Person, { id: 1, name: "Braaaahm Dale" });
  store.load(Person, { id: 2, name: "Gentile Katz" });

  var tom = store.find(Person, 1);
  var yehuda = store.find(Person, 2);

  set(tom, "name", "Tom Dale");
  set(yehuda, "name", "Yehuda Katz");

  store.commit();

  equal(get(store.find(Person, 1), "name"), "Tom Dale", "model was updated");
  equal(get(store.find(Person, 2), "name"), "Yehuda Katz", "model was updated");

  // there is nothing to commit, so eachType won't do anything
  store.commit();
});

test("by default, commit calls deleteRecords once per type", function() {
  expect(4);

  adapter.deleteRecords = function(store, type, array) {
    equal(type, Person, "the type is correct");
    equal(get(array, 'length'), 2, "the array is the right length");
    store.didDeleteModels(array);
  };

  store.load(Person, { id: 1, name: "Braaaahm Dale" });
  store.load(Person, { id: 2, name: "Gentile Katz" });

  var tom = store.find(Person, 1);
  var yehuda = store.find(Person, 2);

  tom.deleteRecord();
  yehuda.deleteRecord();
  store.commit();

  ok(get(tom, 'isDeleted'), "model is marked as deleted");
  ok(!get(tom, 'isDirty'), "model is marked as not being dirty");

  // there is nothing to commit, so eachType won't do anything
  store.commit();
});

test("by default, createRecords calls create once per record", function() {
  expect(8);
  var count = 1;

  adapter.createRecord = function(store, type, model) {
    equal(type, Person, "the type is correct");

    if (count === 1) {
      equal(get(model, 'name'), "Tom Dale");
    } else if (count === 2) {
      equal(get(model, 'name'), "Yehuda Katz");
    } else {
      ok(false, "should not have invoked more than 2 times");
    }

    var hash = get(model, 'data');
    hash.id = count;
    hash.updatedAt = "now";

    store.didCreateModel(model, hash);
    equal(get(model, 'updatedAt'), "now", "the model should receive the new information");

    count++;
  };

  var tom = store.createRecord(Person, { name: "Tom Dale" });
  var yehuda = store.createRecord(Person, { name: "Yehuda Katz" });

  store.commit();
  equal(tom, store.find(Person, 1), "Once an ID is in, find returns the same object");
  equal(yehuda, store.find(Person, 2), "Once an ID is in, find returns the same object");
  store.commit();
});

test("by default, updateRecords calls updateRecord once per record", function() {
  expect(10);

  var count = 0;

  adapter.updateRecord = function(store, type, model) {
    equal(type, Person, "the type is correct");

    if (count === 0) {
      equal(get(model, 'name'), "Tom Dale");
    } else if (count === 1) {
      equal(get(model, 'name'), "Yehuda Katz");
    } else {
      ok(false, "should not get here");
    }

    count++;

    equal(model.get('isSaving'), true, "model is saving");

    store.didUpdateModel(model);

    equal(model.get('isSaving'), false, "model is no longer saving");
    equal(model.get('isLoaded'), true, "model is saving");
  };

  store.load(Person, { id: 1, name: "Braaaahm Dale" });
  store.load(Person, { id: 2, name: "Brohuda Katz" });

  var tom = store.find(Person, 1);
  var yehuda = store.find(Person, 2);

  set(tom, "name", "Tom Dale");
  set(yehuda, "name", "Yehuda Katz");

  store.commit();

  // there is nothing to commit, so eachType won't do anything
  store.commit();
});

test("calling store.didUpdateModel can provide an optional hash", function() {
  expect(8);

  var count = 0;

  adapter.updateRecord = function(store, type, model) {
    equal(type, Person, "the type is correct");

    if (count === 0) {
      equal(get(model, 'name'), "Tom Dale");
      store.didUpdateModel(model, { id: 1, name: "Tom Dale", updatedAt: "now" });
      equal(get(model, 'isDirty'), false, "the model should not be dirty");
      equal(get(model, 'updatedAt'), "now", "the hash was updated");
    } else if (count === 1) {
      equal(get(model, 'name'), "Yehuda Katz");
      store.didUpdateModel(model, { id: 2, name: "Yehuda Katz", updatedAt: "now!" });
      equal(model.get('isDirty'), false, "the model should not be dirty");
      equal(get(model, 'updatedAt'), "now!", "the hash was updated");
    } else {
      ok(false, "should not get here");
    }

    count++;
  };

  store.load(Person, { id: 1, name: "Braaaahm Dale" });
  store.load(Person, { id: 2, name: "Brohuda Katz" });

  var tom = store.find(Person, 1);
  var yehuda = store.find(Person, 2);

  set(tom, "name", "Tom Dale");
  set(yehuda, "name", "Yehuda Katz");

  store.commit();

  // there is nothing to commit, so eachType won't do anything
  store.commit();
});

test("by default, deleteRecords calls deleteRecord once per record", function() {
  expect(4);

  var count = 0;

  adapter.deleteRecord = function(store, type, model) {
    equal(type, Person, "the type is correct");

    if (count === 0) {
      equal(get(model, 'name'), "Tom Dale");
    } else if (count === 1) {
      equal(get(model, 'name'), "Yehuda Katz");
    } else {
      ok(false, "should not get here");
    }

    count++;

    store.didDeleteModel(model);
  };

  store.load(Person, { id: 1, name: "Tom Dale" });
  store.load(Person, { id: 2, name: "Yehuda Katz" });

  var tom = store.find(Person, 1);
  var yehuda = store.find(Person, 2);

  tom.deleteRecord();
  yehuda.deleteRecord();
  store.commit();

  // there is nothing to commit, so eachType won't do anything
  store.commit();
});

test("can be created after the DS.Store", function() {
  expect(1);
  store.set('adapter', 'App.adapter');
  adapter.find = function(store, type) {
    equal(type, Person, "the type is correct");
  };
  // Expose the adapter to global namespace
  window.App = {adapter: adapter};

  store.find(Person, 1);
});

