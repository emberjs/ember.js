// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2010 Evin Grano
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime');
require('sproutcore-datastore/system/record');
require('sproutcore-datastore/attributes/record_attribute');
require('sproutcore-datastore/attributes/child_attribute');
require('sproutcore-datastore/system/child_array');

var get = SC.get, set = SC.set;

/** @class
  
  ChildrenAttribute is a subclass of ChildAttribute and handles to-many 
  relationships for child records.
  
  When setting ( `set()` ) the value of a toMany attribute, make sure
  to pass in an array of SC.Record objects.
  
  There are many ways you can configure a ChildrenAttribute:
  
      contacts: SC.ChildrenAttribute.attr('SC.Child');
  
  @extends SC.RecordAttribute
  @since SproutCore 1.0
*/
SC.ChildrenAttribute = SC.ChildAttribute.extend(
  /** @scope SC.ChildrenAttribute.prototype */ {
    
  // ..........................................................
  // LOW-LEVEL METHODS
  //
  
  /**  @private - adapted for to many relationship */
  toType: function(record, key, value) {
    var attrKey   = get(this, 'key') || key,
        arrayKey  = '__kidsArray__'+SC.guidFor(this),
        ret       = record[arrayKey],
        recordType  = get(this, 'typeClass'), rel;

    // lazily create a ManyArray one time.  after that always return the 
    // same object.
    if (!ret) {
      ret = SC.ChildArray.create({ 
        record:         record,
        propertyName:   attrKey,
        defaultRecordType: recordType
      });

      record[arrayKey] = ret ; // save on record
      rel = get(record, 'relationships');
      if (!rel) set(record, 'relationships', rel = []);
      rel.push(ret); // make sure we get notified of changes...
    }

    return ret;
  },
  
  // Default fromType is just returning itself
  fromType: function(record, key, value){
    var sk, store, 
        arrayKey = '__kidsArray__'+SC.guidFor(this),
        ret = record[arrayKey];
    if (record) {
      record.writeAttribute(key, value);
      if (ret) ret = ret.recordPropertyDidChange();
    }
    
    return ret;
  }
});


