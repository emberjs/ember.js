// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @class
  Provides support for having relationships propagate by
  data provided by the data source.

  This means the following interaction is now valid:

      App = { store: SC.Store.create(SC.RelationshipSupport) };

      App.Person = SC.Record.extend({
        primaryKey: 'name',

        name: SC.Record.attr(String),

        power: SC.Record.toOne('App.Power', {
          isMaster: NO,
          inverse: 'person'
        })
      });

      App.Power = SC.Record.extend({
        person: SC.Record.toOne('App.Person', {
          isMaster: YES,
          inverse: 'power'
        })
      });

      var zan = App.store.createRecord(App.Person, { name: 'Zan' }),
          jayna = App.store.createRecord(App.Person, { name: 'Janya' });

      // Wondertwins activate!
      var glacier = App.store.loadRecords(App.Power, [{
        guid: 'petunia',  // Shape of...
        person: 'Jayna'
      }, {
        guid: 'drizzle',  // Form of...
        person: 'Zan'
      }]);


  Leveraging this mixin requires your records to be unambiguously
  defined. Note that this mixin does not take into account record
  relationship created / destroyed on `dataSourceDidComplete`,
  `writeAttribute`, etc. The only support here is for `pushRetrieve`,
  `pushDestroy`, and `loadRecords` (under the hood, `loadRecord(s)` uses
  `pushRetrieve`).

  This mixin also supports lazily creating records when a related
  record is pushed in from the store (but it doesn't exist).

  This means that the previous example could have been simplified
  to this:

      App.Power = SC.Record.extend({
        person: SC.Record.toOne('App.Person', {
          isMaster: YES,
          lazilyInstantiate: YES,
          inverse: 'power'
        })
      });

      // Wondertwins activate!
      var glacier = App.store.loadRecords(App.Power, [{
        guid: 'petunia',  // Shape of...
        person: 'Jayna'
      }, {
        guid: 'drizzle',  // Form of...
        person: 'Zan'
      }]);


  When the `loadRecords` call is done, there will be four unmaterialized
  records in the store, giving the exact same result as the former
  example.

  As a side note, this mixin was developed primarily for use
  in a real-time backend that provides data to SproutCore
  as soon as it gets it (no transactions). This means streaming
  APIs / protocols like the Twitter streaming API or XMPP (an IM
  protocol) can be codified easier.

  @since SproutCore 1.6
 */
SC.RelationshipSupport = {

  /** @private
    Relinquish many records.

    This happens when a master record (`isMaster` = `YES`) removes a reference
    to related records, either through `pushRetrieve` or `pushDestroy`.
   */
  _srs_inverseDidRelinquishRelationships: function (recordType, ids, attr, inverseId) {
    ids.forEach(function (id) {
      this._srs_inverseDidRelinquishRelationship(recordType, id, attr, inverseId);
    },this);
  },

  /** @private
    Relinquish the record, removing the reference of the record being
    destroyed on any related records.
   */
  _srs_inverseDidRelinquishRelationship: function (recordType, id, toAttr, relativeID) {
    var storeKey = recordType.storeKeyFor(id),
      dataHash = this.readDataHash(storeKey),
      key = toAttr.inverse,
      proto = recordType.prototype;

    if (!dataHash || !key) return;

    if (SC.instanceOf(proto[key], SC.SingleAttribute)) {
      delete dataHash[key];
    } else if (SC.instanceOf(proto[key], SC.ManyAttribute)
               && SC.typeOf(dataHash[key]) === SC.T_ARRAY) {
      dataHash[key].removeObject(relativeID);
    }

    this.pushRetrieve(recordType, id, dataHash, undefined, true);
  },

  /** @private
    Add a relationship to many inverse records.

    This happens when a master record (`isMaster` = `YES`) adds a reference
    to another record on a `pushRetrieve`.
   */
  _srs_inverseDidAddRelationships: function (recordType, ids, attr, inverseId) {
    ids.forEach(function (id) {
      this._srs_inverseDidAddRelationship(recordType, id, attr, inverseId);
    },this);
  },


  /** @private
    Add a relationship to an inverse record.

    If the flag lazilyInstantiate is set to YES, then the inverse record will be
    created lazily.

    @param {SC.Record} recordType The inverse record type.
    @param {String} id The id of the recordType to add.
    @param {SC.RecordAttribute} toAttr The record attribute that represents
      the relationship being created.
    @param {String} relativeID The ID of the model that needs to have it's
      relationship updated.
   */
  _srs_inverseDidAddRelationship: function (recordType, id, toAttr, relativeID) {
    var storeKey = recordType.storeKeyFor(id),
        dataHash = this.readDataHash(storeKey),
        status = this.peekStatus(storeKey),
        proto = recordType.prototype,
        key = toAttr.inverse,
        hashKey = proto[key],
        primaryAttr = proto[proto.primaryKey],
        shouldRecurse = false;

    // in case the SC.RecordAttribute defines a `key` field, we need to use that
    hashKey = (hashKey && hashKey.get && hashKey.get('key') || hashKey.key) || key;

    if ((status === SC.Record.EMPTY) &&
        (SC.typeOf(toAttr.lazilyInstantiate) === SC.T_FUNCTION && toAttr.lazilyInstantiate() ||
         SC.typeOf(toAttr.lazilyInstantiate) !== SC.T_FUNCTION && toAttr.lazilyInstantiate)) {

      if (!SC.none(primaryAttr) && primaryAttr.typeClass &&
          SC.typeOf(primaryAttr.typeClass()) === SC.T_CLASS) {

        // Recurse to create the record that this primaryKey points to iff it
        // also should be created if the record is empty.
        // Identifies chained relationships where the object up the chain
        // doesn't exist yet.

        // TODO: this can lead to an infinite recursion if the relationship
        // graph is cyclic
        shouldRecurse = true;
      }
      dataHash = {};
      dataHash[proto.primaryKey] = id;
    }

    if (!dataHash || !key) return;

    if (SC.instanceOf(proto[key], SC.SingleAttribute)) {
      dataHash[hashKey] = relativeID;
    } else if (SC.instanceOf(proto[key], SC.ManyAttribute)) {
      dataHash[hashKey] = dataHash[hashKey] || [];

      if (dataHash[hashKey].indexOf(relativeID) < 0) {
        dataHash[hashKey].push(relativeID);
      }
    }

    this.pushRetrieve(recordType, id, dataHash, undefined, !shouldRecurse);
  },

  // ..........................................................
  // ASYNCHRONOUS RECORD RELATIONSHIPS
  //

  /** @private
    Iterates over keys on the recordType prototype, looking for RecordAttributes
    that have relationships (toOne or toMany).

    @param {SC.Record} recordType The record type to do introspection on to see
      if it has any RecordAttributes that have relationships to other records.
    @param {String} id The id of the record being pushed in.
    @param {Number} storeKey The storeKey
   */
  _srs_pushIterator: function (recordType, id, storeKey, lambda) {
    var proto = recordType.prototype,
        attr, currentHash, key, inverseType;

    if (typeof storeKey === "undefined") {
      storeKey = recordType.storeKeyFor(id);
    }

    currentHash = this.readDataHash(storeKey) || {};

    for (key in proto) {
      attr = proto[key];
      if (attr && attr.typeClass && attr.inverse && attr.isMaster) {
        inverseType = attr.typeClass();

        if (SC.typeOf(inverseType) !== SC.T_CLASS) continue;

        lambda.apply(this, [inverseType, currentHash, attr,
                            attr.get && attr.get('key') || key]);
      }
    }
  },


  /**
    Disassociate records that are related to the one being destroyed iff this
    record has `isMaster` set to `YES`.
   */
  pushDestroy: function (original, recordType, id, storeKey) {
    var existingIDs;

    this._srs_pushIterator(recordType, id, storeKey,
      function (inverseType, currentHash, toAttr, keyValue) {
        // update old relationships
        existingIDs = [currentHash[keyValue] || null].flatten().compact().uniq();
        this._srs_inverseDidRelinquishRelationships(inverseType, existingIDs, toAttr, id);
    });

    return original(recordType, id, storeKey);
  }.enhance(),

  /**
    Associate records that are added via a pushRetrieve, and update subsequent
    relationships to ensure that the master-slave relationship is kept intact.

    For use cases, see the test for pushRelationships.

    The `ignore` argument is only set to true when adding the inverse
    relationship (to prevent recursion).
   */
  pushRetrieve: function (original, recordType, id, dataHash, storeKey, ignore) {
    // avoid infinite recursions when additional changes are propogated
    // from `_srs_inverseDidAddRelationship`
    if (!ignore) {
      var existingIDs, inverseIDs;

      this._srs_pushIterator(recordType, id, storeKey,
        /** @ignore
          @param {SC.Record} inverseType - in a Master-Slave
          relationship when pushing master, Slave is the inverse type
          @param {Object} currentHash - the hash in the data store (data to be replaced by `dataHash`)
          @param {SC.RecordAttribute} toAttr - key in `recordType.prototype` that names isMaster and has an inverse
          @param {String} keyValue - the property name in the datahash that defines this foreign key relationship
         */
        function (inverseType, currentHash, toAttr, keyValue) {
          // update old relationships
          existingIDs = [currentHash[keyValue] || null].flatten().compact().uniq();

          // update new relationships
          inverseIDs = [dataHash[keyValue] || null].flatten().compact().uniq();

          this._srs_inverseDidRelinquishRelationships(inverseType, existingIDs.filter(
            function (el) {
              return inverseIDs.indexOf(el) === -1;
            }), toAttr, id);

          this._srs_inverseDidAddRelationships(inverseType, inverseIDs, toAttr, id);
        });
    }

    storeKey = storeKey || recordType.storeKeyFor(id);
    return original(recordType, id, dataHash, storeKey);
  }.enhance()
};
