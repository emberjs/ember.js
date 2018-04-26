import { run } from '@ember/runloop';
import { get, set, addObserver, removeObserver } from 'ember-metal';
import { Object as EmberObject, A as emberA } from 'ember-runtime';
import EmberDataAdapter from '../lib/data_adapter';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';

let adapter;
const Model = EmberObject.extend();

const PostClass = Model.extend();

const DataAdapter = EmberDataAdapter.extend({
  detect(klass) {
    return klass !== Model && Model.detect(klass);
  },
  init() {
    this._super(...arguments);
    this.set('containerDebugAdapter', {
      canCatalogEntriesByType() {
        return true;
      },
      catalogEntriesByType() {
        return emberA(['post']);
      },
    });
  },
});

moduleFor(
  'Data Adapter',
  class extends ApplicationTestCase {
    teardown() {
      super.teardown();
      adapter = undefined;
    }

    ['@test Model types added'](assert) {
      this.add(
        'data-adapter:main',
        DataAdapter.extend({
          getRecords() {
            return emberA([1, 2, 3]);
          },
          columnsForType() {
            return [{ name: 'title', desc: 'Title' }];
          },
        })
      );
      this.add('model:post', PostClass);

      return this.visit('/').then(() => {
        let adapter = this.applicationInstance.lookup('data-adapter:main');

        function modelTypesAdded(types) {
          assert.equal(types.length, 1);
          let postType = types[0];
          assert.equal(postType.name, 'post', 'Correctly sets the name');
          assert.equal(postType.count, 3, 'Correctly sets the record count');
          assert.strictEqual(postType.object, PostClass, 'Correctly sets the object');
          assert.deepEqual(
            postType.columns,
            [{ name: 'title', desc: 'Title' }],
            'Correctly sets the columns'
          );
        }

        adapter.watchModelTypes(modelTypesAdded);
      });
    }

    ['@test getRecords gets a model name as second argument'](assert) {
      this.add(
        'data-adapter:main',
        DataAdapter.extend({
          getRecords(klass, name) {
            assert.equal(name, 'post');
            return emberA();
          },
        })
      );
      this.add('model:post', PostClass);

      return this.visit('/').then(() => {
        adapter = this.applicationInstance.lookup('data-adapter:main');
        adapter.watchModelTypes(function() {});
      });
    }

    ['@test Model types added with custom container-debug-adapter'](assert) {
      let StubContainerDebugAdapter = EmberObject.extend({
        canCatalogEntriesByType() {
          return true;
        },
        catalogEntriesByType() {
          return emberA(['post']);
        },
      });
      this.add('container-debug-adapter:main', StubContainerDebugAdapter);
      this.add(
        'data-adapter:main',
        DataAdapter.extend({
          getRecords() {
            return emberA([1, 2, 3]);
          },
          columnsForType() {
            return [{ name: 'title', desc: 'Title' }];
          },
        })
      );
      this.add('model:post', PostClass);

      return this.visit('/').then(() => {
        let adapter = this.applicationInstance.lookup('data-adapter:main');

        function modelTypesAdded(types) {
          assert.equal(types.length, 1);
          let postType = types[0];
          assert.equal(postType.name, 'post', 'Correctly sets the name');
          assert.equal(postType.count, 3, 'Correctly sets the record count');
          assert.strictEqual(postType.object, PostClass, 'Correctly sets the object');
          assert.deepEqual(
            postType.columns,
            [{ name: 'title', desc: 'Title' }],
            'Correctly sets the columns'
          );
        }

        adapter.watchModelTypes(modelTypesAdded);
      });
    }

    ['@test Model Types Updated'](assert) {
      let records = emberA([1, 2, 3]);
      this.add(
        'data-adapter:main',
        DataAdapter.extend({
          getRecords() {
            return records;
          },
        })
      );
      this.add('model:post', PostClass);

      return this.visit('/').then(() => {
        adapter = this.applicationInstance.lookup('data-adapter:main');

        function modelTypesAdded() {
          run(() => {
            records.pushObject(4);
          });
        }

        function modelTypesUpdated(types) {
          let postType = types[0];
          assert.equal(postType.count, 4, 'Correctly updates the count');
        }

        adapter.watchModelTypes(modelTypesAdded, modelTypesUpdated);
      });
    }

    ['@test Model Types Updated but Unchanged Do not Trigger Callbacks'](assert) {
      assert.expect(0);
      let records = emberA([1, 2, 3]);
      this.add(
        'data-adapter:main',
        DataAdapter.extend({
          getRecords() {
            return records;
          },
        })
      );
      this.add('model:post', PostClass);

      return this.visit('/').then(() => {
        adapter = this.applicationInstance.lookup('data-adapter:main');

        function modelTypesAdded() {
          run(() => {
            records.arrayContentDidChange(0, 0, 0);
          });
        }

        function modelTypesUpdated() {
          assert.ok(false, "modelTypesUpdated should not be triggered if the array didn't change");
        }

        adapter.watchModelTypes(modelTypesAdded, modelTypesUpdated);
      });
    }

    ['@test Records Added'](assert) {
      let countAdded = 1;
      let post = PostClass.create();
      let recordList = emberA([post]);

      this.add(
        'data-adapter:main',
        DataAdapter.extend({
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
          },
        })
      );
      this.add('model:post', PostClass);

      return this.visit('/').then(() => {
        adapter = this.applicationInstance.lookup('data-adapter:main');

        function recordsAdded(records) {
          let record = records[0];
          assert.equal(record.color, 'blue', 'Sets the color correctly');
          assert.deepEqual(
            record.columnValues,
            { title: 'Post ' + countAdded },
            'Sets the column values correctly'
          );
          assert.deepEqual(
            record.searchKeywords,
            ['Post ' + countAdded],
            'Sets search keywords correctly'
          );
          assert.strictEqual(record.object, post, 'Sets the object to the record instance');
        }

        adapter.watchRecords('post', recordsAdded);
        countAdded++;
        post = PostClass.create();
        recordList.pushObject(post);
      });
    }

    ['@test Observes and releases a record correctly'](assert) {
      let updatesCalled = 0;
      let post = PostClass.create({ title: 'Post' });
      let recordList = emberA([post]);

      this.add(
        'data-adapter:main',
        DataAdapter.extend({
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
          },
        })
      );
      this.add('model:post', PostClass);

      return this.visit('/').then(() => {
        adapter = this.applicationInstance.lookup('data-adapter:main');

        function recordsAdded() {
          set(post, 'title', 'Post Modified');
        }

        function recordsUpdated(records) {
          updatesCalled++;
          assert.equal(records[0].columnValues.title, 'Post Modified');
        }

        let release = adapter.watchRecords('post', recordsAdded, recordsUpdated);
        release();
        set(post, 'title', 'New Title');
        assert.equal(updatesCalled, 1, 'Release function removes observers');
      });
    }

    ['@test _nameToClass does not error when not found'](assert) {
      this.add('data-adapter:main', DataAdapter);

      return this.visit('/').then(() => {
        adapter = this.applicationInstance.lookup('data-adapter:main');

        let klass = adapter._nameToClass('foo');

        assert.equal(klass, undefined, 'returns undefined');
      });
    }
  }
);
