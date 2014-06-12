import Ember from "ember-metal/core";
import { get } from "ember-metal/property_get";
import run from "ember-metal/run_loop";
import { dasherize } from "ember-runtime/system/string";
import Namespace from "ember-runtime/system/namespace";
import EmberObject from "ember-runtime/system/object";
import { A as emberA } from "ember-runtime/system/native_array";
import Application from "ember-application/system/application";

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
  in the application's container as `dataAdapter:main`

  Example:

  ```javascript
  Application.initializer({
    name: "data-adapter",

    initialize: function(container, application) {
      application.register('data-adapter:main', DS.DataAdapter);
    }
  });
  ```

  @class DataAdapter
  @namespace Ember
  @extends EmberObject
*/
export default EmberObject.extend({
  init: function() {
    this._super();
    this.releaseMethods = emberA();
  },

  /**
    The container of the application being debugged.
    This property will be injected
    on creation.

    @property container
    @default null
    @since 1.3.0
  */
  container: null,


  /**
    The container-debug-adapter which is used
    to list all models.

    @property containerDebugAdapter
    @default undefined
    @since 1.5.0
  **/
  containerDebugAdapter: undefined,

  /**
    Number of attributes to send
    as columns. (Enough to make the record
    identifiable).

    @private
    @property attributeLimit
    @default 3
    @since 1.3.0
  */
  attributeLimit: 3,

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
  getFilters: function() {
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
  watchModelTypes: function(typesAdded, typesUpdated) {
    var modelTypes = this.getModelTypes(),
        self = this, typesToSend, releaseMethods = emberA();

    typesToSend = modelTypes.map(function(type) {
      var klass = type.klass;
      var wrapped = self.wrapModelType(klass, type.name);
      releaseMethods.push(self.observeModelType(klass, typesUpdated));
      return wrapped;
    });

    typesAdded(typesToSend);

    var release = function() {
      releaseMethods.forEach(function(fn) { fn(); });
      self.releaseMethods.removeObject(release);
    };
    this.releaseMethods.pushObject(release);
    return release;
  },

  _nameToClass: function(type) {
    if (typeof type === 'string') {
      type = this.container.lookupFactory('model:' + type);
    }
    return type;
  },

  /**
    Fetch the records of a given type and observe them for changes.

    @public
    @method watchRecords

    @param {Function} recordsAdded Callback to call to add records.
    Takes an array of objects containing wrapped records.
    The object should have the following properties:
      columnValues: {Object} key and value of a table cell
      object: {Object} the actual record object

    @param {Function} recordsUpdated Callback to call when a record has changed.
    Takes an array of objects containing wrapped records.

    @param {Function} recordsRemoved Callback to call when a record has removed.
    Takes the following parameters:
      index: the array index where the records were removed
      count: the number of records removed

    @return {Function} Method to call to remove all observers
  */
  watchRecords: function(type, recordsAdded, recordsUpdated, recordsRemoved) {
    var self = this, releaseMethods = emberA(), records = this.getRecords(type), release;

    var recordUpdated = function(updatedRecord) {
      recordsUpdated([updatedRecord]);
    };

    var recordsToSend = records.map(function(record) {
      releaseMethods.push(self.observeRecord(record, recordUpdated));
      return self.wrapRecord(record);
    });


    var contentDidChange = function(array, idx, removedCount, addedCount) {
      for (var i = idx; i < idx + addedCount; i++) {
        var record = array.objectAt(i);
        var wrapped = self.wrapRecord(record);
        releaseMethods.push(self.observeRecord(record, recordUpdated));
        recordsAdded([wrapped]);
      }

      if (removedCount) {
        recordsRemoved(idx, removedCount);
      }
    };

    var observer = { didChange: contentDidChange, willChange: Ember.K };
    records.addArrayObserver(self, observer);

    release = function() {
      releaseMethods.forEach(function(fn) { fn(); });
      records.removeArrayObserver(self, observer);
      self.releaseMethods.removeObject(release);
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
  willDestroy: function() {
    this._super();
    this.releaseMethods.forEach(function(fn) {
      fn();
    });
  },

  /**
    Detect whether a class is a model.

    Test that against the model class
    of your persistence library

    @private
    @method detect
    @param {Class} klass The class to test
    @return boolean Whether the class is a model class or not
  */
  detect: function(klass) {
    return false;
  },

  /**
    Get the columns for a given model type.

    @private
    @method columnsForType
    @param {Class} type The model type
    @return {Array} An array of columns of the following format:
     name: {String} name of the column
     desc: {String} Humanized description (what would show in a table column name)
  */
  columnsForType: function(type) {
    return emberA();
  },

  /**
    Adds observers to a model type class.

    @private
    @method observeModelType
    @param {Class} type The model type class
    @param {Function} typesUpdated Called when a type is modified.
    @return {Function} The function to call to remove observers
  */

  observeModelType: function(type, typesUpdated) {
    var self = this, records = this.getRecords(type);

    var onChange = function() {
      typesUpdated([self.wrapModelType(type)]);
    };
    var observer = {
      didChange: function() {
        run.scheduleOnce('actions', this, onChange);
      },
      willChange: Ember.K
    };

    records.addArrayObserver(this, observer);

    var release = function() {
      records.removeArrayObserver(self, observer);
    };

    return release;
  },


  /**
    Wraps a given model type and observes changes to it.

    @private
    @method wrapModelType
    @param {Class} type A model class
    @param {String}  Optional name of the class
    @return {Object} contains the wrapped type and the function to remove observers
    Format:
      type: {Object} the wrapped type
        The wrapped type has the following format:
          name: {String} name of the type
          count: {Integer} number of records available
          columns: {Columns} array of columns to describe the record
          object: {Class} the actual Model type class
      release: {Function} The function to remove observers
  */
  wrapModelType: function(type, name) {
    var release, records = this.getRecords(type),
        typeToSend, self = this;

    typeToSend = {
      name: name || type.toString(),
      count: get(records, 'length'),
      columns: this.columnsForType(type),
      object: type
    };


    return typeToSend;
  },


  /**
    Fetches all models defined in the application.

    @private
    @method getModelTypes
    @return {Array} Array of model types
  */
  getModelTypes: function() {
    var types, self = this,
        containerDebugAdapter = this.get('containerDebugAdapter');

    if (containerDebugAdapter.canCatalogEntriesByType('model')) {
      types = containerDebugAdapter.catalogEntriesByType('model');
    } else {
      types = this._getObjectsOnNamespaces();
    }

    // New adapters return strings instead of classes
    types = emberA(types).map(function(name) {
      return {
        klass: self._nameToClass(name),
        name: name
      };
    });
    types = emberA(types).filter(function(type) {
      return self.detect(type.klass);
    });

    return emberA(types);
  },

  /**
    Loops over all namespaces and all objects
    attached to them

    @private
    @method _getObjectsOnNamespaces
    @return {Array} Array of model type strings
  */
  _getObjectsOnNamespaces: function() {
    var namespaces = emberA(Namespace.NAMESPACES),
        types = emberA(),
        self = this;

    namespaces.forEach(function(namespace) {
      for (var key in namespace) {
        if (!namespace.hasOwnProperty(key)) { continue; }
        // Even though we will filter again in `getModelTypes`,
        // we should not call `lookupContainer` on non-models
        // (especially when `Ember.MODEL_FACTORY_INJECTIONS` is `true`)
        if (!self.detect(namespace[key])) { continue; }
        var name = dasherize(key);
        if (!(namespace instanceof Application) && namespace.toString()) {
          name = namespace + '/' + name;
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
  getRecords: function(type) {
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
  wrapRecord: function(record) {
    var recordToSend = { object: record }, columnValues = {}, self = this;

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
  getRecordColumnValues: function(record) {
    return {};
  },

  /**
    Returns keywords to match when searching records.

    @private
    @method getRecordKeywords
    @return {Array} Relevant keywords for search.
  */
  getRecordKeywords: function(record) {
    return emberA();
  },

  /**
    Returns the values of filters defined by `getFilters`.

    @private
    @method getRecordFilterValues
    @param {Object} record The record instance
    @return {Object} The filter values
  */
  getRecordFilterValues: function(record) {
    return {};
  },

  /**
    Each record can have a color that represents its state.

    @private
    @method getRecordColor
    @param {Object} record The record instance
    @return {String} The record's color
      Possible options: black, red, blue, green
  */
  getRecordColor: function(record) {
    return null;
  },

  /**
    Observes all relevant properties and re-sends the wrapped record
    when a change occurs.

    @private
    @method observerRecord
    @param {Object} record The record instance
    @param {Function} recordUpdated The callback to call when a record is updated.
    @return {Function} The function to call to remove all observers.
  */
  observeRecord: function(record, recordUpdated) {
    return function(){};
  }
});
