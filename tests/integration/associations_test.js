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
  parentRecord.toString = function() { return "<parent>"; };
  var childRecord = Comment.createRecord();
  childRecord.toString = function() { return "<child>"; };

  childRecord.get('stateManager').enableLogging = true;

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

  store.commit();
  equal(createCalled, 1, "only the parent record was created");
});
