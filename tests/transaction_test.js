var get = Ember.get, set = Ember.set;

var Person = DS.Model.extend();

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
      createMany: function() {
        commitCalls++;
      }
    })
  });

  var transaction = store.transaction();
  var model = transaction.create(Person, {});

  store.commit();
  equals(commitCalls, 0, "commit was not called when committing the store");

  transaction.commit();
  equals(commitCalls, 1, "commit was called when committing the transaction");
});

test("after a model is added to a transaction then updated, it is not committed when store.commit() is called but is committed when transaction.commit() is called", function() {
  var commitCalls = 0;

  var store = DS.Store.create({
    adapter: DS.Adapter.create({
      updateMany: function() {
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
  equals(commitCalls, 0, "commit was not called when committing the store");

  transaction.commit();
  equals(commitCalls, 1, "commit was called when committing the transaction");
});

test("a model is removed from a transaction after the models become clean", function() {
  var createCalls = 0, updateCalls = 0;

  var store = DS.Store.create({
    adapter: DS.Adapter.create({
      create: function(store, type, model) {
        createCalls++;

        store.didCreateModel(model, { id: 1 });
      },

      updateMany: function() {
        updateCalls++;
      }
    })
  });

  var transaction = store.transaction();
  var model = transaction.create(Person, {});

  transaction.commit();
  equals(createCalls, 1, "create should be called when committing the store");

  model.set('foo', 'bar');

  transaction.commit();
  equals(updateCalls, 0, "commit was not called when committing the transaction");

  store.commit();
  equals(updateCalls, 1, "commit was called when committing the store");
});

test("after a model is added to a transaction then deleted, it is not committed when store.commit() is called but is committed when transaction.commit() is called", function() {
  var commitCalls = 0;

  var store = DS.Store.create({
    adapter: DS.Adapter.create({
      deleteMany: function() {
        commitCalls++;
      }
    })
  });

  store.load(Person, { id: 1, name: "Yehuda Katz" });

  var transaction = store.transaction();
  var model = store.find(Person, 1);
  transaction.add(model);

  model.deleteModel();

  store.commit();
  equals(commitCalls, 0, "commit was not called when committing the store");

  transaction.commit();
  equals(commitCalls, 1, "commit was called when committing the transaction");
});

