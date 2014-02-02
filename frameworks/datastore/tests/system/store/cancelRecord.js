// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var store, storeKey1,storeKey2;
var json1, json2;
var storeKey6, storeKey7;

module("SC.Store#cancelRecord", {
  setup: function() {
    
    store = SC.Store.create();
    
    json1 = {
      guid: "cancelGUID1",
      string: "string",
      number: 23,
      bool:   YES
    };
    json2 = {
      guid: "cancelGUID2",
      string: "string",
      number: 23,
      bool:   YES
    };
    
    storeKey1 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey1, json1, SC.Record.EMPTY);
    storeKey2 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey2, json2, SC.Record.READY_NEW);
    }
});

test("Check for error state handling and make sure that the method executes.", function() {
  var throwError=false;
  try{
    store.cancelRecord(undefined, undefined, storeKey1);
    throwError=false;
  }catch (error){
    throwError=true;
  }
  ok(throwError, "cancelRecord should throw and error if the record status is EMPTY or ERROR");
  try{
    store.cancelRecord(undefined, undefined, storeKey2);
    throwError=true;    
  }catch (error){
    throwError=false;
  }
  ok(throwError, " cancelRecord was successfully executed.");
  
});
