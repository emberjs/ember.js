// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test json0_9 json10_19 json20_29 json30_39 json40_49 */

var MyApp;

/* Define a standard test setup for use in most integration and unit tests. */
var StandardTestSetup = {
  setup: function() {

    // define namespace
    MyApp = SC.Object.create({
      store: SC.Store.create()
    });

    // define basic record
    MyApp.Author = SC.Record.extend({
      isCylon: function() {
        switch(this.get('fullName')) {
          case "Saul Tigh":
          case "Galen Tyrol":
            return YES;
          default: 
            return NO;
        }
      }.property('fullName').cacheable()
    });

    // define fixture server.
    // MyApp.fixtureServer = SC.FixtureServer.create({
    //   simulateResponseFromServer: function(guid, storeKey) {
    //     var json = [];
    //     if(guid === '123') {
    //       json = [ {"type": "Author", "guid": "123","fullName": "Galen Tyrol", "bookTitle": "The Fear of the Spiders", "address":" London University, 142 Castro St, London, UK"}];
    //     }
    //     if(guid === 'john locke') {
    //       this.get('childStore').didCreateRecords([storeKey], ['abcdefg'], [{guid: 'abcdefg', fullName: "John Locke", bookTitle: "A Letter Concerning Toleration"}]);
    // 
    //       return;
    //     }
    //     if(guid === 'jim locke') {
    //       console.log('LOADING JIM LOCKE %@'.fmt(storeKey));
    //       this.get('childStore').didCreateRecords([storeKey], ['abc'], [{guid: 'abc', fullName: "Jim Locke", bookTitle: "A Letter Concerning Toleration Part Deux"}]);
    // 
    //       return;
    //     }
    // 
    //     this.get('childStore').loadRecords(json, MyApp.Author);
    // 
    //   }
    // });
    // 
    // MyApp.fixtureServer.addStore(MyApp.store); 
    
    
    // verify initial state
    // ok(MyApp, "MyApp is defined") ;
    // ok(MyApp.store, "MyApp.store is defined") ;
    // ok(MyApp.fixtureServer, "MyApp.fixtureServer is defined") ;
    // ok(MyApp.Author, "MyApp.Author is defined") ;
    // ok(json0_9, "json0_9 is defined") ;
    // ok(json10_19, "json10_19 is defined") ;
    // ok(json20_29, "json20_29 is defined") ;
    // ok(json30_39, "json30_39 is defined") ;
    // ok(json40_49, "json40_49 is defined") ;
   
    return this ;
  },
  
  loadRecords: function() {
    
    // load in some records -- dup json first so that edits to the data will
    // not impact other tests
    function dup(array) {
      var ret = [], len = array.length, idx;
      for(idx=0;idx<len;idx++) ret[idx] = SC.clone(array[idx]);
      return ret ;
    }
    
    MyApp.store.loadRecords(dup(json0_9), MyApp.Author);
    MyApp.store.loadRecords(dup(json10_19), MyApp.Author, 'guid');
    
    var recordTypes = [MyApp.Author, MyApp.Author, MyApp.Author, MyApp.Author, MyApp.Author, MyApp.Author, MyApp.Author, MyApp.Author, MyApp.Author, MyApp.Author];
    MyApp.store.loadRecords(dup(json20_29), recordTypes);

    recordTypes = [MyApp.Author, MyApp.Author, MyApp.Author, MyApp.Author, MyApp.Author, MyApp.Author, MyApp.Author, MyApp.Author, MyApp.Author, MyApp.Author];
    MyApp.store.loadRecords(dup(json30_39), recordTypes, 'guid');

    MyApp.store.loadRecords(dup(json40_49));
    return this ;
  }
};
 
