var adapter, App, get = Ember.get,
    set = Ember.set, Model = Ember.Object.extend();

var DataAdapter = Ember.DataAdapter.extend({
  detect: function(klass) {
    return klass !== Model && Model.detect(klass);
  }
});

module("Data Adapter", {
  setup:function() {
    Ember.run(function() {
      App = Ember.Application.create();
      App.toString = function() { return 'App'; };
      App.deferReadiness();
      App.__container__.register('dataAdapter:main', DataAdapter);
      adapter = App.__container__.lookup('dataAdapter:main');
    });
  },
  teardown: function() {
    Ember.run(function() {
      adapter.destroy();
      App.destroy();
    });
  }
});

test("Model Types Added", function() {
  App.Post = Model.extend();

  adapter.reopen({
    getRecords: function() {
      return Ember.A([1,2,3]);
    },
    columnsForType: function() {
      return [ { name: 'title', desc: 'Title'} ];
    }
  });

  Ember.run(App, 'advanceReadiness');

  var modelTypesAdded = function(types) {

    equal(types.length, 1);
    var postType = types[0];
    equal(postType.name, 'App.Post', 'Correctly sets the name');
    equal(postType.count, 3, 'Correctly sets the record count');
    strictEqual(postType.object, App.Post, 'Correctly sets the object');
    deepEqual(postType.columns, [ {name: 'title', desc: 'Title'} ], 'Correctly sets the columns');
  };

  adapter.watchModelTypes(modelTypesAdded);

});

test("Model Types Updated", function() {
  App.Post = Model.extend();

  var records = Ember.A([1,2,3]);
  adapter.reopen({
    getRecords: function() {
      return records;
    }
  });

  Ember.run(App, 'advanceReadiness');

  var modelTypesAdded = function() {
    Ember.run(function() {
      records.pushObject(4);
    });
  };

  var modelTypesUpdated = function(types) {

    var postType = types[0];
    equal(postType.count, 4, 'Correctly updates the count');
  };

  adapter.watchModelTypes(modelTypesAdded, modelTypesUpdated);

});

test("Records Added", function() {
  expect(8);
  var countAdded = 1;

  App.Post = Model.extend();

  var post = App.Post.create();
  var recordList = Ember.A([post]);

  adapter.reopen({
    getRecords: function() {
      return recordList;
    },
    getRecordColor: function() {
      return 'blue';
    },
    getRecordColumnValues: function() {
      return { title: 'Post ' + countAdded };
    },
    getRecordKeywords: function() {
      return ['Post ' + countAdded];
    }
  });

  var recordsAdded = function(records) {
    var record = records[0];
    equal(record.color, 'blue', 'Sets the color correctly');
    deepEqual(record.columnValues, { title: 'Post ' + countAdded }, 'Sets the column values correctly');
    deepEqual(record.searchKeywords, ['Post ' + countAdded], 'Sets search keywords correctly');
    strictEqual(record.object, post, 'Sets the object to the record instance');
  };

  adapter.watchRecords(App.Post, recordsAdded);
  countAdded++;
  post = App.Post.create();
  recordList.pushObject(post);
});

test("Observes and releases a record correctly", function() {
  var updatesCalled = 0;
  App.Post = Model.extend();

  var post = App.Post.create({ title: 'Post' });
  var recordList = Ember.A([post]);

  adapter.reopen({
    getRecords: function() {
      return recordList;
    },
    observeRecord: function(record, recordUpdated) {
      var self = this;
      var callback = function() {
        recordUpdated(self.wrapRecord(record));
      };
      Ember.addObserver(record, 'title', callback);
      return function() {
        Ember.removeObserver(record, 'title', callback);
      };
    },
    getRecordColumnValues: function(record) {
      return { title: get(record, 'title') };
    }
  });

  var recordsAdded = function() {
    set(post, 'title', 'Post Modified');
  };

  var recordsUpdated = function(records) {
    updatesCalled++;
    equal(records[0].columnValues.title, 'Post Modified');
  };

  var release = adapter.watchRecords(App.Post, recordsAdded, recordsUpdated);
  release();
  set(post, 'title', 'New Title');
  equal(updatesCalled, 1, 'Release function removes observers');
});
