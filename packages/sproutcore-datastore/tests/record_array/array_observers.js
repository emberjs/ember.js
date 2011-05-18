(function(root) {
  var store;
  var query;
  var recordArray;

  module("SC.RecordArray - implements array content observers", {
    setup: function() {
    },

    teardown: function() {
      root.MyRecord = undefined;
    }
  });

  test("notifies when a record is added to the store that matches a query", function() {
    var callCount = 0,
        lastRemovedCount = 0,
        lastAddedCount = 0;

    SC.run(function() {
      store = SC.Store.create();
      root.MyRecord = SC.Record.extend();
      query = SC.Query.local(MyRecord);

      recordArray = store.find(query);

      recordArray.addArrayObservers({
        didChange: function(start, removedCount, addedCount) {
          lastRemovedCount = removedCount;
          lastAddedCount = addedCount;
        },

        willChange: function() {}
      });

      store.createRecord(MyRecord, {});
    });

    equals(lastAddedCount, 1);
    equals(lastRemovedCount, 0);
    equals(recordArray.get('length'), 1);
  });

  test("notifies when a record is removed from the store that matches a query", function() {
    var lastRemovedCount = 0,
        lastAddedCount = 0;

    var record;

    SC.run(function() {
      store = SC.Store.create();
      root.MyRecord = SC.Record.extend();
      query = SC.Query.local(MyRecord);

      recordArray = store.find(query);

      recordArray.addArrayObservers({
        didChange: function(start, removedCount, addedCount) {
          lastRemovedCount = removedCount;
          lastAddedCount = addedCount;
        },

        willChange: function() {}
      });

      record = store.createRecord(MyRecord, {
        guid: 1
      });
    });

    equals(lastAddedCount, 1);
    equals(lastRemovedCount, 0);

    SC.run(function() {
      record.destroy();
    });

    equals(lastAddedCount, 0);
    equals(lastRemovedCount, 1);
    equals(recordArray.get('length'), 0);
  });
})(this);
