import { getOwner } from 'ember-utils';
import { get, run } from 'ember-metal';
import {
  String as StringUtils,
  Namespace,
  Object as EmberObject,
  A as emberA,
  addArrayObserver,
  removeArrayObserver,
  objectAt
} from 'ember-runtime';
import { Application } from 'ember-application';

/**
@module ember
@submodule ember-extension-support
*/

/**
  The `DataAdapter` helps a data persistence library
  interface with tools that debug Ember such
  as the [Ember Extension](https://github.com/tildeio/ember-extension)
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
  * `observeRecord`

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
  @namespace Ember
  @extends EmberObject
  @public
*/
export default EmberObject.extend({
  init() {
    this._super(...arguments);
    this.releaseMethods = emberA();
  },

  /**
    The container-debug-adapter which is used
    to list all models.

    @property containerDebugAdapter
    @default undefined
    @since 1.5.0
    @public
  **/
  containerDebugAdapter: undefined,

  /**
    The number of attributes to send
    as columns. (Enough to make the record
    identifiable).

    @private
    @property attributeLimit
    @default 3
    @since 1.3.0
  */
  attributeLimit: 3,

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
  acceptsModelName: true,

  /**
    Stores all methods that clear observers.
    These methods will be called on destruction.

    @private
    @property releaseMethods
    @since 1.3.0
  */
  releaseMethods: emberA(),

  /**
    Specifies how records can be filtered.
    Records returned will need to have a `filterValues`
    property with a key for every name in the returned array.

    @public
    @method getFilters
    @return {Array} List of objects defining filters.
     The object should have a `name` and `desc` property.
  */
  getFilters() {
    return emberA();
  },

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
  watchModelTypes(typesAdded, typesUpdated) {
    let modelTypes = this.getModelTypes();
    let releaseMethods = emberA();
    let typesToSend;

    typesToSend = modelTypes.map(type => {
      let klass = type.klass;
      let wrapped = this.wrapModelType(klass, type.name);
      releaseMethods.push(this.observeModelType(type.name, typesUpdated));
      return wrapped;
    });

    typesAdded(typesToSend);

    let release = () => {
      releaseMethods.forEach((fn) => fn());
      this.releaseMethods.removeObject(release);
    };
    this.releaseMethods.pushObject(release);
    return release;
  },

  _nameToClass(type) {
    if (typeof type === 'string') {
      type = getOwner(this)._lookupFactory(`model:${type}`);
    }
    return type;
  },

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
    Takes the following parameters:
      index: The array index where the records were removed.
      count: The number of records removed.

    @return {Function} Method to call to remove all observers.
  */
  watchRecords(modelName, recordsAdded, recordsUpdated, recordsRemoved) {
    let releaseMethods = emberA();
    let klass = this._nameToClass(modelName);
    let records = this.getRecords(klass, modelName);
    let release;

    function recordUpdated(updatedRecord) {
      recordsUpdated([updatedRecord]);
    }

    let recordsToSend = records.map((record) => {
      releaseMethods.push(this.observeRecord(record, recordUpdated));
      return this.wrapRecord(record);
    });

    let contentDidChange = (array, idx, removedCount, addedCount) => {
      for (let i = idx; i < idx + addedCount; i++) {
        let record = objectAt(array, i);
        let wrapped = this.wrapRecord(record);
        releaseMethods.push(this.observeRecord(record, recordUpdated));
        recordsAdded([wrapped]);
      }

      if (removedCount) {
        recordsRemoved(idx, removedCount);
      }
    };

    let observer = { didChange: contentDidChange, willChange() { return this; } };
    addArrayObserver(records, this, observer);

    release = () => {
      releaseMethods.forEach(fn => fn());
      removeArrayObserver(records, this, observer);
      this.releaseMethods.removeObject(release);
    };

    recordsAdded(recordsToSend);

    this.releaseMethods.pushObject(release);
    return release;
  },

  /**
    Clear all observers before destruction
    @private
    @method willDestroy
  */
  willDestroy() {
    this._super(...arguments);
    this.releaseMethods.forEach(fn => fn());
  },

  /**
    Detect whether a class is a model.

    Test that against the model class
    of your persistence library.

    @private
    @method detect
    @param {Class} klass The class to test.
    @return boolean Whether the class is a model class or not.
  */
  detect(klass) {
    return false;
  },

  /**
    Get the columns for a given model type.

    @private
    @method columnsForType
    @param {Class} type The model type.
    @return {Array} An array of columns of the following format:
     name: {String} The name of the column.
     desc: {String} Humanized description (what would show in a table column name).
  */
  columnsForType(type) {
    return emberA();
  },

  /**
    Adds observers to a model type class.

    @private
    @method observeModelType
    @param {String} modelName The model type name.
    @param {Function} typesUpdated Called when a type is modified.
    @return {Function} The function to call to remove observers.
  */

  observeModelType(modelName, typesUpdated) {
    let klass = this._nameToClass(modelName);
    let records = this.getRecords(klass, modelName);

    function onChange() {
      typesUpdated([this.wrapModelType(klass, modelName)]);
    }

    let observer = {
      didChange() {
        run.scheduleOnce('actions', this, onChange);
      },
      willChange() { return this; }
    };

    addArrayObserver(records, this, observer);

    let release = () => removeArrayObserver(records, this, observer);

    return release;
  },


  /**
    Wraps a given model type and observes changes to it.

    @private
    @method wrapModelType
    @param {Class} klass A model class.
    @param {String} modelName Name of the class.
    @return {Object} Contains the wrapped type and the function to remove observers
    Format:
      type: {Object} The wrapped type.
        The wrapped type has the following format:
          name: {String} The name of the type.
          count: {Integer} The number of records available.
          columns: {Columns} An array of columns to describe the record.
          object: {Class} The actual Model type class.
      release: {Function} The function to remove observers.
  */
  wrapModelType(klass, name) {
    let records = this.getRecords(klass, name);
    let typeToSend;

    typeToSend = {
      name,
      count: get(records, 'length'),
      columns: this.columnsForType(klass),
      object: klass
    };

    return typeToSend;
  },


  /**
    Fetches all models defined in the application.

    @private
    @method getModelTypes
    @return {Array} Array of model types.
  */
  getModelTypes() {
    let containerDebugAdapter = this.get('containerDebugAdapter');
    let types;

    if (containerDebugAdapter.canCatalogEntriesByType('model')) {
      types = containerDebugAdapter.catalogEntriesByType('model');
    } else {
      types = this._getObjectsOnNamespaces();
    }

    // New adapters return strings instead of classes.
    types = emberA(types).map((name) => {
      return {
        klass: this._nameToClass(name),
        name: name
      };
    });
    types = emberA(types).filter(type => this.detect(type.klass));

    return emberA(types);
  },

  /**
    Loops over all namespaces and all objects
    attached to them.

    @private
    @method _getObjectsOnNamespaces
    @return {Array} Array of model type strings.
  */
  _getObjectsOnNamespaces() {
    let namespaces = emberA(Namespace.NAMESPACES);
    let types = emberA();

    namespaces.forEach(namespace => {
      for (let key in namespace) {
        if (!namespace.hasOwnProperty(key)) { continue; }
        // Even though we will filter again in `getModelTypes`,
        // we should not call `lookupFactory` on non-models
        // (especially when `EmberENV.MODEL_FACTORY_INJECTIONS` is `true`)
        if (!this.detect(namespace[key])) { continue; }
        let name = StringUtils.dasherize(key);
        if (!(namespace instanceof Application) && namespace.toString()) {
          name = `${namespace}/${name}`;
        }
        types.push(name);
      }
    });
    return types;
  },

  /**
    Fetches all loaded records for a given type.

    @private
    @method getRecords
    @return {Array} An array of records.
     This array will be observed for changes,
     so it should update when new records are added/removed.
  */
  getRecords(type) {
    return emberA();
  },

  /**
    Wraps a record and observers changes to it.

    @private
    @method wrapRecord
    @param {Object} record The record instance.
    @return {Object} The wrapped record. Format:
    columnValues: {Array}
    searchKeywords: {Array}
  */
  wrapRecord(record) {
    let recordToSend = { object: record };

    recordToSend.columnValues = this.getRecordColumnValues(record);
    recordToSend.searchKeywords = this.getRecordKeywords(record);
    recordToSend.filterValues = this.getRecordFilterValues(record);
    recordToSend.color = this.getRecordColor(record);

    return recordToSend;
  },

  /**
    Gets the values for each column.

    @private
    @method getRecordColumnValues
    @return {Object} Keys should match column names defined
    by the model type.
  */
  getRecordColumnValues(record) {
    return {};
  },

  /**
    Returns keywords to match when searching records.

    @private
    @method getRecordKeywords
    @return {Array} Relevant keywords for search.
  */
  getRecordKeywords(record) {
    return emberA();
  },

  /**
    Returns the values of filters defined by `getFilters`.

    @private
    @method getRecordFilterValues
    @param {Object} record The record instance.
    @return {Object} The filter values.
  */
  getRecordFilterValues(record) {
    return {};
  },

  /**
    Each record can have a color that represents its state.

    @private
    @method getRecordColor
    @param {Object} record The record instance
    @return {String} The records color.
      Possible options: black, red, blue, green.
  */
  getRecordColor(record) {
    return null;
  },

  /**
    Observes all relevant properties and re-sends the wrapped record
    when a change occurs.

    @private
    @method observerRecord
    @param {Object} record The record instance.
    @param {Function} recordUpdated The callback to call when a record is updated.
    @return {Function} The function to call to remove all observers.
  */
  observeRecord(record, recordUpdated) {
    return function() {};
  }
});
