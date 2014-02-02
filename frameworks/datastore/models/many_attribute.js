// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('models/record');
sc_require('models/record_attribute');
sc_require('system/many_array');

/** @class

  ManyAttribute is a subclass of `RecordAttribute` and handles to-many
  relationships.

  Relationships in the client are meant to mirror the relationships that
  the real data has in the remote data store on the server. For example,
  if a `Parent` record on the server has an array of `Child` ids, then it is
  appropriate for the `MyApp.Parent` model in the SproutCore app to have a `toMany`
  relationship to the `MyApp.Child` in the app. In this way, changes to the
  relationship in the client will best match how the data should be committed
  to the server.

  There are many ways you can configure a `ManyAttribute`:

      contacts: SC.Record.toMany('MyApp.Contact', {
        inverse: 'group', // set the key used to represent the inverse
        isMaster: YES|NO, // indicate whether changing this should dirty
        transform: function(), // transforms value <=> storeKey,
        isEditable: YES|NO, make editable or not,
        through: 'taggings' // set a relationship this goes through
      });

  Note: When setting ( `.set()` ) the value of a `toMany` attribute, make sure
  to pass in an array of `SC.Record` objects.

  ## Using new Records in Relationships

  Because relationships are based on `id`, new records created in the client
  (that don't have an `id`) are typically not able to be assigned to a
  relationship until after they have been committed to the server. However,
  because it's unwieldy to manually update relationships after the real `id` is
  known, `SC.ManyAttribute` through `SC.ManyArray`, allows new records to be added
  that don't yet have an `id`.

  As long as the `supportNewRecords` property is true, adding records without an
  `id `to the relationship will assign unique temporary ids to the new records.

  *Note:* You must update the relationship after the new records are successfully
  committed and have real ids. This is done by calling `updateNewRecordId()`
  on the many array. In the future this should be automatic.

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

    @type String
  */
  inverse: null,

  /**
    If `YES` then modifying this relationships will mark the owner record
    dirty. If set to `NO`, then modifying this relationship will not alter
    this record.  You should use this property only if you have an inverse
    property also set. Only one of the inverse relationships should be marked
    as master so you can control which record should be committed.

    @type Boolean
  */
  isMaster: YES,

  /**
    If set and you have an inverse relationship, will be used to determine the
    order of an object when it is added to an array. You can pass a function
    or an array of property keys.

    @property {Function|Array}
  */
  orderBy: null,

  /**
    Determines whether the new record support of `SC.ManyArray` should be
    enabled or not.

    Normally, all records in the relationship should already have been previously
    committed to a remote data store and have an actual `id`. However, with
    `supportNewRecords` set to true, adding records without an `id `to the
    relationship will assign unique temporary ids to the new records.

    *Note:* You must update the relationship after the new records are successfully
    committed and have real ids. This is done by calling `updateNewRecordId()`
    on the many array. In the future this should be automatic.

    If you wish to turn this off, SC.ManyArray will throw an exception if you
    add a record without an id to the relationship. If you use temporary `id`s
    for new record, you will need to manually update the relationship, but
    run the risk of committing inverse records with temporary `id`s in their
    datahashes.

    @type Boolean
    @default true
    @since SproutCore 1.11.0
  */
  supportNewRecords: true,

  // ..........................................................
  // LOW-LEVEL METHODS
  //

  /**  @private - adapted for to many relationship */
  toType: function(record, key, value) {
    var type      = this.get('typeClass'),
        supportNewRecords = this.get('supportNewRecords'),
        attrKey   = this.get('key') || key,
        arrayKey  = SC.keyFor('__manyArray__', SC.guidFor(this)),
        ret       = record[arrayKey],
        rel;

    // lazily create a ManyArray one time.  after that always return the
    // same object.
    if (!ret) {
      ret = SC.ManyArray.create({
        recordType:    type,
        record:        record,
        propertyName:  attrKey,
        manyAttribute: this,
        supportNewRecords: supportNewRecords
      });

      record[arrayKey] = ret ; // save on record
      rel = record.get('relationships');
      if (!rel) record.set('relationships', rel = []);
      rel.push(ret); // make sure we get notified of changes...

    }

    return ret;
  },

  /** @private - adapted for to many relationship */
  fromType: function(record, key, value) {
    var ret = [];

    if(!SC.isArray(value)) throw new Error("Expects toMany attribute to be an array");

    var len = value.get('length');
    for(var i=0;i<len;i++) {
      ret[i] = value.objectAt(i).get('id');
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
    var manyArray = record.get(key);
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
    var manyArray = record.get(key);
    if (manyArray) {
      manyArray.addInverseRecord(inverseRecord);
    }
  }

});
