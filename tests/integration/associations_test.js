var get = Ember.get, set = Ember.set, getPath = Ember.getPath;

var store, adapter;

module("Association/adapter integration test", {
  setup: function() {
    adapter = DS.Adapter.create();

    store = DS.Store.create({
      isDefaultStore: true,
      adapter: adapter
    });
  },

  teardown: function() {
    store.destroy();
  }
});

test("when adding a record to an association that belongs to another record that has not yet been saved, only the parent record is saved", function() {
  expect(2);

  var Comment = DS.Model.extend();

  Comment.reopen({
    comments: DS.hasMany(Comment)
  });

  var parentRecord = Comment.createRecord();
  var childRecord = Comment.createRecord();

  parentRecord.get('comments').pushObject(childRecord);

  var createCalled = 0;
  adapter.createRecord = function(store, type, model) {
    createCalled++;
    if (createCalled === 1) {
      equal(model, parentRecord, "parent record is committed first");
      store.didCreateRecord(model, { id: 1 });
    } else if (createCalled === 2) {
      equal(model, childRecord, "child record is committed after its parent is committed");
    }
  };

  Ember.run(function() {
    store.commit();
  });
});
