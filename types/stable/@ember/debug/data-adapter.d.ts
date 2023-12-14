declare module '@ember/debug/data-adapter' {
  import type Owner from '@ember/owner';
  import type { NativeArray } from '@ember/array';
  import EmberObject from '@ember/object';
  import type ContainerDebugAdapter from '@ember/debug/container-debug-adapter';
  /**
    @module @ember/debug/data-adapter
    */
  type RecordColor = 'black' | 'red' | 'blue' | 'green';
  type Column = {
    name: string;
    desc: string;
  };
  type WrappedType<N extends string = string> = {
    name: N;
    count: number;
    columns: Column[];
    object: unknown;
  };
  type WrappedRecord<T> = {
    object: T;
    columnValues: object;
    searchKeywords: NativeArray<unknown>;
    filterValues: object;
    color: RecordColor | null;
  };
  type RecordCallback<T> = (
    records: Array<{
      columnValues: object;
      object: T;
    }>
  ) => void;
  /**
      The `DataAdapter` helps a data persistence library
      interface with tools that debug Ember such
      as the [Ember Inspector](https://github.com/emberjs/ember-inspector)
      for Chrome and Firefox.

      This class will be extended by a persistence library
      which will override some of the methods with
      library-specific code.

      The methods likely to be overridden are:

      * `getFilters`
      * `detect`
      * `columnsForType`
      * `getRecords`
      * `getRecordColumnValues`
      * `getRecordKeywords`
      * `getRecordFilterValues`
      * `getRecordColor`

      The adapter will need to be registered
      in the application's container as `dataAdapter:main`.

      Example:

      ```javascript
      Application.initializer({
        name: "data-adapter",

        initialize: function(application) {
          application.register('data-adapter:main', DS.DataAdapter);
        }
      });
      ```

      @class DataAdapter
      @extends EmberObject
      @public
    */
  export default class DataAdapter<T> extends EmberObject {
    releaseMethods: NativeArray<() => void>;
    recordsWatchers: Map<
      unknown,
      {
        release: () => void;
        revalidate: () => void;
      }
    >;
    typeWatchers: Map<
      unknown,
      {
        release: () => void;
        revalidate: () => void;
      }
    >;
    flushWatchers: (() => void) | null;
    containerDebugAdapter: ContainerDebugAdapter;
    constructor(owner: Owner);
    /**
          The container-debug-adapter which is used
          to list all models.
      
          @property containerDebugAdapter
          @default undefined
          @since 1.5.0
          @public
        **/
    /**
          The number of attributes to send
          as columns. (Enough to make the record
          identifiable).
      
          @private
          @property attributeLimit
          @default 3
          @since 1.3.0
        */
    attributeLimit: number;
    /**
           Ember Data > v1.0.0-beta.18
           requires string model names to be passed
           around instead of the actual factories.
      
           This is a stamp for the Ember Inspector
           to differentiate between the versions
           to be able to support older versions too.
      
           @public
           @property acceptsModelName
         */
    acceptsModelName: boolean;
    /**
           Map from records arrays to RecordsWatcher instances
      
           @private
           @property recordsWatchers
           @since 3.26.0
         */
    /**
          Map from records arrays to TypeWatcher instances
      
          @private
          @property typeWatchers
          @since 3.26.0
         */
    /**
          Callback that is currently scheduled on backburner end to flush and check
          all active watchers.
      
          @private
          @property flushWatchers
          @since 3.26.0
      
         */
    /**
          Stores all methods that clear observers.
          These methods will be called on destruction.
      
          @private
          @property releaseMethods
          @since 1.3.0
        */
    /**
          Specifies how records can be filtered.
          Records returned will need to have a `filterValues`
          property with a key for every name in the returned array.
      
          @public
          @method getFilters
          @return {Array} List of objects defining filters.
           The object should have a `name` and `desc` property.
        */
    getFilters(): Array<{
      name: string;
      desc: string;
    }>;
    /**
          Fetch the model types and observe them for changes.
      
          @public
          @method watchModelTypes
      
          @param {Function} typesAdded Callback to call to add types.
          Takes an array of objects containing wrapped types (returned from `wrapModelType`).
      
          @param {Function} typesUpdated Callback to call when a type has changed.
          Takes an array of objects containing wrapped types.
      
          @return {Function} Method to call to remove all observers
        */
    watchModelTypes(
      typesAdded: (types: WrappedType[]) => void,
      typesUpdated: (types: WrappedType[]) => void
    ): () => void;
    _nameToClass(type: unknown): unknown;
    /**
          Fetch the records of a given type and observe them for changes.
      
          @public
          @method watchRecords
      
          @param {String} modelName The model name.
      
          @param {Function} recordsAdded Callback to call to add records.
          Takes an array of objects containing wrapped records.
          The object should have the following properties:
            columnValues: {Object} The key and value of a table cell.
            object: {Object} The actual record object.
      
          @param {Function} recordsUpdated Callback to call when a record has changed.
          Takes an array of objects containing wrapped records.
      
          @param {Function} recordsRemoved Callback to call when a record has removed.
          Takes an array of objects containing wrapped records.
      
          @return {Function} Method to call to remove all observers.
        */
    watchRecords(
      modelName: string,
      recordsAdded: RecordCallback<T>,
      recordsUpdated: RecordCallback<T>,
      recordsRemoved: RecordCallback<T>
    ): () => void;
    updateFlushWatchers(): void;
    /**
          Clear all observers before destruction
          @private
          @method willDestroy
        */
    willDestroy(): void;
    /**
          Detect whether a class is a model.
      
          Test that against the model class
          of your persistence library.
      
          @public
          @method detect
          @return boolean Whether the class is a model class or not.
        */
    detect(_klass: unknown): boolean;
    /**
          Get the columns for a given model type.
      
          @public
          @method columnsForType
          @return {Array} An array of columns of the following format:
           name: {String} The name of the column.
           desc: {String} Humanized description (what would show in a table column name).
        */
    columnsForType(_klass: unknown): Column[];
    /**
          Adds observers to a model type class.
      
          @private
          @method observeModelType
          @param {String} modelName The model type name.
          @param {Function} typesUpdated Called when a type is modified.
          @return {Function} The function to call to remove observers.
        */
    observeModelType(modelName: string, typesUpdated: (types: WrappedType[]) => void): () => void;
    /**
          Wraps a given model type and observes changes to it.
      
          @private
          @method wrapModelType
          @param {Class} klass A model class.
          @param {String} modelName Name of the class.
          @return {Object} The wrapped type has the following format:
            name: {String} The name of the type.
            count: {Integer} The number of records available.
            columns: {Columns} An array of columns to describe the record.
            object: {Class} The actual Model type class.
        */
    wrapModelType<N extends string>(klass: unknown, name: N): WrappedType<N>;
    /**
          Fetches all models defined in the application.
      
          @private
          @method getModelTypes
          @return {Array} Array of model types.
        */
    getModelTypes(): Array<{
      klass: unknown;
      name: string;
    }>;
    /**
          Loops over all namespaces and all objects
          attached to them.
      
          @private
          @method _getObjectsOnNamespaces
          @return {Array} Array of model type strings.
        */
    _getObjectsOnNamespaces(): string[];
    /**
          Fetches all loaded records for a given type.
      
          @public
          @method getRecords
          @return {Array} An array of records.
           This array will be observed for changes,
           so it should update when new records are added/removed.
        */
    getRecords(_klass: unknown, _name: string): NativeArray<T>;
    /**
          Wraps a record and observers changes to it.
      
          @private
          @method wrapRecord
          @param {Object} record The record instance.
          @return {Object} The wrapped record. Format:
          columnValues: {Array}
          searchKeywords: {Array}
        */
    wrapRecord(record: T): WrappedRecord<T>;
    /**
          Gets the values for each column.
      
          @public
          @method getRecordColumnValues
          @return {Object} Keys should match column names defined
          by the model type.
        */
    getRecordColumnValues(_record: T): {};
    /**
          Returns keywords to match when searching records.
      
          @public
          @method getRecordKeywords
          @return {Array} Relevant keywords for search.
        */
    getRecordKeywords(_record: T): NativeArray<unknown>;
    /**
          Returns the values of filters defined by `getFilters`.
      
          @public
          @method getRecordFilterValues
          @param {Object} record The record instance.
          @return {Object} The filter values.
        */
    getRecordFilterValues(_record: T): object;
    /**
          Each record can have a color that represents its state.
      
          @public
          @method getRecordColor
          @param {Object} record The record instance
          @return {String} The records color.
            Possible options: black, red, blue, green.
        */
    getRecordColor(_record: T): RecordColor | null;
  }
  export {};
}
