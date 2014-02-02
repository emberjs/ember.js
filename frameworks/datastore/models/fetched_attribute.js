// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('models/record');
sc_require('models/record_attribute');

/** @class

  Describes a single attribute that is fetched dynamically from the server
  when you request it.  Normally getting a property value with this attribute
  applied will cause call the `find()` method on the record store passing
  the attribute record type as the query key along with the property value,
  owner record, and property key name as parameters.

  The DataSource you hook up to your store must know how to load this kind
  of relationship for this fetched property to work properly.

  The return value is usually an `SC.RecordArray` that will populate with the
  record data so that you can display it.

  @extends SC.RecordAttribute
  @since SproutCore 1.0
*/
SC.FetchedAttribute = SC.RecordAttribute.extend(
  /** @scope SC.FetchedAttribute.prototype */ {

  /**
    Define the param key that will be passed to the `find` method on the
    store.  If `null`, the param will not be sent.  Defaults to `'link'`

    @type String
  */
  paramValueKey: 'link',

  /**
    Define the param key used to send the parent record.  If `null`, the param
    will not be sent.  Defaults to '`owner'`.

    @type String
  */
  paramOwnerKey: 'owner',

  /**
    Define the param key used to send the key name used to reference this
    attribute.  If `null`, the param will not be sent.  Defaults to `"rel"`

    @type String
  */
  paramRelKey: 'rel',

  /**
    Optional query key to pass to find.  Otherwise type class will be
    passed.

    @type String
  */
  queryKey: null,

  /**
    Fetched attributes are not editable

    @type Boolean
  */
  isEditable: NO,

  // ..........................................................
  // LOW-LEVEL METHODS
  //

  /**  @private - adapted for fetching. do find */
  toType: function(record, key, value) {
    var store = record.get('store');
    if (!store) return null ; // nothing to do

    var paramValueKey = this.get('paramValueKey'),
        paramOwnerKey = this.get('paramOwnerKey'),
        paramRelKey   = this.get('paramRelKey'),
        queryKey      = this.get('queryKey') || this.get('typeClass'),
        params        = {};

    // setup params for query
    if (paramValueKey) params[paramValueKey] = value ;
    if (paramOwnerKey) params[paramOwnerKey] = record ;
    if (paramRelKey)   params[paramRelKey]   = this.get('key') || key ;

    // make request - should return SC.RecordArray instance
    return store.find(queryKey, params);
  },

  /** @private - fetched attributes are read only. */
  fromType: function(record, key, value) {
    return value;
  }

}) ;

