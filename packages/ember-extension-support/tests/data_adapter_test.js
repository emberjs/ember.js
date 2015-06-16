import Ember from 'ember-metal/core';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import run from 'ember-metal/run_loop';
import {
  addObserver,
  removeObserver
} from 'ember-metal/observer';
import EmberObject from 'ember-runtime/system/object';
import EmberDataAdapter from 'ember-extension-support/data_adapter';
import EmberApplication from 'ember-application/system/application';
import DefaultResolver from 'ember-application/system/resolver';

var adapter, App;
var Model = EmberObject.extend();

var DataAdapter = EmberDataAdapter.extend({
  detect(klass) {
    return klass !== Model && Model.detect(klass);
  }
});

QUnit.module('Data Adapter', {
  setup() {
    run(function() {
      App = EmberApplication.create();
      App.toString = function() { return 'App'; };
      App.deferReadiness();
      App.registry.register('data-adapter:main', DataAdapter);
    });
  },
  teardown() {
    run(function() {
      adapter.destroy();
      App.destroy();
    });
  }
});

QUnit.test('Model types added with DefaultResolver', function() {
  App.Post = Model.extend();

  adapter = App.__container__.lookup('data-adapter:main');
  adapter.reopen({
    getRecords() {
      return Ember.A([1,2,3]);
    },
    columnsForType() {
      return [{ name: 'title', desc: 'Title' }];
    }
  });

  run(App, 'advanceReadiness');

  var modelTypesAdded = function(types) {

    equal(types.length, 1);
    var postType = types[0];
    equal(postType.name, 'post', 'Correctly sets the name');
    equal(postType.count, 3, 'Correctly sets the record count');
    strictEqual(postType.object, App.Post, 'Correctly sets the object');
    deepEqual(postType.columns, [{ name: 'title', desc: 'Title' }], 'Correctly sets the columns');
  };

  adapter.watchModelTypes(modelTypesAdded);
});

QUnit.test('getRecords gets a model name as second argument', function() {
  App.Post = Model.extend();

  adapter = App.__container__.lookup('data-adapter:main');
  adapter.reopen({
    getRecords(klass, name) {
      equal(name, 'post');
      return Ember.A([]);
    }
  });

  adapter.watchModelTypes(function() { });
});

QUnit.test('Model types added with custom container-debug-adapter', function() {
  var PostClass = Model.extend();
  var StubContainerDebugAdapter = DefaultResolver.extend({
    canCatalogEntriesByType(type) {
      return true;
    },
    catalogEntriesByType(type) {
      return [PostClass];
    }
  });
  App.registry.register('container-debug-adapter:main', StubContainerDebugAdapter);

  adapter = App.__container__.lookup('data-adapter:main');
  adapter.reopen({
    getRecords() {
      return Ember.A([1,2,3]);
    },
    columnsForType() {
      return [{ name: 'title', desc: 'Title' }];
    }
  });

  run(App, 'advanceReadiness');

  var modelTypesAdded = function(types) {

    equal(types.length, 1);
    var postType = types[0];

    equal(postType.name, PostClass.toString(), 'Correctly sets the name');
    equal(postType.count, 3, 'Correctly sets the record count');
    strictEqual(postType.object, PostClass, 'Correctly sets the object');
    deepEqual(postType.columns, [{ name: 'title', desc: 'Title' }], 'Correctly sets the columns');
  };

  adapter.watchModelTypes(modelTypesAdded);
});

QUnit.test('Model Types Updated', function() {
  App.Post = Model.extend();

  adapter = App.__container__.lookup('data-adapter:main');
  var records = Ember.A([1,2,3]);
  adapter.reopen({
    getRecords() {
      return records;
    }
  });

  run(App, 'advanceReadiness');

  var modelTypesAdded = function() {
    run(function() {
      records.pushObject(4);
    });
  };

  var modelTypesUpdated = function(types) {

    var postType = types[0];
    equal(postType.count, 4, 'Correctly updates the count');
  };

  adapter.watchModelTypes(modelTypesAdded, modelTypesUpdated);

});

QUnit.test('Records Added', function() {
  expect(8);
  var countAdded = 1;

  App.Post = Model.extend();

  var post = App.Post.create();
  var recordList = Ember.A([post]);

  adapter = App.__container__.lookup('data-adapter:main');
  adapter.reopen({
    getRecords() {
      return recordList;
    },
    getRecordColor() {
      return 'blue';
    },
    getRecordColumnValues() {
      return { title: 'Post ' + countAdded };
    },
    getRecordKeywords() {
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

QUnit.test('Observes and releases a record correctly', function() {
  var updatesCalled = 0;
  App.Post = Model.extend();

  var post = App.Post.create({ title: 'Post' });
  var recordList = Ember.A([post]);

  adapter = App.__container__.lookup('data-adapter:main');
  adapter.reopen({
    getRecords() {
      return recordList;
    },
    observeRecord(record, recordUpdated) {
      var self = this;
      var callback = function() {
        recordUpdated(self.wrapRecord(record));
      };
      addObserver(record, 'title', callback);
      return function() {
        removeObserver(record, 'title', callback);
      };
    },
    getRecordColumnValues(record) {
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
