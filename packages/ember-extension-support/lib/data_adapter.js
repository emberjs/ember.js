/**
@module ember
@submodule ember-extension-support
*/

require('ember-application');

/**
  The `DataAdapter` helps a data persistence library
  interface with tools that debug Ember such
  as the Chrome Ember Extension.

  This class will be extended by a persistence library
  which will override some of the methods with
  library-specific code.

  The methods likely to be overriden are
  `getFilters`, `detect`, `columnsForType`,
  `getRecords`, `getRecordColumnValues`,
  `getRecordKeywords`, `getRecordFilterValues`,
  `getRecordColor`, `observeRecord`

  The adapter will need to be registered
  in the application's container as `dataAdapter:main`

  Example:
  ```javascript
  Application.initializer({
    name: "dataAdapter",

    initialize: function(container, application) {
      application.register('dataAdapter:main', DS.DataAdapter);
    }
  });
  ```

  @class DataAdapter
  @namespace Ember
  @extends Ember.Object
*/
Ember.DataAdapter = Ember.Object.extend({
  init: function() {
    this._super();
    this.releaseMethods = Ember.A();
  },

  /**
    The container of the application being debugged.
    This property will be injected
    on creation.
  */
  container: null,

  /**
    @private

    Number of attributes to send
    as columns. (Enough to make the record
    identifiable).
  */
  attributeLimit: 3,

  /**
    @private

    Stores all methods that clear observers.
    These methods will be called on destruction.
  */
  releaseMethods: Ember.A(),

  /**
    @public

    Specifies how records can be filtered.
    Records returned will need to have a `filterValues`
    property with a key for every name in the returned array.

    @method getFilters
    @return {Array} List of objects defining filters.
     The object should have a `name` and `desc` property.
  */
  getFilters: function() {
    return Ember.A();
  },

  /**
    @public

    Fetch the model types and observe them for changes.

    @method watchModelTypes

    @param {Function} typesAdded Callback to call to add types.
    Takes an array of objects containing wrapped types (returned from `wrapModelType`).

    @param {Function} typesUpdated Callback to call when a type has changed.
    Takes an array of objects containing wrapped types.

    @return {Function} Method to call to remove all observers
  */
  watchModelTypes: function(typesAdded, typesUpdated) {
    var modelTypes = this.getModelTypes(),
        self = this, typesToSend, releaseMethods = Ember.A();

    typesToSend = modelTypes.map(function(type) {
      var wrapped = self.wrapModelType(type);
      releaseMethods.push(self.observeModelType(type, typesUpdated));
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

  /**
    @public

    Fetch the records of a given type and observe them for changes.

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
    var self = this, releaseMethods = Ember.A(), records = this.getRecords(type), release;

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
    @private

    Clear all observers before destruction
  */
  willDestroy: function() {
    this._super();
    this.releaseMethods.forEach(function(fn) {
      fn();
    });
  },

  /**
    @private

    Detect whether a class is a model.

    Test that against the model class
    of your persistence library

    @method detect
    @param {Class} klass The class to test
    @return boolean Whether the class is a model class or not
  */
  detect: function(klass) {
    return false;
  },

  /**
    @private

    Get the columns for a given model type.

    @method columnsForType
    @param {Class} type The model type
    @return {Array} An array of columns of the following format:
     name: {String} name of the column
     desc: {String} Humanized description (what would show in a table column name)
  */
  columnsForType: function(type) {
    return Ember.A();
  },

  /**
    @private

    Adds observers to a model type class.

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
        Ember.run.scheduleOnce('actions', this, onChange);
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
    @private

    Wraps a given model type and observes changes to it.

    @method wrapModelType
    @param {Class} type A model class
    @param {Function} typesUpdated callback to call when the type changes
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
  wrapModelType: function(type, typesUpdated) {
    var release, records = this.getRecords(type),
        typeToSend, self = this;

    typeToSend = {
      name: type.toString(),
      count: Ember.get(records, 'length'),
      columns: this.columnsForType(type),
      object: type
    };


    return typeToSend;
  },


  /**
    @private

    Fetches all models defined in the application.
    TODO: Use the resolver instead of looping over namespaces.

    @method getModelTypes
    @return {Array} Array of model types
  */
  getModelTypes: function() {
    var namespaces = Ember.A(Ember.Namespace.NAMESPACES), types = Ember.A(), self = this;

    namespaces.forEach(function(namespace) {
      for (var key in namespace) {
        if (!namespace.hasOwnProperty(key)) { continue; }
        var klass = namespace[key];
        if (self.detect(klass)) {
          types.push(klass);
        }
      }
    });
    return types;
  },

  /**
    @private

    Fetches all loaded records for a given type.

    @method getRecords
    @return {Array} array of records.
     This array will be observed for changes,
     so it should update when new records are added/removed.
  */
  getRecords: function(type) {
    return Ember.A();
  },

  /**
    @private

    Wraps a record and observers changes to it

    @method wrapRecord
    @param {Object} record The record instance
    @return {Object} the wrapped record. Format:
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
    @private

    Gets the values for each column.

    @method getRecordColumnValues
    @return {Object} Keys should match column names defined
    by the model type.
  */
  getRecordColumnValues: function(record) {
    return {};
  },

  /**
    @private

    Returns keywords to match when searching records.

    @method getRecordKeywords
    @return {Array} Relevant keywords for search.
  */
  getRecordKeywords: function(record) {
    return Ember.A();
  },

  /**
    @private

    Returns the values of filters defined by `getFilters`.

    @method getRecordFilterValues
    @param {Object} record The record instance
    @return {Object} The filter values
  */
  getRecordFilterValues: function(record) {
    return {};
  },

  /**
    @private

    Each record can have a color that represents its state.

    @method getRecordColor
    @param {Object} record The record instance
    @return {String} The record's color
      Possible options: black, red, blue, green
  */
  getRecordColor: function(record) {
    return null;
  },

  /**
    @private

    Observes all relevant properties and re-sends the wrapped record
    when a change occurs.

    @method observerRecord
    @param {Object} record The record instance
    @param {Function} recordUpdated The callback to call when a record is updated.
    @return {Function} The function to call to remove all observers.
  */
  observeRecord: function(record, recordUpdated) {
    return function(){};
  }

});

