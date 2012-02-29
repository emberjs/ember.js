var get = Ember.get, set = Ember.set, getPath = Ember.getPath;

var store, adapter;
var Comment;

module("Association/adapter integration test", {
  setup: function() {
    adapter = DS.Adapter.create();

    store = DS.Store.create({
      isDefaultStore: true,
      adapter: adapter
    });

    Comment = DS.Model.extend();
    Comment.reopen({
      body: DS.attr('string'),
      comments: DS.hasMany(Comment),
      comment: DS.belongsTo(Comment)
    });
  },

  teardown: function() {
    store.destroy();
  }
});

test("when adding a record to an association that belongs to another record that has not yet been saved, only the parent record is saved", function() {
  expect(2);

  var transaction = store.transaction();
  var parentRecord = transaction.createRecord(Comment);
  var childRecord = transaction.createRecord(Comment);

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
    transaction.commit();
  });
});

test("if a record is added to the store while a child is pending, auto-committing the child record should not commit the new record", function() {
  expect(2);

  var parentRecord = Comment.createRecord();
  var childRecord = Comment.createRecord();

  parentRecord.get('comments').pushObject(childRecord);

  var createCalled = 0;
  adapter.createRecord = function(store, type, model) {
    createCalled++;
    if (createCalled === 1) {
      equal(model, parentRecord, "parent record is committed first");

      Comment.createRecord();

      store.didCreateRecord(model, { id: 1 });
    } else if (createCalled === 2) {
      equal(model, childRecord, "child record is committed after its parent is committed");
    } else {
      ok(false, "Third comment should not be saved");
    }
  };

  Ember.run(function() {
    store.commit();
  });
});

test("if a parent record and an uncommitted pending child belong to different transactions, committing the parent's transaction does not cause the child's transaction to commit", function() {
  expect(1);

  var parentTransaction = store.transaction();
  var childTransaction = store.transaction();

  var parentRecord = parentTransaction.createRecord(Comment);
  var childRecord = childTransaction.createRecord(Comment);

  parentRecord.get('comments').pushObject(childRecord);

  var createCalled = 0;
  adapter.createRecord = function(store, type, record) {
    createCalled++;
    if (createCalled === 1) {
      equal(record, parentRecord, "parent record is committed");

      store.didCreateRecord(record, { id: 1 });
    } else {
      ok(false, "Child comment should not be saved");
    }
  };

  Ember.run(function() {
    parentTransaction.commit();
  });
});


test("if a record is added to another record's hasMany association, it receives a foreign key associated with the new object", function() {
  store.load(Comment, { id: 1, comments: [] });
  store.load(Comment, { id: 2, comments: [] });

  var parentRecord = store.find(Comment, 1);
  var childRecord = store.find(Comment, 2);

  get(parentRecord, 'comments').pushObject(childRecord);
  equal(get(childRecord, 'comment'), parentRecord);

  var json = childRecord.toJSON();

  equal(json.comment, 1);
});

test("if a record has a foreign key when loaded, it is included in the toJSON output", function() {
  store.load(Comment, { id: 1, comments: [2] });
  store.load(Comment, { id: 2, comment: 1, comments: [] });

  var childRecord = store.find(Comment, 2);

  var json = childRecord.toJSON();

  equal(json.comment, 1);
});
