// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var store, storeKey, json;
module("SC.Store#pushChanges", {
  setup: function() {
    SC.RunLoop.begin();
    store = SC.Store.create();
    
    json = {
      string: "string",
      number: 23,
      bool:   YES
    };
    
    storeKey1 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey1, json, SC.Record.EMPTY);

    storeKey2 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey2, json, SC.Record.EMPTY);

    storeKey3 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey3, json, SC.Record.EMPTY);

    storeKey4 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey4, json, SC.Record.BUSY_LOADING);

    storeKey5 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey5, json, SC.Record.BUSY_LOADING);

    storeKey6 = SC.Store.generateStoreKey();
    store.writeDataHash(storeKey6, json, SC.Record.BUSY_LOADING);
    SC.RunLoop.end();
  }
});

test("Do a pushRetrieve and check if there is conflicts", function() {
  var res = store.pushRetrieve(SC.Record, undefined, undefined, storeKey1);
  equals(res, storeKey1, "There is no conflict, pushRetrieve was succesful.");
  res = store.pushRetrieve(SC.Record, undefined, undefined, storeKey4);
  ok(!res, "There is a conflict, because of the state, this is expected.");
});

test("Do a pushDestroy and check if there is conflicts", function() {
  var res = store.pushDestroy(SC.Record, undefined, storeKey2);
  equals(res, storeKey2, "There is no conflict, pushDestroy was succesful.");
  res = store.pushRetrieve(SC.Record, undefined, undefined, storeKey5);
  ok(!res, "There is a conflict, because of the state, this is expected.");
});

test("Issue a pushError and check if there is conflicts", function() {
  var res = store.pushError(SC.Record, undefined, SC.Record.NOT_FOUND_ERROR, storeKey3);
  equals(res, storeKey3, "There is no conflict, pushError was succesful.");
  res = store.pushRetrieve(SC.Record, undefined, undefined, storeKey6);
  ok(!res, "There is a conflict, because of the state, this is expected.");
});

