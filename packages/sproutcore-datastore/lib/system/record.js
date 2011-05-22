// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime');
require('sproutcore-datastore/system/query');
require('sproutcore-datastore/system/store_error');

var get = SC.get, set = SC.set, none = SC.none, copy = SC.copy, K;

/**
  @class

  A Record is the core model class in SproutCore. It is analogous to
  NSManagedObject in Core Data and EOEnterpriseObject in the Enterprise
  Objects Framework (aka WebObjects), or ActiveRecord::Base in Rails.

  To create a new model class, in your SproutCore workspace, do:

      $ sc-gen model MyApp.MyModel

  This will create MyApp.MyModel in clients/my_app/models/my_model.js.

  The core attributes hash is used to store the values of a record in a
  format that can be easily passed to/from the server.  The values should
  generally be stored in their raw string form.  References to external
  records should be stored as primary keys.

  Normally you do not need to work with the attributes hash directly.
  Instead you should use get/set on normal record properties.  If the
  property is not defined on the object, then the record will check the
  attributes hash instead.

  You can bulk update attributes from the server using the
  `updateAttributes()` method.

  @extends SC.Object
  @see SC.RecordAttribute
  @since SproutCore 1.0
*/
SC.Record = SC.Object.extend(
/** @scope SC.Record.prototype */ {

  /**
    Deprecated.  Use instanceof keyword instead.  

    @deprecated
    @type Boolean
    @default YES
  */
  isRecord: YES,

  /**
    If you have nested records

    @type Boolean
    @default NO
  */
  isParentRecord: NO,

  // ...............................
  // PROPERTIES
  //

  /**
    This is the primary key used to distinguish records.  If the keys
    match, the records are assumed to be identical.

    @type String
    @default 'guid'
  */
  primaryKey: 'guid',

  /**
    Returns the id for the record instance.  The id is used to uniquely
    identify this record instance from all others of the same type.  If you
    have a `primaryKey set on this class, then the id will be the value of the
    `primaryKey` property on the underlying JSON hash.

    @type String
    @property
    @dependsOn storeKey
  */
  id: function(key, value) {
    if (value !== undefined) {
      this.writeAttribute(get(this, 'primaryKey'), value);
      return value;
    } else {
      return SC.Store.idFor(get(this, 'storeKey'));
    }
  }.property('storeKey').cacheable(),

  /**
    All records generally have a life cycle as they are created or loaded into
    memory, modified, committed and finally destroyed.  This life cycle is
    managed by the status property on your record.

    The status of a record is modelled as a finite state machine.  Based on the
    current state of the record, you can determine which operations are
    currently allowed on the record and which are not.

    In general, a record can be in one of five primary states:
    `SC.Record.EMPTY`, `SC.Record.BUSY`, `SC.Record.READY`,
    `SC.Record.DESTROYED`, `SC.Record.ERROR`.  These are all described in
    more detail in the class mixin (below) where they are defined.

    @type Number
    @property
    @dependsOn storeKey
  */
  status: function() {
    return this.store.readStatus(get(this, 'storeKey'));
  }.property('storeKey').cacheable(),

  /**
    The store that owns this record.  All changes will be buffered into this
    store and committed to the rest of the store chain through here.

    This property is set when the record instance is created and should not be
    changed or else it will break the record behavior.

    @type SC.Store
    @default null
  */
  store: null,

  /**
    This is the store key for the record, it is used to link it back to the
    dataHash. If a record is reused, this value will be replaced.

    You should not edit this store key but you may sometimes need to refer to
    this store key when implementing a Server object.

    @type Number
    @default null
  */
  storeKey: null,

  /**
    YES when the record has been destroyed

    @type Boolean
    @property
    @dependsOn status
  */
  isDestroyed: function() {
    return !!(get(this, 'status') & SC.Record.DESTROYED);
  }.property('status').cacheable(),

  /**
    `YES` when the record is in an editable state.  You can use this property 
    to quickly determine whether attempting to modify the record would raise 
    an exception.

    This property is both readable and writable.  Note however that if you
    set this property to `YES` but the status of the record is anything but
    `SC.Record.READY`, the return value of this property may remain `NO`.

    @type Boolean
    @property
    @dependsOn status
  */
  isEditable: function(key, value) {
    if (value !== undefined) this._screc_isEditable = value;
    return (get(this, 'status') & SC.Record.READY) && this._screc_isEditable;
  }.property('status').cacheable(),

  /**
    @private

    Backing value for isEditable
  */
  _screc_isEditable: YES, // default

  /**
    `YES` when the record's contents have been loaded for the first time.  You
    can use this to quickly determine if the record is ready to display.

    @type Boolean
    @property
    @dependsOn status
  */
  isLoaded: function() {
    var status = get(this, 'status');
    return !((status===K.EMPTY) || (status===K.BUSY_LOADING) || (status===K.ERROR));
  }.property('status').cacheable(),

  /**
    If set, this should be an array of active relationship objects that need
    to be notified whenever the underlying record properties change.
    Currently this is only used by toMany relationships, but you could
    possibly patch into this yourself also if you are building your own
    relationships.

    @type Array
    @default null
  */
  relationships: null,

  /**
    This will return the raw attributes that you can edit directly.  If you
    make changes to this hash, be sure to call `beginEditing()` before you get
    the attributes and `endEditing()` afterwards.

    @type Hash
    @property
  **/
  attributes: function() {
    return get(this, 'store').readEditableDataHash(get(this, 'storeKey'));
  }.property(),

  /**
    This will return the raw attributes that you cannot edit directly.  It is
    useful if you want to efficiently look at multiple attributes in bulk.  If
    you would like to edit the attributes, see the `attributes` property
    instead.

    @type Hash
    @property
  **/
  readOnlyAttributes: function() {
    var ret = get(this, 'store').readDataHash(get(this, 'storeKey'));
    return ret ? copy(ret) : null;
  }.property(),

  /**
    The namespace which to retrieve the childRecord Types from

    @type String
    @default null
  */
  nestedRecordNamespace: null,

  /**
    Whether or not this is a nested Record.

    @type Boolean
    @property
  */
  isNestedRecord: function(){
    var store = get(this, 'store'), sk = get(this, 'storeKey');
    return !!store.parentStoreKeyExists(sk);
  }.property('storeKey').cacheable(),

  /**
    The parent record if this is a nested record.

    @type Boolean
    @property
  */
  parentRecord: function(){
    var sk = get(this, 'storeKey'), store = get(this, 'store');
    return store.materializeParentRecord(sk);
  }.property('storeKey').cacheable(),

  // ...............................
  // CRUD OPERATIONS
  //

  /**
    Refresh the record from the persistent store.  If the record was loaded
    from a persistent store, then the store will be asked to reload the
    record data from the server.  If the record is new and exists only in
    memory then this call will have no effect.

    @param {boolean} recordOnly 
      optional param if you want to only this record even if it is a child 
      record.
    
    @param {Function} callback 
      optional callback that will fire when request finishes

    @returns {SC.Record} receiver
  */
  refresh: function(recordOnly, callback) {
    var store = get(this, 'store'), rec, ro,
        sk = get(this, 'storeKey'),
        prKey = store.parentStoreKeyExists();

    if (!callback && 'function'===typeof recordOnly) {
      callback = recordOnly;
      recordOnly =  false;
    }
    
    // If we only want to refresh this record or it doesn't have a parent 
    // record we will commit this record
    if (recordOnly || (none(recordOnly) && none(prKey))) {
      store.refreshRecord(null, null, sk, callback);
    } else if (prKey) {
      rec = store.materializeRecord(prKey);
      rec.refresh(false, callback);
    }

    return this ;
  },

  /**
    Deletes the record along with any dependent records.  This will mark the
    records destroyed in the store as well as changing the isDestroyed
    property on the record to YES.  If this is a new record, this will avoid
    creating the record in the first place.

    @param {boolean} recordOnly 
      optional param if you want to only THIS record even if it is a child 
      record.

    @returns {SC.Record} receiver
  */
  destroy: function(recordOnly) {
    var store = get(this, 'store'), rec, ro,
        sk = get(this, 'storeKey'),
        prKey = store.parentStoreKeyExists();

    // If we only want to destroy this record or it doesn't have a parent 
    // record we will commit this record
    ro = recordOnly || (none(recordOnly) && none(prKey));
    if (ro){
      SC.propertyWillChange(this, 'status');
      store.destroyRecord(null, null, sk);
      SC.propertyDidChange(this, 'status');

      // If there are any aggregate records, we might need to propagate our 
      // new status to them.
      this.propagateToAggregates();

    } else if (prKey){
      rec = store.materializeRecord(prKey);
      rec.destroy(false);
    }

    return this ;
  },

  /**
    You can invoke this method anytime you need to make the record as dirty.
    This will cause the record to be commited when you `commitChanges()`
    on the underlying store.

    If you use the `writeAttribute()` primitive, this method will be called
    for you.

    If you pass the key that changed it will ensure that observers are fired
    only once for the changed property instead of `allPropertiesDidChange()`

    @param {String} key key that changed (optional)
    @returns {SC.Record} receiver
  */
  recordDidChange: function(key) {

    // If we have a parent, they changed too!
    var p = get(this, 'parentRecord');
    if (p) p.recordDidChange();

    get(this, 'store').recordDidChange(null, null, get(this, 'storeKey'), key);
    this.notifyPropertyChange('status');

    // If there are any aggregate records, we might need to propagate our new
    // status to them.
    this.propagateToAggregates();

    return this ;
  },

  // ...............................
  // ATTRIBUTES
  //

  /** @private
    Current edit level.  Used to defer editing changes.
  */
  _editLevel: 0 ,

  /**
    Defers notification of record changes until you call a matching
    `endEditing()` method.  This method is called automatically whenever you
    set an attribute, but you can call it yourself to group multiple changes.

    Calls to `beginEditing()` and `endEditing()` can be nested.

    @returns {SC.Record} receiver
  */
  beginEditing: function() {
    this._editLevel++;
    return this ;
  },

  /**
    Notifies the store of record changes if this matches a top level call to
    `beginEditing()`.  This method is called automatically whenever you set an
    attribute, but you can call it yourself to group multiple changes.

    Calls to `beginEditing()` and `endEditing()` can be nested.

    @param {String} key key that changed (optional)
    @returns {SC.Record} receiver
  */
  endEditing: function(key) {
    if(--this._editLevel <= 0) {
      this._editLevel = 0;
      this.recordDidChange(key);
    }
    return this ;
  },

  /**
    Reads the raw attribute from the underlying data hash.  This method does
    not transform the underlying attribute at all.

    @param {String} key the attribute you want to read
    @returns {Object} the value of the key, or undefined if it doesn't exist
  */
  readAttribute: function(key) {
    var store = get(this, 'store'), storeKey = get(this, 'storeKey');
    var attrs = store.readDataHash(storeKey);
    return attrs ? attrs[key] : undefined ;
  },

  /**
    Updates the passed attribute with the new value.  This method does not
    transform the value at all.  If instead you want to modify an array or
    hash already defined on the underlying json, you should instead get
    an editable version of the attribute using `editableAttribute()`.

    @param {String} key the attribute you want to read
    @param {Object} value the value you want to write
    @param {Boolean} ignoreDidChange only set if you do NOT want to flag
      record as dirty
    @returns {SC.Record} receiver
  */
  writeAttribute: function(key, value, ignoreDidChange) {
    var store    = get(this, 'store'),
        storeKey = get(this, 'storeKey'),
        attrs;

    attrs = store.readEditableDataHash(storeKey);
    if (!attrs) throw K.BAD_STATE_ERROR;

    // if value is the same, do not flag record as dirty
    if (value !== attrs[key]) {
      if(!ignoreDidChange) this.beginEditing();
      attrs[key] = value;

      // If the key is the primaryKey of the record, we need to tell the store
      // about the change.
      if (key===get(this, 'primaryKey')) {
        SC.propertyWillChange(this, 'id'); // Reset computed value
        SC.Store.replaceIdFor(storeKey, value) ;
        SC.propertyDidChange(this, 'id'); // Reset computed value
      }

      if(!ignoreDidChange) this.endEditing(key);
    }
    return this ;
  },

  /**
    This will also ensure that any aggregate records are also marked dirty
    if this record changes.

    Should not have to be called manually.
  */
  propagateToAggregates: function() {
    var storeKey = get(this, 'storeKey'),
        recordType = SC.Store.recordTypeFor(storeKey),
        idx, len, key, val, recs, aggregates;

    aggregates = recordType.aggregates;

    // if recordType aggregates are not set up yet, make sure to
    // create the cache first
    if (!aggregates) {
      var dataHash = get(this, 'store').readDataHash(storeKey);
      var attrFor  = SC.RecordAttribute.attrFor;
      var attr;
      
      aggregates = [];
      for(var k in dataHash) {
        attr = attrFor(this, k);
        if (attr && get(attr, 'aggregate')) aggregates.push(k);
      }
      recordType.aggregates = aggregates;
    }

    // now loop through all aggregate properties and mark their related
    // record objects as dirty
    var K          = SC.Record,
        dirty      = K.DIRTY,
        readyNew   = K.READY_NEW,
        destroyed  = K.DESTROYED,
        readyClean = K.READY_CLEAN,
        iter;

    /**
      @private

      If the child is dirty, then make sure the parent gets a dirty
      status.  (If the child is created or destroyed, there's no need,
      because the parent will dirty itself when it modifies that
      relationship.)

      @param {SC.Record} record to propagate to
    */
    iter =  function(rec) {
      var childStatus, parentStatus;

      if (rec) {
        childStatus = get(this, 'status');
        if ((childStatus & dirty)  ||
            (childStatus & readyNew)  ||  (childStatus & destroyed)) {
          parentStatus = get(rec, 'status');
          if (parentStatus === readyClean) {
            // Note:  storeDidChangeProperties() won't put it in the
            //        changelog!
            get(rec, 'store').recordDidChange(get(rec, 'constructor'), null, get(rec, 'storeKey'), null, YES);
          }
        }
      }
    };

    for(idx=0,len=aggregates.length;idx<len;++idx) {
      key = aggregates[idx];
      val = get(this, key);
      recs = val instanceof SC.ManyArray ? val : [val];
      recs.forEach(iter, this);
    }
  },

  /** @private used internally to notify of property changes. */
  notifyPropertyChange: function(keyName) {
    SC.propertyWillChange(this, keyName);
    SC.propertyDidChange(this, keyName);
  },
  
  /**
    Called by the store whenever the underlying data hash has changed.  This
    will notify any observers interested in data hash properties that they
    have changed.

    @param {Boolean} statusOnly changed
    @param {String} key that changed (optional)
    @returns {SC.Record} receiver
  */
  storeDidChangeProperties: function(statusOnly, keys) {
    // TODO:  Should this function call propagateToAggregates() at the
    //        appropriate times?
    if (statusOnly) {
      this.notifyPropertyChange('status');
    } else {
      if (!keys) {
        keys = get(this, 'store').readDataHash(get(this, 'storeKey'));
        if (keys) keys = SC.keys(keys);
      }

      SC.beginPropertyChanges(this);
      if (keys) {
        keys.forEach(function(k) { 
          this.notifyPropertyChange(k); 
        }, this);
      }
      this.notifyPropertyChange('status');
      SC.endPropertyChanges(this);

      // also notify manyArrays
      var manyArrays = this.relationships,
          loc        = manyArrays ? manyArrays.length : 0 ;
      while(--loc>=0) manyArrays[loc].recordPropertyDidChange(keys);
    }
  },

  /**
    Normalizing a record will ensure that the underlying hash conforms
    to the record attributes such as their types (transforms) and default
    values.

    This method will write the conforming hash to the store and return
    the materialized record.

    By normalizing the record, you can use the `attributes` property and be
    assured that it will conform to the defined model. For example, this
    can be useful in the case where you need to send a JSON representation
    to some server after you have used `.createRecord()`, since this method
    will enforce the 'rules' in the model such as their types and default
    values. You can also include null values in the hash with the
    includeNull argument.

    @param {Boolean} includeNull will write empty (null) attributes
    @returns {SC.Record} the normalized record
  */

  normalize: function(includeNull) {
    var primaryKey = this.primaryKey,
        recordId   = get(this, 'id'),
        store      = get(this, 'store'),
        storeKey   = get(this, 'storeKey'),
        key, typeClass, recHash, attrValue, normChild,  isRecord,
        isChild, defaultVal, keyForDataHash, attr;

    var dataHash = store.readEditableDataHash(storeKey) || {};
    dataHash[primaryKey] = recordId;
    recHash = store.readDataHash(storeKey);

    var attrFor = SC.RecordAttribute.attrFor;
    
    for (key in this) {
      // make sure property is a record attribute.
      attr = attrFor(this, key);
      if (attr) {
        keyForDataHash = get(attr, 'key') || key; // handle alt keys
        typeClass = get(attr, 'typeClass');
        isRecord  = SC.typeOf(get(attr, 'typeClass')) === 'class';
        isChild   = get(attr, 'isNestedRecordTransform');

        if (isRecord) {
          attrValue = recHash[keyForDataHash];
          if (attrValue !== undefined) {
            // write value already there
            dataHash[keyForDataHash] = attrValue;
          } else {
            // or write default
            defaultVal = get(attr, 'defaultValue');

            // computed default value
            if ('function' === typeof defaultVal) {
              dataHash[keyForDataHash] = defaultVal(this, key, defaultVal);
            } else {
              // plain value
              dataHash[keyForDataHash] = defaultVal;
            }
          } 
        } else if (isChild) {
          attrValue = get(this, key);

          // Sometimes a child attribute property does not refer to a 
          // child record. Catch this and don't try to normalize.
          if (attrValue && attrValue.normalize) {
            attrValue.normalize();
          }
            
        } else {
          attrValue = get(this, key);
          if (attrValue!==undefined || (attrValue===null && includeNull)) {
            attrValue = attr.fromType(this, key, attrValue);
            dataHash[keyForDataHash] = attrValue;
          }
        }
      }
    }

    return this;
  },


  setUnknownProperty: function(key, value) {
    // If the value is undefined, it means it has not been set to null
    // by SC.Record (and thus reserved as an internal property).
    //
    // Since we will always circumvent the normal set() semantics in
    // this case, the value will *never* be set, so every call to
    // `set` with this key will go through `unknownProperty` and proxy
    // the change to the data hash.
    if (this[key] === undefined) {
      // first check if we should ignore unknown properties for this
      // recordType
      var storeKey = get(this, 'storeKey'),
        recordType = SC.Store.recordTypeFor(storeKey);

      if(recordType.ignoreUnknownProperties===YES) {
        this[key] = value;
        return value;
      }

      // if we're modifying the PKEY, then `SC.Store` needs to relocate where
      // this record is cached. store the old key, update the value, then let
      // the store do the housekeeping...
      var primaryKey = get(this, 'primaryKey');
      this.writeAttribute(key,value);

      // update ID if needed
      if (key === primaryKey) {
        SC.Store.replaceIdFor(storeKey, value);
      }

      return this.unknownProperty(key);
    } else {
      // This is an internal reserved property. Do the normal `set` behavior.
      return this._super(key, value);
    }
  },

  /**
    If you try to get/set a property not defined by the record, then this
    method will be called. It will try to get the value from the set of
    attributes.

    This will also check is `ignoreUnknownProperties` is set on the recordType
    so that they will not be written to `dataHash` unless explicitly defined
    in the model schema.

    @param {String} key the attribute being get/set
    @param {Object} value the value to set the key to, if present
    @returns {Object} the value
  */
  unknownProperty: function(key) {
    return this.readAttribute(key);
  },

  /**
    Lets you commit this specific record to the store which will trigger
    the appropriate methods in the data source for you.

    @param {Hash} params optional additonal params that will passed down
      to the data source
    @param {boolean} recordOnly optional param if you want to only commit a single
      record if it has a parent.
    @param {Function} callback optional callback that the store will fire once the
    datasource finished committing
    @returns {SC.Record} receiver
  */
  commitRecord: function(params, recordOnly, callback) {
    var store = get(this, 'store'), rec, ro,
        sk = get(this, 'storeKey'),
        prKey = store.parentStoreKeyExists();

    // If we only want to commit this record or it doesn't have a parent record
    // we will commit this record
    ro = recordOnly || (SC.none(recordOnly) && SC.none(prKey));
    if (ro){
      store.commitRecord(undefined, undefined, get(this, 'storeKey'), params, callback);
    } else if (prKey){
      rec = store.materializeRecord(prKey);
      rec.commitRecord(params, recordOnly, callback);
    }
    return this ;
  },

  // ..........................................................
  // EMULATE SC.StoreError API
  //

  /**
    Returns `YES` whenever the status is SC.Record.ERROR.  This will allow you
    to put the UI into an error state.

    @type Boolean
    @property
    @dependsOn status
  */
  isError: function() {
    return get(this, 'status') & SC.Record.ERROR;
  }.property('status').cacheable(),

  /**
    Returns the receiver if the record is in an error state.  Returns null
    otherwise.

    @type SC.Record
    @property
    @dependsOn isError
  */
  errorValue: function() {
    return get(this, 'isError') ? SC.val(get(this, 'errorObject')) : null ;
  }.property('isError').cacheable(),

  /**
    Returns the current error object only if the record is in an error state.
    If no explicit error object has been set, returns SC.Record.GENERIC_ERROR.

    @type SC.StoreError
    @property
    @dependsOn isError
  */
  errorObject: function() {
    if (get(this, 'isError')) {
      var store = get(this, 'store');
      return store.readError(get(this, 'storeKey')) || K.GENERIC_ERROR;
    } else return null ;
  }.property('isError').cacheable(),

  // ...............................
  // PRIVATE
  //

  /** @private
    Sets the key equal to value.

    This version will first check to see if the property is an
    `SC.RecordAttribute`, and if so, will ensure that its isEditable property
    is `YES` before attempting to change the value.

    @param key {String} the property to set
    @param value {Object} the value to set or null.
    @returns {SC.Record}
  */
  set: function(key, value) {
    var func = this[key];

    if (func && func.isProperty && !get(func, 'isEditable')) {
      return this;
    }
    return this._super(key, value);
  },

  /** @private
    Creates string representation of record, with status.

    @returns {String}
  */

  toString: function() {
    // We won't use 'readOnlyAttributes' here because accessing them directly
    // avoids a SC.copy() -- we'll be careful not to edit anything.
    var attrs = get(this, 'store').readDataHash(get(this, 'storeKey'));
    return "%@(%@) %@".fmt(this.constructor.toString(), SC.inspect(attrs), this.statusString());
  },

  /** @private
    Creates string representation of record, with status.

    @returns {String}
  */

  statusString: function() {
    var ret = [], status = get(this, 'status');

    for(var prop in SC.Record) {
      if(prop.match(/[A-Z_]$/) && SC.Record[prop]===status) {
        ret.push(prop);
      }
    }

    return ret.join(" ");
  },

  /**
    Registers a child record with this parent record.

    If the parent already knows about the child record, return the cached
    instance. If not, create the child record instance and add it to the child
    record cache.

    @param {Hash} value The hash of attributes to apply to the child record.
    @param {Integer} key The store key that we are asking for
    @param {String} path The property path of the child record
    @returns {SC.Record} the child record that was registered
   */
  registerNestedRecord: function(value, key, path) {
    var store, psk, csk, childRecord, recordType;

    // if no path is entered it must be the key
    if (SC.none(path)) path = key;

    // if a record instance is passed, simply use the storeKey.  This allows
    // you to pass a record from a chained store to get the same record in the
    // current store.
    if (value instanceof SC.Record) {
      childRecord = value;
    } else {
      recordType = this._materializeNestedRecordType(value, key);
      childRecord = this.createNestedRecord(recordType, value);
    }

    if (childRecord){
      set(this, 'isParentRecord', YES);
      store = get(this, 'store');
      psk = get(this, 'storeKey');
      csk = get(childRecord, 'storeKey');
      store.registerChildToParent(psk, csk, path);
    }

    return childRecord;
  },

  /**
    @private

     private method that retrieves the `recordType` from the hash that is
     provided.

     Important for use in polymorphism but you must have the following items
     in the parent record:

     `nestedRecordNamespace` <= this is the object that has the `SC.Records`
     defined

     @param {Hash} value The hash of attributes to apply to the child record.
     @param {String} key the name of the key on the attribute
     @param {SC.Record} the record that was materialized
    */
  _materializeNestedRecordType: function(value, key){
    var childNS, recordType, ret, attr, t;

    // Get the record type, first checking the "type" property on the hash.
    t = SC.typeOf(value);
    if (t === 'instance' || t === 'object') {
      // Get the record type.
      childNS = get(this, 'nestedRecordNamespace');
      if (get(value, 'type') && !SC.none(childNS)) {
        recordType = get(childNS, get(value, 'type'));
      }
    }

    // Maybe it's not a hash or there was no type property.
    if (!recordType && key) {
      attr = SC.RecordAttribute.attrFor(this, key);
      if (attr) recordType = get(attr, 'typeClass');
    }

    // When all else fails throw and exception.
    if (!SC.Record.detect(recordType)) {
      throw 'SC.Child: Error during transform: Invalid record type.';
    }

    return recordType;
  },

  /**
    Creates a new nested record instance.

    @param {SC.Record} recordType The type of the nested record to create.
    @param {Hash} hash The hash of attributes to apply to the child record.
    (may be null)
    @returns {SC.Record} the nested record created
   */
  createNestedRecord: function(recordType, hash) {
    var store, id, sk, pk, cr = null, existingId = null;
    SC.run(this, function() {
      hash = hash || {}; // init if needed

      existingId = hash[get(recordType, 'proto').primaryKey];

      store = get(this, 'store');
      if (SC.none(store)) throw 'Error: during the creation of a child record: NO STORE ON PARENT!';

      if (!id && (pk = get(recordType, 'proto').primaryKey)) {
        id = hash[pk];
        // In case there isnt a primary key supplied then we create on
        // on the fly
        sk = id ? store.storeKeyExists(recordType, id) : null;
        if (sk){
          store.writeDataHash(sk, hash);
          cr = store.materializeRecord(sk);
        } else {
          cr = store.createRecord(recordType, hash) ;
          if (SC.none(id)){
            sk = get(cr, 'storeKey');
            id = 'cr'+sk;
            SC.Store.replaceIdFor(sk, id);
            hash = store.readEditableDataHash(sk);
            hash[pk] = id;
          }
        }

      }

      // ID processing if necessary
      if (SC.none(existingId) && this.generateIdForChild) this.generateIdForChild(cr);

    });

    return cr;
  },

  _nestedRecordKey: 0,

  /**
    Override this function if you want to have a special way of creating
    ids for your child records

    @param {SC.Record} childRecord
    @returns {String} the id generated
   */
  generateIdForChild: function(childRecord){}

}) ;

// Class Methods
SC.Record.reopenClass( /** @scope SC.Record.prototype */ {

  /**
    Whether to ignore unknown properties when they are being set on the record
    object. This is useful if you want to strictly enforce the model schema
    and not allow dynamically expanding it by setting new unknown properties

    @static
    @type Boolean
    @default NO
  */
  ignoreUnknownProperties: NO,

  // ..........................................................
  // CONSTANTS
  //

  /**
    Generic state for records with no local changes.

    Use a logical AND (single `&`) to test record status

    @static
    @constant
    @type Number
    @default 0x0001
  */
  CLEAN:            0x0001, // 1

  /**
    Generic state for records with local changes.

    Use a logical AND (single `&`) to test record status

    @static
    @constant
    @type Number
    @default 0x0002
  */
  DIRTY:            0x0002, // 2

  /**
    State for records that are still loaded.

    A record instance should never be in this state.  You will only run into
    it when working with the low-level data hash API on `SC.Store`. Use a
    logical AND (single `&`) to test record status

    @static
    @constant
    @type Number
    @default 0x0100
  */
  EMPTY:            0x0100, // 256

  /**
    State for records in an error state.

    Use a logical AND (single `&`) to test record status

    @static
    @constant
    @type Number
    @default 0x1000
  */
  ERROR:            0x1000, // 4096

  /**
    Generic state for records that are loaded and ready for use

    Use a logical AND (single `&`) to test record status

    @static
    @constant
    @type Number
    @default 0x0200
  */
  READY:            0x0200, // 512

  /**
    State for records that are loaded and ready for use with no local changes

    Use a logical AND (single `&`) to test record status

    @static
    @constant
    @type Number
    @default 0x0201
  */
  READY_CLEAN:      0x0201, // 513


  /**
    State for records that are loaded and ready for use with local changes

    Use a logical AND (single `&`) to test record status

    @static
    @constant
    @type Number
    @default 0x0202
  */
  READY_DIRTY:      0x0202, // 514


  /**
    State for records that are new - not yet committed to server

    Use a logical AND (single `&`) to test record status

    @static
    @constant
    @type Number
    @default 0x0203
  */
  READY_NEW:        0x0203, // 515


  /**
    Generic state for records that have been destroyed

    Use a logical AND (single `&`) to test record status

    @static
    @constant
    @type Number
    @default 0x0400
  */
  DESTROYED:        0x0400, // 1024


  /**
    State for records that have been destroyed and committed to server

    Use a logical AND (single `&`) to test record status

    @static
    @constant
    @type Number
    @default 0x0401
  */
  DESTROYED_CLEAN:  0x0401, // 1025


  /**
    State for records that have been destroyed but not yet committed to server

    Use a logical AND (single `&`) to test record status

    @static
    @constant
    @type Number
    @default 0x0402
  */
  DESTROYED_DIRTY:  0x0402, // 1026


  /**
    Generic state for records that have been submitted to data source

    Use a logical AND (single `&`) to test record status

    @static
    @constant
    @type Number
    @default 0x0800
  */
  BUSY:             0x0800, // 2048


  /**
    State for records that are still loading data from the server

    Use a logical AND (single `&`) to test record status

    @static
    @constant
    @type Number
    @default 0x0804
  */
  BUSY_LOADING:     0x0804, // 2052


  /**
    State for new records that were created and submitted to the server;
    waiting on response from server

    Use a logical AND (single `&`) to test record status

    @static
    @constant
    @type Number
    @default 0x0808
  */
  BUSY_CREATING:    0x0808, // 2056


  /**
    State for records that have been modified and submitted to server

    Use a logical AND (single `&`) to test record status

    @static
    @constant
    @type Number
    @default 0x0810
  */
  BUSY_COMMITTING:  0x0810, // 2064


  /**
    State for records that have requested a refresh from the server.

    Use a logical AND (single `&`) to test record status.

    @static
    @constant
    @type Number
    @default 0x0820
  */
  BUSY_REFRESH:     0x0820, // 2080


  /**
    State for records that have requested a refresh from the server.

    Use a logical AND (single `&`) to test record status

    @static
    @constant
    @type Number
    @default 0x0821
  */
  BUSY_REFRESH_CLEAN:  0x0821, // 2081

  /**
    State for records that have requested a refresh from the server.

    Use a logical AND (single `&`) to test record status

    @static
    @constant
    @type Number
    @default 0x0822
  */
  BUSY_REFRESH_DIRTY:  0x0822, // 2082

  /**
    State for records that have been destroyed and submitted to server

    Use a logical AND (single `&`) to test record status

    @static
    @constant
    @type Number
    @default 0x0840
  */
  BUSY_DESTROYING:  0x0840, // 2112


  // ..........................................................
  // ERRORS
  //

  /**
    Error for when you try to modify a record while it is in a bad
    state.

    @static
    @constant
    @type SC.StoreError
  */
  BAD_STATE_ERROR:     SC.$error("Internal Inconsistency"),

  /**
    Error for when you try to create a new record that already exists.

    @static
    @constant
    @type SC.StoreError
  */
  RECORD_EXISTS_ERROR: SC.$error("Record Exists"),

  /**
    Error for when you attempt to locate a record that is not found

    @static
    @constant
    @type SC.StoreError
  */
  NOT_FOUND_ERROR:     SC.$error("Not found "),

  /**
    Error for when you try to modify a record that is currently busy

    @static
    @constant
    @type SC.StoreError
  */
  BUSY_ERROR:          SC.$error("Busy"),

  /**
    Generic unknown record error

    @static
    @constant
    @type SC.StoreError
  */
  GENERIC_ERROR:       SC.$error("Generic Error"),

  /**
    @private
    The next child key to allocate.  A nextChildKey must always be greater than 0.
  */
  _nextChildKey: 0,

  // ..........................................................
  // CLASS METHODS
  //

  /**
    Helper method returns a new `SC.RecordAttribute` instance to map a simple
    value or to-one relationship and then defines it as a computed property.  
    At the very least, you should pass the type class you expect the attribute 
    to have.  You may pass any additional options as well.

    Use this helper when you define SC.Record subclasses.

        MyApp.Contact = SC.Record.extend({
          firstName: SC.Record.attr(String, { isRequired: YES })
        });

    @param {Class} type the attribute type
    @param {Hash} opts the options for the attribute
    @returns {SC.RecordAttribute} created instance
  */
  attr: function(type, opts) {
    return SC.RecordAttribute.attr(type, opts).computed();
  },

  /**
    Returns an `SC.RecordAttribute` that describes a fetched attribute.  When
    you reference this attribute, it will return an `SC.RecordArray` that uses
    the type as the fetch key and passes the attribute value as a param.

    Use this helper when you define SC.Record subclasses.

        MyApp.Group = SC.Record.extend({
          contacts: SC.Record.fetch('MyApp.Contact')
        });

    @param {SC.Record|String} recordType The type of records to load
    @param {Hash} opts the options for the attribute
    @returns {SC.RecordAttribute} created instance
  */
  fetch: function(recordType, opts) {
    return SC.FetchedAttribute.attr(recordType, opts).computed();
  },

  /**
    Will return one of the following:

     1. `SC.ManyAttribute` that describes a record array backed by an
        array of guids stored in the underlying JSON.
     2. `SC.ChildrenAttribute` that describes a record array backed by a
        array of hashes.

    You can edit the contents of this relationship.

    For `SC.ManyAttribute`, If you set the inverse and `isMaster: NO` key,
    then editing this array will modify the underlying data, but the
    inverse key on the matching record will also be edited and that
    record will be marked as needing a change.

    @param {SC.Record|String} recordType The type of record to create
    @param {Hash} opts the options for the attribute
    @returns {SC.ManyAttribute|SC.ChildrenAttribute} created instance
  */
  toMany: function(recordType, opts) {
    opts = opts || {};
    var isNested = opts.nested || opts.isNested;
    var attr;
    if(isNested){
      attr = SC.ChildrenAttribute.attr(recordType, opts);
    }
    else {
      attr = SC.ManyAttribute.attr(recordType, opts);
    }
    return attr.computed();
  },

  /**
    Will return one of the following:

     1. `SC.SingleAttribute` that converts the underlying ID to a single
        record.  If you modify this property, it will rewrite the underyling
        ID. It will also modify the inverse of the relationship, if you set it.
     2. `SC.ChildAttribute` that you can edit the contents
        of this relationship.

    @param {SC.Record|String} recordType the type of the record to create
    @param {Hash} opts additional options
    @returns {SC.SingleAttribute|SC.ChildAttribute} created instance
  */
  toOne: function(recordType, opts) {
    opts = opts || {};
    var isNested = opts.nested || opts.isNested;
    var attr;
    if(isNested){
      attr = SC.ChildAttribute.attr(recordType, opts);
    }
    else {
      attr = SC.SingleAttribute.attr(recordType, opts);
    }
    return attr.computed();
  },

  /**
    Returns all storeKeys mapped by Id for this record type.  This method is
    used mostly by the `SC.Store` and the Record to coordinate.  You will 
    rarely need to call this method yourself.

    @returns {Hash}
  */
  storeKeysById: function() {
    var key = 'storeKey-'+SC.guidFor(this),
        ret = this[key];
    if (!ret) ret = this[key] = {};
    return ret;
  },

  /**
    Given a primaryKey value for the record, returns the associated
    storeKey.  If the primaryKey has not been assigned a storeKey yet, it
    will be added.

    For the inverse of this method see `SC.Store.idFor()` and
    `SC.Store.recordTypeFor()`.

    @param {String} id a record id
    @returns {Number} a storeKey.
  */
  storeKeyFor: function(id) {
    var storeKeys = this.storeKeysById(),
        ret       = storeKeys[id];

    if (!ret) {
      ret = SC.Store.generateStoreKey();
      SC.Store.idsByStoreKey[ret] = id ;
      SC.Store.recordTypesByStoreKey[ret] = this ;
      storeKeys[id] = ret ;
    }

    return ret ;
  },

  /**
    Given a primaryKey value for the record, returns the associated
    storeKey.  As opposed to `storeKeyFor()` however, this method
    will NOT generate a new storeKey but returned undefined.

    @param {String} id a record id
    @returns {Number} a storeKey.
  */
  storeKeyExists: function(id) {
    var storeKeys = this.storeKeysById(),
        ret       = storeKeys[id];

    return ret ;
  },

  /**
    Returns a record with the named ID in store.

    @param {SC.Store} store the store
    @param {String} id the record id or a query
    @returns {SC.Record} record instance
  */
  find: function(store, id) {
    return store.find(this, id);
  },

  /** @private - enhance extend to notify SC.Query as well. */
  extend: function() {
    var ret = SC.Object.extend.apply(this, arguments);

    // Clear aggregates cache when creating a new subclass
    // of SC.Record
    ret.aggregates = null;

    SC.Query._scq_didDefineRecordType(ret);
    return ret ;
  }
}) ;

K = SC.Record;
