import DebugPort from './debug-port';
import { guidFor } from '@ember/debug/ember-inspector-support/utils/ember/object/internals';

export default class extends DebugPort {
  init() {
    super.init();
    this.sentTypes = {};
    this.sentRecords = {};
  }

  releaseTypesMethod = null;
  releaseRecordsMethod = null;

  /* eslint-disable ember/no-side-effects */
  get adapter() {
    const owner = this.namespace?.owner;

    // dataAdapter:main is deprecated
    let adapter =
      this._resolve('data-adapter:main') && owner.lookup('data-adapter:main');
    // column limit is now supported at the inspector level
    if (adapter) {
      adapter.attributeLimit = 100;
      return adapter;
    }

    return null;
  }
  /* eslint-enable ember/no-side-effects */

  _resolve(name) {
    const owner = this.namespace?.owner;

    return owner.resolveRegistration(name);
  }

  get port() {
    return this.namespace?.port;
  }
  get objectInspector() {
    return this.namespace?.objectInspector;
  }

  modelTypesAdded(types) {
    let typesToSend;
    typesToSend = types.map((type) => this.wrapType(type));
    this.sendMessage('modelTypesAdded', {
      modelTypes: typesToSend,
    });
  }

  modelTypesUpdated(types) {
    let typesToSend = types.map((type) => this.wrapType(type));
    this.sendMessage('modelTypesUpdated', {
      modelTypes: typesToSend,
    });
  }

  wrapType(type) {
    const objectId = guidFor(type.object);
    this.sentTypes[objectId] = type;

    return {
      columns: type.columns,
      count: type.count,
      name: type.name,
      objectId,
    };
  }

  recordsAdded(recordsReceived) {
    let records = recordsReceived.map((record) => this.wrapRecord(record));
    this.sendMessage('recordsAdded', { records });
  }

  recordsUpdated(recordsReceived) {
    let records = recordsReceived.map((record) => this.wrapRecord(record));
    this.sendMessage('recordsUpdated', { records });
  }

  recordsRemoved(index, count) {
    this.sendMessage('recordsRemoved', { index, count });
  }

  wrapRecord(record) {
    const objectId = guidFor(record.object);
    let columnValues = {};
    let searchKeywords = [];
    this.sentRecords[objectId] = record;
    // make objects clonable
    for (let i in record.columnValues) {
      columnValues[i] = this.objectInspector.inspect(record.columnValues[i]);
    }
    // make sure keywords can be searched and clonable
    searchKeywords = record.searchKeywords.filter(
      (keyword) => typeof keyword === 'string' || typeof keyword === 'number'
    );
    return {
      columnValues,
      searchKeywords,
      filterValues: record.filterValues,
      color: record.color,
      objectId,
    };
  }

  releaseTypes() {
    if (this.releaseTypesMethod) {
      this.releaseTypesMethod();
      this.releaseTypesMethod = null;
      this.sentTypes = {};
    }
  }

  releaseRecords() {
    if (this.releaseRecordsMethod) {
      this.releaseRecordsMethod();
      this.releaseRecordsMethod = null;
      this.sentRecords = {};
    }
  }

  willDestroy() {
    super.willDestroy();
    this.releaseRecords();
    this.releaseTypes();
  }

  static {
    this.prototype.portNamespace = 'data';
    this.prototype.messages = {
      checkAdapter() {
        this.sendMessage('hasAdapter', { hasAdapter: !!this.adapter });
      },

      getModelTypes() {
        this.modelTypesAdded([]);
        this.releaseTypes();
        this.releaseTypesMethod = this.adapter.watchModelTypes(
          (types) => {
            this.modelTypesAdded(types);
          },
          (types) => {
            this.modelTypesUpdated(types);
          }
        );
      },

      releaseModelTypes() {
        this.releaseTypes();
      },

      getRecords(message) {
        const type = this.sentTypes[message.objectId];
        this.releaseRecords();

        let typeOrName;
        if (this.adapter.acceptsModelName) {
          // Ember >= 1.3
          typeOrName = type.name;
        }

        this.recordsAdded([]);
        let releaseMethod = this.adapter.watchRecords(
          typeOrName,
          (recordsReceived) => {
            this.recordsAdded(recordsReceived);
          },
          (recordsUpdated) => {
            this.recordsUpdated(recordsUpdated);
          },
          (...args) => {
            this.recordsRemoved(...args);
          }
        );
        this.releaseRecordsMethod = releaseMethod;
      },

      releaseRecords() {
        this.releaseRecords();
      },

      inspectModel(message) {
        this.objectInspector.sendObject(
          this.sentRecords[message.objectId].object
        );
      },

      getFilters() {
        this.sendMessage('filters', {
          filters: this.adapter.getFilters(),
        });
      },
    };
  }
}
