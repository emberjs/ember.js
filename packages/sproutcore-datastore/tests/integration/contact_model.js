// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module test ok equals same AB */

var AB;
module("Sample Model from an address book app", { 
  setup: function() {

    // define the application space
    AB = SC.Application.create({
      store: SC.Store.create(SC.Record.fixtures)
    });

    // Describes a single contact detail such as a phone number, address,
    // email, etc.
    AB.ContactDetail = SC.Record.extend({
      
    });
    
    // Describes a generic contact.  A contact has contact details, which 
    // describe contact info.  A contact also has a fullName, which changes
    // depending on the type.
    AB.Contact = SC.Record.extend({

      details: SC.Record.toMany(AB.ContactDetail)
      
    });
    
    AB.ContactGroup = SC.Record.extend({
      
      // creates a computed property that will fetch with a keyname 'contacts'
      // and params 'group': this.  Collection will be setup with newRecord
      // to create contact records.
      contacts: SC.Collection.fetch({
        inverse: 'group',
        recordType: 'AB.Contact'
      })
      
    });
    
    // a generic contact detail must always have a label, kind, and value
    AB.ContactDetail = SC.Record.extend({
      validateLabel: SC.Record.validate(String).required(),
      validateKind:  SC.Record.validate(String).required()
    });

    AB.PhoneNumber   = AB.ContactDetail.extend({
      kindDefault:  'phone',
      labelDefault: 'home'
    });
    
    AB.Contact = SC.Record.extend({

      // firstName, lastName, middleName
      // companyName
      isCompany: SC.Record.property(Boolean, { defaultValue: NO }),
      
      // contact has one or more phones stored in a hash.  
      phones: SC.Collection.inline({ recordType: 'AB.PhoneNumber' })
    });

    /* IDEA: Every record has an "owner".  The owner can be a Store or a
       Collection.  When the record is destroyed or updated, it will notify
       its owner.
       
       A Collection can be inlined, referenced, or fetched.  Inlined means 
       the full record data is stored in the parent itself.  Referenced means
       only the primaryKey is stored.  Fetched means the collection is loaded
       from the store dynamically.
       
       A Collection can also indicate that it's records are dependent.  
       Dependent records are owned exclusively by the parent record.  Deleting
       parent will delete the collection also.
       
       Otherwise deleting the record will remove it from the store only.
      */
      
    /* hm -- a record could have details stored inline for optimization, but 
       it is not actually owned there.  it should just be loaded into the 
       store and treated independently.
    */
    
    // A contact has contactDetails, which is an array of inlined contact 
    // details.
    AB.Contact = SC.Record.extend({
      
      firstNameType: String,
      lastNameType:  String,
      
      contactDetailsType: SC.Collection.inline({
        isDependent: YES,
        recordType:  'AB.ContactDetail'
      }),
      
      // a contact belongs to one or more groups stored as an array on 
      // the contact.  You can change the groups array by replacing the 
      // array.
      groups: function(key, groups) {

        // if groups is replaced, write back guids
        // also, each group record should have it's contacts invalidated.
        if (groups !== undefined) {
          this.writeAttribute('groups', groups.getEach('guid')) ;
          groups.invoke('notifyPropertyChange', 'contacts');
        }
        return this.get('store').records(this.readAttribute('groups'));
      }.property().cacheable()
      
    });
    
    AB.ContactAddress = SC.Record.extend({
      
      descriptionType: String,
      street1: String,
      street2: String,
      city: String,
      state: String,
      country: String,   
      
      // the contact the address belongs to.
      contact: function() {
        this.get('store').record(this.readAttribute('contact'));
      }
    });
    
  }
});
