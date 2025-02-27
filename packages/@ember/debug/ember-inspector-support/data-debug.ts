import DebugPort from './debug-port';
import { guidFor } from '@ember/debug/ember-inspector-support/utils/ember/object/internals';

export default class DataDebug extends DebugPort {
  declare portNamespace: string;
  declare sentTypes: Record<string, any>;
  declare sentRecords: Record<string, any>;
  init() {
    super.init();
    this.sentTypes = {};
    this.sentRecords = {};
  }

  releaseTypesMethod: Function | null = null;
  releaseRecordsMethod: Function | null = null;

  get adapter() {
    const owner = this.namespace?.owner;

    // dataAdapter:main is deprecated
    let adapter = this._resolve('data-adapter:main') && owner.lookup('data-adapter:main');
    // column limit is now supported at the inspector level
    if (adapter) {
      adapter.attributeLimit = 100;
      return adapter;
    }

    return null;
  }

  _resolve(name: string) {
    const owner = this.namespace?.owner;

    return owner.resolveRegistration(name);
  }

  get objectInspector() {
    return this.namespace?.objectInspector;
  }

  modelTypesAdded(types: any[]) {
    let typesToSend;
    typesToSend = types.map((type) => this.wrapType(type));
    this.sendMessage('modelTypesAdded', {
      modelTypes: typesToSend,
    });
  }

  modelTypesUpdated(types: any[]) {
    let typesToSend = types.map((type) => this.wrapType(type));
    this.sendMessage('modelTypesUpdated', {
      modelTypes: typesToSend,
    });
  }

  wrapType(type: any) {
    const objectId = guidFor(type.object);
    this.sentTypes[objectId] = type;

    return {
      columns: type.columns,
      count: type.count,
      name: type.name,
      objectId,
    };
  }

  recordsAdded(recordsReceived: any[]) {
    let records = recordsReceived.map((record) => this.wrapRecord(record));
    this.sendMessage('recordsAdded', { records });
  }

  recordsUpdated(recordsReceived: any[]) {
    let records = recordsReceived.map((record) => this.wrapRecord(record));
    this.sendMessage('recordsUpdated', { records });
  }

  recordsRemoved(index: number, count: number) {
    this.sendMessage('recordsRemoved', { index, count });
  }

  wrapRecord(record: any) {
    const objectId = guidFor(record.object);
    let columnValues: Record<string, any> = {};
    let searchKeywords: any[] = [];
    this.sentRecords[objectId] = record;
    // make objects clonable
    for (let i in record.columnValues) {
      columnValues[i] = this.objectInspector.inspect(record.columnValues[i]);
    }
    // make sure keywords can be searched and clonable
    searchKeywords = record.searchKeywords.filter(
      (keyword: any) => typeof keyword === 'string' || typeof keyword === 'number'
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
      checkAdapter(this: DataDebug) {
        this.sendMessage('hasAdapter', { hasAdapter: Boolean(this.adapter) });
      },

      getModelTypes(this: DataDebug) {
        this.modelTypesAdded([]);
        this.releaseTypes();
        this.releaseTypesMethod = this.adapter.watchModelTypes(
          (types: any) => {
            this.modelTypesAdded(types);
          },
          (types: any) => {
            this.modelTypesUpdated(types);
          }
        );
      },

      releaseModelTypes(this: DataDebug) {
        this.releaseTypes();
      },

      getRecords(this: DataDebug, message: any) {
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
          (recordsReceived: any) => {
            this.recordsAdded(recordsReceived);
          },
          (recordsUpdated: any) => {
            this.recordsUpdated(recordsUpdated);
          },
          (index: number, count: number) => {
            this.recordsRemoved(index, count);
          }
        );
        this.releaseRecordsMethod = releaseMethod;
      },

      releaseRecords(this: DataDebug) {
        this.releaseRecords();
      },

      inspectModel(this: DataDebug, message: any) {
        this.objectInspector.sendObject(this.sentRecords[message.objectId].object);
      },

      getFilters(this: DataDebug) {
        this.sendMessage('filters', {
          filters: this.adapter.getFilters(),
        });
      },
    };
  }
}
