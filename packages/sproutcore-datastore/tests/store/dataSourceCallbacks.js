// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var store, storeKey, json;
module("SC.Store#dataSourceCallbacks", {
  setup: function() {
    
    store = SC.Store.create();
    
    json1 = {
      guid: "commitGUID1",
      string: "string",
      number: 23,
      bool:   YES
    };
    json2 = {
      guid: "commitGUID2",
      string: "string",
      number: 23,
      bool:   YES
    };
    json3 = {
      guid: "commitGUID3",
      string: "string",
      number: 23,
      bool:   YES
    };
    json4 = {
      guid: "commitGUID4",
      string: "string",
      number: 23,
      bool:   YES
    };
    json5 = {
      guid: "commitGUID5",
      string: "string",
      number: 23,
      bool:   YES
    };
    json6 = {
      guid: "commitGUID6",
      string: "string",
      number: 23,
      bool:   YES
    };
    json7 = {
      guid: "commitGUID7",
      string: "string",
      number: 23,
      bool:   YES
    };
    json8 = {
      guid: "commitGUID8",
      string: "string",
      number: 23,
      bool:   YES
    };
    json9 = {
      guid: "commitGUID9",
      string: "string",
      number: 23,
      bool:   YES
    };
    json10 = {
      guid: "commitGUID10",
      string: "string",
      number: 23,
      bool:   YES
    };
    json11 = {
      guid: "commitGUID11",
      string: "string",
      number: 23,
      bool:   YES
    };
    json12 = {
      guid: "commitGUID12",
      string: "string",
      number: 23,
      bool:   YES
    };
    json13 = {
      guid: "commitGUID13",
      string: "string",
      number: 23,
      bool:   YES
    };
    json14 = {
      guid: "commitGUID14",
      string: "string",
      number: 23,
      bool:   YES
    };
    json15 = {
      guid: "commitGUID15",
      string: "string",
      number: 23,
      bool:   YES
    };
    json16 = {
      guid: "commitGUID16",
      string: "string",
      number: 23,
      bool:   YES
    };
    storeKey1 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey1, json1, SC.Record.READY_CLEAN);
    storeKey2 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey2, json2, SC.Record.BUSY_LOADING);
    storeKey3 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey3, json3, SC.Record.BUSY_CREATING);
    storeKey4 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey4, json4, SC.Record.BUSY_COMMITTING);
    storeKey5 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey5, json5, SC.Record.BUSY_REFRESH_CLEAN);
    storeKey6 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey6, json6, SC.Record.BUSY_REFRESH_DIRTY);
    storeKey7 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey7, json7, SC.Record.BUSY_DESTROYING);
    storeKey8 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey8, json8, SC.Record.BUSY);
  
    storeKey9 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey9, json9, SC.Record.READY_CLEAN);
    storeKey10 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey10, json10, SC.Record.BUSY_DESTROYING);
    storeKey11 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey11, json11, SC.Record.BUSY_CREATING);
  
    storeKey12 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey12, json12, SC.Record.READY_CLEAN);
    storeKey13 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey13, json13, SC.Record.BUSY_CREATING);
  
    storeKey14 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey14, json14, SC.Record.READY_CLEAN);
    storeKey15 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey15, json15, SC.Record.BUSY_CREATING);

    storeKey16 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey16, json16, SC.Record.BUSY_LOADING);
  
    SC.RunLoop.begin();
  
  },
  
  teardown: function() {
    SC.RunLoop.end();
  }
});

test("Confirm that dataSourceDidCancel switched the records to the right states", function() {
  var msg='', status;
  try{
    store.dataSourceDidCancel(storeKey1);
    msg='';  
  }catch(error){
    msg=error.message;
  }
  equals(SC.Record.BAD_STATE_ERROR.message, msg, 
    "should throw the following error ");
  
  store.dataSourceDidCancel(storeKey2);
  status = store.readStatus( storeKey2);
  equals(status, SC.Record.EMPTY, "the status should have changed to EMPTY");
  
  store.dataSourceDidCancel(storeKey3);
  status = store.readStatus( storeKey3);
  equals(status, SC.Record.READY_NEW, "the status should have changed to READY_NEW");
  
  store.dataSourceDidCancel(storeKey4);
  status = store.readStatus( storeKey4);
  equals(status, SC.Record.READY_DIRTY, "the status should have changed to READY_DIRTY");
  
  store.dataSourceDidCancel(storeKey5);
  status = store.readStatus( storeKey5);
  equals(status, SC.Record.READY_CLEAN, "the status should have changed to READY_CLEAN");
  
  store.dataSourceDidCancel(storeKey6);
  status = store.readStatus( storeKey6);
  equals(status, SC.Record.READY_DIRTY, "the status should have changed to READY_DIRTY");
  
  store.dataSourceDidCancel(storeKey7);
  status = store.readStatus( storeKey7);
  equals(status, SC.Record.DESTROYED_DIRTY, "the status should have changed to DESTROYED_DIRTY");
  
  try{
    store.dataSourceDidCancel(storeKey8);  
    msg='';
  }catch(error){
    msg=error.message;
  }
  equals(SC.Record.BAD_STATE_ERROR.message, msg, 
    "should throw the following error ");
  
});


test("Confirm that dataSourceDidComplete switched the records to the right states", function() {
  var msg='', status;
  try{
    store.dataSourceDidComplete(storeKey9);
    msg='';  
  }catch(error){
    msg=error.message;
  }
  equals(SC.Record.BAD_STATE_ERROR.message, msg, 
    "should throw the following error ");

  try{
    store.dataSourceDidComplete(storeKey10);  
    msg='';
  }catch(error){
    msg=error.message;
  }
  equals(SC.Record.BAD_STATE_ERROR.message, msg, 
    "should throw the following error ");
  
  store.dataSourceDidComplete(storeKey11);
  status = store.readStatus( storeKey11);
  equals(status, SC.Record.READY_CLEAN, "the status should have changed to READY_CLEAN.");
  
});


test("Confirm that dataSourceDidDestroy switched the records to the right states", function() {
  var msg='', status;
  try{
    store.dataSourceDidDestroy(storeKey12);  
    msg='';
  }catch(error){
    msg=error.message;
  }  
  equals(SC.Record.BAD_STATE_ERROR.message, msg, 
    "should throw the following error ");
  
  store.dataSourceDidDestroy(storeKey13);
  status = store.readStatus( storeKey13);
  equals(status, SC.Record.DESTROYED_CLEAN, "the status should have changed to DESTROYED_CLEAN.");
  
});


test("Confirm that dataSourceDidError switched the records to the right states", function() {
  var msg='', status;
  try{
    store.dataSourceDidError(storeKey14, SC.Record.BAD_STATE_ERROR);  
    msg='';
  }catch(error){
    msg = error.message;
  }
  equals(SC.Record.BAD_STATE_ERROR.message, msg, 
    "should throw the following error ");

  store.dataSourceDidError(storeKey15, SC.Record.BAD_STATE_ERROR);
  status = store.readStatus( storeKey15);
  equals(status, SC.Record.ERROR, 
    "the status shouldn't have changed.");
});

test("Confirm that errors passed to dataSourceDidError make it into the recordErrors array", function() {
  var msg = '';

  ok(!store.recordErrors, "recordErrors should be null at this point");

  try {
    store.dataSourceDidError(storeKey16, SC.Record.GENERIC_ERROR);
  } catch (error) {
    msg = error.message;
  }
 
  equals(store.recordErrors[storeKey16], SC.Record.GENERIC_ERROR,
    "recordErrors[storeKey] should be the right error object");
});
