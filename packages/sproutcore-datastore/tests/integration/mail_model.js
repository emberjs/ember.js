// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module test ok equals same */

var Mail;
module("Sample Model from a webmail app", { 
  setup: function() {

    // namespace
    Mail = SC.Object.create({
      store: SC.Store.create()
    });

    // Messages are stored in mailboxes.
    Mail.Mailbox = SC.Record.extend({

      name:    SC.Record.attr(String, {
        isRequired: YES
      }),

      // here is the mailbox type.  must be one of INBOX, TRASH, OTHER
      mailbox: SC.Record.attr(String, {
        isRequired: YES,
        only: 'INBOX TRASH OTHER'.w()
      }),
      
      // this is the sortKey that should be used to order the mailbox.
      sortKey: SC.Record.attr(String, {
        isRequired: YES,
        only: 'subject date from to'.w()
      }),
      
      // load the list of messages.  We use the mailbox guid to load the 
      // messages.  Messages use a foreign key to move the message around.
      // an edit should cause this fetched property to reload.
      //
      // when you get messages, it will fetch "mailboxMessages" from the 
      // owner store, passing the receiver as the param unless you implement
      // the mailboxMessageParams property.
      messages: SC.Record.fetch('Mail.Message')
    });
    
    // A message has a subject, date, sender, mailboxes, and messageDetail
    // which is a to-one relationship.  mailboxes is kept as an array of 
    // guids.
    Mail.Message = SC.Record.extend({

      date:        SC.Record.attr(Date, { isRequired: YES }),
      
      mailboxes:   SC.Record.toMany('Mail.Mailbox', {
        inverse: 'messages',
        isMaster: YES,
        minimum: 1 // you cannot have less than one mailbox.
      }),
      
      // describe the message detail.
      messageDetail: SC.Record.toOne('Mail.MessageDetail', {
        inverse: "message", // MessageDetail.message should == this.primaryKey
        isDependent: YES 
      }),

      // access the named property through another property.
      body:    SC.Record.through('messageDetail'),
      cc:      SC.Record.through('messageDetail'),
      bcc:     SC.Record.through('messageDetail'),
      subject: SC.Record.through('messageDetail')
    });
    
    Mail.Contact = SC.Record.extend({
      firstName: SC.Record.attr(String),
      lastName:  SC.Record.attr(String),
      email:     SC.Record.attr(String)
    });
    
    // define server.  RestServer knows how to automatically save records to 
    // the server.  You need to define your fetch requests here though.
    Mail.server = SC.RestServer.create({
      
      // fetch request for mailboxes.
      fetchMailboxes: function(params) {
        return this.fetchRequest('/ma/mailboxes?alt=json') ;
      }
    });

  }
});

