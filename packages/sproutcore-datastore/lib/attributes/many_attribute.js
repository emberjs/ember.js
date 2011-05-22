// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-datastore/system/record');
require('sproutcore-datastore/attributes/record_attribute');
require('sproutcore-datastore/system/many_array');

var get = SC.get, set = SC.set;

/** @class

  ManyAttribute is a subclass of `RecordAttribute` and handles to-many
  relationships.

  When setting ( `set()` ) the value of a `toMany` attribute, make sure
  to pass in an array of `SC.Record` objects.

  There are many ways you can configure a `ManyAttribute`:

      contacts: SC.Record.toMany('MyApp.Contact', {
        inverse: 'group', // set the key used to represent the inverse
        isMaster: YES|NO, // indicate whether changing this should dirty
        transform: function(), // transforms value <=> storeKey,
        isEditable: YES|NO, make editable or not,
        through: 'taggings' // set a relationship this goes through
      });

  @extends SC.RecordAttribute
  @since SproutCore 1.0
*/
SC.ManyAttribute = SC.RecordAttribute.extend(
  /** @scope SC.ManyAttribute.prototype */ {

  /**
    Set the foreign key on content objects that represent the inversion of
    this relationship. The inverse property should be a `toOne()` or
    `toMany()` relationship as well. Modifying this many array will modify
    the `inverse` property as well.

    @property {String}
  */
  inverse: null,

  /**
    If `YES` then modifying this relationships will mark the owner record
    dirty. If set to `NO`, then modifying this relationship will not alter
    this record.  You should use this property only if you have an inverse
    property also set. Only one of the inverse relationships should be marked
    as master so you can control which record should be committed.

    @property {Boolean}
  */
  isMaster: YES,

  /**
    If set and you have an inverse relationship, will be used to determine the
    order of an object when it is added to an array. You can pass a function
    or an array of property keys.

    @property {Function|Array}
  */
  orderBy: null,

  // ..........................................................
  // LOW-LEVEL METHODS
  //

  /**  @private - adapted for to many relationship */
  toType: function(record, key, value) {
    var type      = get(this, 'typeClass'),
        attrKey   = get(this, 'key') || key,
        arrayKey  = '__manyArray__'+SC.guidFor(this),
        ret       = record[arrayKey],
        rel;

    // lazily create a ManyArray one time.  after that always return the
    // same object.
    if (!ret) {
      ret = SC.ManyArray.create({
        recordType:    type,
        record:        record,
        propertyName:  attrKey,
        manyAttribute: this
      });

      record[arrayKey] = ret ; // save on record
      rel = get(record, 'relationships');
      if (!rel) set(record, 'relationships', rel = []);
      rel.push(ret); // make sure we get notified of changes...

    }

    return ret;
  },

  /** @private - adapted for to many relationship */
  fromType: function(record, key, value) {
    var ret = [];

    if(!SC.isArray(value)) throw "Expects toMany attribute to be an array";

    var len = get(value, 'length');
    for(var i=0;i<len;i++) {
      ret[i] = get(value.objectAt(i), 'id');
    }

    return ret;
  },

  /**
    Called by an inverse relationship whenever the receiver is no longer part
    of the relationship.  If this matches the inverse setting of the attribute
    then it will update itself accordingly.

    You should never call this directly.

    @param {SC.Record} the record owning this attribute
    @param {String} key the key for this attribute
    @param {SC.Record} inverseRecord record that was removed from inverse
    @param {String} key key on inverse that was modified
    @returns {void}
  */
  inverseDidRemoveRecord: function(record, key, inverseRecord, inverseKey) {
    var manyArray = get(record, key);
    if (manyArray) {
      manyArray.removeInverseRecord(inverseRecord);
    }
  },

  /**
    Called by an inverse relationship whenever the receiver is added to the
    inverse relationship.  This will set the value of this inverse record to
    the new record.

    You should never call this directly.

    @param {SC.Record} the record owning this attribute
    @param {String} key the key for this attribute
    @param {SC.Record} inverseRecord record that was added to inverse
    @param {String} key key on inverse that was modified
    @returns {void}
  */
  inverseDidAddRecord: function(record, key, inverseRecord, inverseKey) {
    var manyArray = get(record, key);
    if (manyArray) {
      manyArray.addInverseRecord(inverseRecord);
    }
  }

});

