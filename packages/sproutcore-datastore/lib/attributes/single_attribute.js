// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-datastore/system/record');
require('sproutcore-datastore/attributes/record_attribute');

var get = SC.get, set = SC.set;
var RecordAttribute_call = get(SC.RecordAttribute, 'proto').call;
var attrFor = SC.RecordAttribute.attrFor;

/** @class

  `SingleAttribute` is a subclass of `RecordAttribute` and handles to-one
  relationships.

  There are many ways you can configure a `SingleAttribute`:

      group: SC.Record.toOne('MyApp.Group', {
        inverse: 'contacts', // set the key used to represent the inverse
        isMaster: YES|NO, // indicate whether changing this should dirty
        transform: function(), // transforms value <=> storeKey,
        isEditable: YES|NO, make editable or not
      });

  @extends SC.RecordAttribute
  @since SproutCore 1.0
*/
SC.SingleAttribute = SC.RecordAttribute.extend(
  /** @scope SC.SingleAttribute.prototype */ {

  /**
    Specifies the property on the member record that represents the inverse
    of the current relationship.  If set, then modifying this relationship
    will also alter the opposite side of the relationship.

    @type String
    @default null
  */
  inverse: null,

  /**
    If set, determines that when an inverse relationship changes whether this
    record should become dirty also or not.

    @type Boolean
    @default YES
  */
  isMaster: YES,


  /**
    @private - implements support for handling inverse relationships.
  */
  call: function(record, key, newRec) {
    var attrKey = get(this, 'key') || key,
        inverseKey, isMaster, oldRec, attr, ret, nvalue;

    // WRITE
    if (newRec !== undefined && get(this, 'isEditable')) {

      // can only take other records or null
      if (newRec && !(newRec instanceof  SC.Record)) {
        throw "%@ is not an instance of SC.Record".fmt(newRec);
      }

      inverseKey = get(this, 'inverse');
      if (inverseKey) oldRec = this._super(record, key);

      // careful: don't overwrite value here.  we want the return value to
      // cache.
      nvalue = this.fromType(record, key, newRec) ; // convert to attribute.
      record.writeAttribute(attrKey, nvalue, !get(this, 'isMaster'));
      ret = newRec ;

      // ok, now if we have an inverse relationship, get the inverse
      // relationship and notify it of what is happening.  This will allow it
      // to update itself as needed.  The callbacks implemented here are
      // supported by both SingleAttribute and ManyAttribute.
      //
      if (inverseKey && (oldRec !== newRec)) {
        if (oldRec && (attr = attrFor(oldRec, inverseKey))) {
          attr.inverseDidRemoveRecord(oldRec, inverseKey, record, key);
        }

        if (newRec && (attr = attrFor(newRec, inverseKey))) {
          attr.inverseDidAddRecord(newRec, inverseKey, record, key);
        }
      }

    // READ
    } else ret = this._super(record, key, newRec);

    return ret ;
  },

  /**
    Called by an inverse relationship whenever the receiver is no longer part
    of the relationship.  If this matches the inverse setting of the attribute
    then it will update itself accordingly.

    @param {SC.Record} record the record owning this attribute
    @param {String} key the key for this attribute
    @param {SC.Record} inverseRecord record that was removed from inverse
    @param {String} inverseKey key on inverse that was modified
  */
  inverseDidRemoveRecord: function(record, key, inverseRecord, inverseKey) {

    var myInverseKey  = get(this, 'inverse'),
        curRec   = RecordAttribute_call.call(this, record, key),
        isMaster = get(this, 'isMaster'), attr;

    // ok, you removed me, I'll remove you...  if isMaster, notify change.
    record.writeAttribute(key, null, !isMaster);
    record.notifyPropertyChange(key);

    // if we have another value, notify them as well...
    if ((curRec !== inverseRecord) || (inverseKey !== myInverseKey)) {
      if (curRec && (attr = attrFor(curRec, myInverseKey))) {
        attr.inverseDidRemoveRecord(curRec, myInverseKey, record, key);
      }
    }
  },

  /**
    Called by an inverse relationship whenever the receiver is added to the
    inverse relationship.  This will set the value of this inverse record to
    the new record.

    @param {SC.Record} record the record owning this attribute
    @param {String} key the key for this attribute
    @param {SC.Record} inverseRecord record that was added to inverse
    @param {String} inverseKey key on inverse that was modified
  */
  inverseDidAddRecord: function(record, key, inverseRecord, inverseKey) {

    var myInverseKey  = get(this, 'inverse'),
        curRec   = RecordAttribute_call.call(this, record, key),
        isMaster = get(this, 'isMaster'),
        attr, nvalue;

    // ok, replace myself with the new value...
    nvalue = this.fromType(record, key, inverseRecord); // convert to attr.
    record.writeAttribute(key, nvalue, !isMaster);
    record.notifyPropertyChange(key);

    // if we have another value, notify them as well...
    if ((curRec !== inverseRecord) || (inverseKey !== myInverseKey)) {
      if (curRec && (attr = attrFor(curRec, myInverseKey))) {
        attr.inverseDidRemoveRecord(curRec, myInverseKey, record, key);
      }
    }
  }

});

