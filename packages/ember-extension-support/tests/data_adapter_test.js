import {
  get,
  set,
  run,
  addObserver,
  removeObserver
} from 'ember-metal';
import { Object as EmberObject, A as emberA } from 'ember-runtime';
import EmberDataAdapter from '../data_adapter';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';


let adapter, App;
const Model = EmberObject.extend();

const PostClass = Model.extend();

const DataAdapter = EmberDataAdapter.extend({
  detect(klass) {
    return klass !== Model && Model.detect(klass);
  },
  init() {
    this._super(...arguments);
    this.set('containerDebugAdapter', {
      canCatalogEntriesByType(type) {
        return true;
      },
      catalogEntriesByType(type) {
        return emberA(['post']);
      }
    });
  }
});


moduleFor('Data Adapter', class extends ApplicationTestCase {

  ['@test Model types added']() {
    this.add('data-adapter:main', DataAdapter.extend({
      getRecords() {
        return emberA([1, 2, 3]);
      },
      columnsForType() {
        return [{ name: 'title', desc: 'Title' }];
      }
    }));
    this.add('model:post', PostClass);

    return this.visit('/').then(() => {
      let adapter = this.applicationInstance.lookup('data-adapter:main');

      function modelTypesAdded(types) {
        equal(types.length, 1);
        let postType = types[0];
        equal(postType.name, 'post', 'Correctly sets the name');
        equal(postType.count, 3, 'Correctly sets the record count');
        strictEqual(postType.object, PostClass, 'Correctly sets the object');
        deepEqual(postType.columns, [{ name: 'title', desc: 'Title' }], 'Correctly sets the columns');
      }

      adapter.watchModelTypes(modelTypesAdded);
    });
  }

  ['@test getRecords gets a model name as second argument']() {
    this.add('data-adapter:main', DataAdapter.extend({
      getRecords(klass, name) {
        equal(name, 'post');
        return emberA();
      }
    }));
    this.add('model:post', PostClass);

    return this.visit('/').then(() => {
      adapter = this.applicationInstance.lookup('data-adapter:main');
      adapter.watchModelTypes(function() { });
    });
  }

  ['@test Model types added with custom container-debug-adapter']() {
    let StubContainerDebugAdapter = EmberObject.extend({
      canCatalogEntriesByType(type) {
        return true;
      },
      catalogEntriesByType(type) {
        return emberA(['post']);
      }
    });
    this.add('container-debug-adapter:main', StubContainerDebugAdapter);
    this.add('data-adapter:main', DataAdapter.extend({
      getRecords() {
        return emberA([1, 2, 3]);
      },
      columnsForType() {
        return [{ name: 'title', desc: 'Title' }];
      }
    }));
    this.add('model:post', PostClass);

    return this.visit('/').then(() => {
      let adapter = this.applicationInstance.lookup('data-adapter:main');

      function modelTypesAdded(types) {
        equal(types.length, 1);
        let postType = types[0];
        equal(postType.name, 'post', 'Correctly sets the name');
        equal(postType.count, 3, 'Correctly sets the record count');
        strictEqual(postType.object, PostClass, 'Correctly sets the object');
        deepEqual(postType.columns, [{ name: 'title', desc: 'Title' }], 'Correctly sets the columns');
      }

      adapter.watchModelTypes(modelTypesAdded);
    });
  }

  ['@test Model Types Updated']() {
    let records = emberA([1, 2, 3]);
    this.add('data-adapter:main', DataAdapter.extend({
      getRecords(klass, name) {
        return records;
      }
    }));
    this.add('model:post', PostClass);

    return this.visit('/').then(() => {
      adapter = this.applicationInstance.lookup('data-adapter:main');

      function modelTypesAdded(types) {
        run(() => {
          records.pushObject(4);
        });
      }

      function modelTypesUpdated(types) {
        let postType = types[0];
        equal(postType.count, 4, 'Correctly updates the count');
      }

      adapter.watchModelTypes(modelTypesAdded, modelTypesUpdated);
    });
  }

  ['@test Records Added']() {
    let countAdded = 1;
    let post = PostClass.create();
    let recordList = emberA([post]);

    this.add('data-adapter:main', DataAdapter.extend({
      getRecords(klass, name) {
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
    }));
    this.add('model:post', PostClass);

    return this.visit('/').then(() => {
      adapter = this.applicationInstance.lookup('data-adapter:main');

      function recordsAdded(records) {
        let record = records[0];
        equal(record.color, 'blue', 'Sets the color correctly');
        deepEqual(record.columnValues, { title: 'Post ' + countAdded }, 'Sets the column values correctly');
        deepEqual(record.searchKeywords, ['Post ' + countAdded], 'Sets search keywords correctly');
        strictEqual(record.object, post, 'Sets the object to the record instance');
      }

      adapter.watchRecords('post', recordsAdded);
      countAdded++;
      post = PostClass.create();
      recordList.pushObject(post);
    });
  }

  ['@test Observes and releases a record correctly']() {
    let updatesCalled = 0;
    let post = PostClass.create({ title: 'Post' });
    let recordList = emberA([post]);

    this.add('data-adapter:main', DataAdapter.extend({
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
    }));
    this.add('model:post', PostClass);

    return this.visit('/').then(() => {
      adapter = this.applicationInstance.lookup('data-adapter:main');

      function recordsAdded() {
        set(post, 'title', 'Post Modified');
      }

      function recordsUpdated(records) {
        updatesCalled++;
        equal(records[0].columnValues.title, 'Post Modified');
      }

      let release = adapter.watchRecords('post', recordsAdded, recordsUpdated);
      release();
      set(post, 'title', 'New Title');
      equal(updatesCalled, 1, 'Release function removes observers');
    });
  }

  ['@test _nameToClass does not error when not found']() {
    this.add('data-adapter:main', DataAdapter);

    return this.visit('/').then(() => {
      adapter = this.applicationInstance.lookup('data-adapter:main');

      let klass = adapter._nameToClass('foo');

      equal(klass, undefined, 'returns undefined');
    });
  }
});
