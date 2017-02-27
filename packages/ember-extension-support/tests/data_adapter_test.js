import {
  get,
  set,
  run,
  addObserver,
  removeObserver
} from 'ember-metal';
import { Object as EmberObject, A as emberA } from 'ember-runtime';
import EmberDataAdapter from '../data_adapter';
import { Application as EmberApplication, Resolver as DefaultResolver } from 'ember-application';

let adapter, App;
const Model = EmberObject.extend();

const DataAdapter = EmberDataAdapter.extend({
  detect(klass) {
    return klass !== Model && Model.detect(klass);
  }
});

QUnit.module('Data Adapter', {
  setup() {
    run(() => {
      App = EmberApplication.create();
      App.toString = function() { return 'App'; };
      App.deferReadiness();
      App.register('data-adapter:main', DataAdapter);
    });
  },
  teardown() {
    run(() => {
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
      return emberA([1, 2, 3]);
    },
    columnsForType() {
      return [{ name: 'title', desc: 'Title' }];
    }
  });

  run(App, 'advanceReadiness');

  function modelTypesAdded(types) {
    equal(types.length, 1);
    let postType = types[0];
    equal(postType.name, 'post', 'Correctly sets the name');
    equal(postType.count, 3, 'Correctly sets the record count');
    strictEqual(postType.object, App.Post, 'Correctly sets the object');
    deepEqual(postType.columns, [{ name: 'title', desc: 'Title' }], 'Correctly sets the columns');
  }

  run(adapter, 'watchModelTypes', modelTypesAdded);
});

QUnit.test('getRecords gets a model name as second argument', function() {
  App.Post = Model.extend();

  adapter = App.__container__.lookup('data-adapter:main');
  adapter.reopen({
    getRecords(klass, name) {
      equal(name, 'post');
      return emberA();
    }
  });

  adapter.watchModelTypes(function() { });
});

QUnit.test('Model types added with custom container-debug-adapter', function() {
  let PostClass = Model.extend();
  let StubContainerDebugAdapter = DefaultResolver.extend({
    canCatalogEntriesByType(type) {
      return true;
    },
    catalogEntriesByType(type) {
      return [PostClass];
    }
  });
  App.register('container-debug-adapter:main', StubContainerDebugAdapter);

  adapter = App.__container__.lookup('data-adapter:main');
  adapter.reopen({
    getRecords() {
      return emberA([1, 2, 3]);
    },
    columnsForType() {
      return [{ name: 'title', desc: 'Title' }];
    }
  });

  run(App, 'advanceReadiness');

  function modelTypesAdded(types) {
    equal(types.length, 1);
    let postType = types[0];

    equal(postType.name, PostClass.toString(), 'Correctly sets the name');
    equal(postType.count, 3, 'Correctly sets the record count');
    strictEqual(postType.object, PostClass, 'Correctly sets the object');
    deepEqual(postType.columns, [{ name: 'title', desc: 'Title' }], 'Correctly sets the columns');
  }

  run(adapter, 'watchModelTypes', modelTypesAdded);
});

QUnit.test('Model Types Updated', function() {
  App.Post = Model.extend();

  adapter = App.__container__.lookup('data-adapter:main');
  let records = emberA([1, 2, 3]);
  adapter.reopen({
    getRecords() {
      return records;
    }
  });

  run(App, 'advanceReadiness');

  function modelTypesAdded() {
    run(() => {
      records.pushObject(4);
    });
  }

  function modelTypesUpdated(types) {
    let postType = types[0];
    equal(postType.count, 4, 'Correctly updates the count');
  }

  run(adapter, 'watchModelTypes', modelTypesAdded, modelTypesUpdated);
});

QUnit.test('Records Added', function() {
  expect(8);
  let countAdded = 1;

  App.Post = Model.extend();

  let post = App.Post.create();
  let recordList = emberA([post]);

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

  function recordsAdded(records) {
    let record = records[0];
    equal(record.color, 'blue', 'Sets the color correctly');
    deepEqual(record.columnValues, { title: 'Post ' + countAdded }, 'Sets the column values correctly');
    deepEqual(record.searchKeywords, ['Post ' + countAdded], 'Sets search keywords correctly');
    strictEqual(record.object, post, 'Sets the object to the record instance');
  }

  adapter.watchRecords(App.Post, recordsAdded);
  countAdded++;
  post = App.Post.create();
  recordList.pushObject(post);
});

QUnit.test('Observes and releases a record correctly', function() {
  let updatesCalled = 0;
  App.Post = Model.extend();

  let post = App.Post.create({ title: 'Post' });
  let recordList = emberA([post]);

  adapter = App.__container__.lookup('data-adapter:main');
  adapter.reopen({
    getRecords() {
      return recordList;
    },
    observeRecord(record, recordUpdated) {
      let self = this;
      function callback() {
        recordUpdated(self.wrapRecord(record));
      }
      addObserver(record, 'title', callback);
      return function() {
        removeObserver(record, 'title', callback);
      };
    },
    getRecordColumnValues(record) {
      return { title: get(record, 'title') };
    }
  });

  function recordsAdded() {
    set(post, 'title', 'Post Modified');
  }

  function recordsUpdated(records) {
    updatesCalled++;
    equal(records[0].columnValues.title, 'Post Modified');
  }

  let release = adapter.watchRecords(App.Post, recordsAdded, recordsUpdated);
  release();
  set(post, 'title', 'New Title');
  equal(updatesCalled, 1, 'Release function removes observers');
});

QUnit.test('_nameToClass does not error when not found', function(assert) {
  adapter = App.__container__.lookup('data-adapter:main');

  let klass = adapter._nameToClass('App.Foo');

  assert.equal(klass, undefined, 'returns undefined');
});
