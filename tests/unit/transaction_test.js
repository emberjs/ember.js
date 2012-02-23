var get = Ember.get, set = Ember.set;

var Person = DS.Model.extend({
  name: DS.attr('string'),
  foo: DS.attr('string')
});

module("DS.Transaction");

test("can create a new transaction", function() {
  var store = DS.Store.create();

  var transaction = store.transaction();

  ok(transaction, "transaction is created");
  ok(DS.Transaction.detectInstance(transaction), "transaction is an instance of DS.Transaction");
});

test("after a model is created from a transaction, it is not committed when store.commit() is called but is committed when transaction.commit() is called", function() {
  var commitCalls = 0;

  var store = DS.Store.create({
    adapter: DS.Adapter.create({
      createRecords: function() {
        commitCalls++;
      }
    })
  });

  var transaction = store.transaction();
  transaction.createRecord(Person, {});

  store.commit();
  equal(commitCalls, 0, "commit was not called when committing the store");

  transaction.commit();
  equal(commitCalls, 1, "commit was called when committing the transaction");
});

test("after a model is added to a transaction then updated, it is not committed when store.commit() is called but is committed when transaction.commit() is called", function() {
  var commitCalls = 0;

  var store = DS.Store.create({
    adapter: DS.Adapter.create({
      updateRecords: function() {
        commitCalls++;
      }
    })
  });

  store.load(Person, { id: 1, name: "Yehuda Katz" });

  var transaction = store.transaction();
  var model = store.find(Person, 1);
  transaction.add(model);

  model.set('name', 'Brohuda Brokatz');

  store.commit();
  equal(commitCalls, 0, "commit was not called when committing the store");

  transaction.commit();
  equal(commitCalls, 1, "commit was called when committing the transaction");
});

test("a model is removed from a transaction after the models become clean", function() {
  var createCalls = 0, updateCalls = 0;

  var store = DS.Store.create({
    adapter: DS.Adapter.create({
      createRecord: function(store, type, model) {
        createCalls++;

        store.didCreateRecord(model, { id: 1 });
      },

      updateRecords: function() {
        updateCalls++;
      }
    })
  });

  var transaction = store.transaction();
  var model = transaction.createRecord(Person, {});

  transaction.commit();
  equal(createCalls, 1, "create should be called when committing the store");

  model.set('foo', 'bar');

  transaction.commit();
  equal(updateCalls, 0, "commit was not called when committing the transaction");

  store.commit();
  equal(updateCalls, 1, "commit was called when committing the store");
});

test("after a model is added to a transaction then deleted, it is not committed when store.commit() is called but is committed when transaction.commit() is called", function() {
  var commitCalls = 0;

  var store = DS.Store.create({
    adapter: DS.Adapter.create({
      deleteRecords: function() {
        commitCalls++;
      }
    })
  });

  store.load(Person, { id: 1, name: "Yehuda Katz" });

  var transaction = store.transaction();
  var model = store.find(Person, 1);
  transaction.add(model);

  model.deleteRecord();

  store.commit();
  equal(commitCalls, 0, "commit was not called when committing the store");

  transaction.commit();
  equal(commitCalls, 1, "commit was called when committing the transaction");
});

test("a model that is clean can be removed from a transaction", function() {
  var updateCalled = 0;

  var store = DS.Store.create({
    adapter: DS.Adapter.create({
      updateRecord: function() {
        updateCalled++;
      }
    })
  });

  store.load(Person, { id: 1, name: "Yehuda Katz" });

  var transaction = store.transaction();
  var record = store.find(Person, 1);

  transaction.add(record);
  transaction.remove(record);

  set(record, 'name', "shuck it trebek");

  transaction.commit();

  equal(updateCalled, 0, "after removing from transaction it does not commit");

  store.commit();

  equal(updateCalled, 1, "after removing from transaction it commits on the store");
});

test("a model that is in the created state cannot be moved into a new transaction", function() {
  var store = DS.Store.create();

  var person = store.createRecord(Person);
  var transaction = store.transaction();

  raises(function() {
    transaction.add(person);
  }, Error);
});

test("a model that is in the updated state cannot be moved into a new transaction", function() {
  var store = DS.Store.create();

  store.load(Person, { id: 1 });
  var person = store.find(Person, 1);

  person.set('name', "Scumdale");
  var transaction = store.transaction();

  raises(function() {
    transaction.add(person);
  }, Error);
});

test("a model that is in the deleted state cannot be moved into a new transaction", function() {
  var store = DS.Store.create();

  store.load(Person, { id: 1 });
  var person = store.find(Person, 1);

  person.deleteRecord();
  var transaction = store.transaction();

  raises(function() {
    transaction.add(person);
  }, Error);
});

test("a record that is in the clean state is moved back to the default transaction after its transaction is committed", function() {
  var commitCalled = 0;

  var store = DS.Store.create({
    adapter: DS.Adapter.create({
      commit: function() {
        commitCalled++;
      }
    })
  });

  store.load(Person, { id: 1 });

  var person = store.find(Person, 1);

  var transaction = store.transaction();
  transaction.add(person);
  transaction.commit();

  equal(commitCalled, 1, "should attempt to commit records");
  equal(get(person, 'transaction'), get(store, 'defaultTransaction'), "record should have been moved back to the default transaction");
});
