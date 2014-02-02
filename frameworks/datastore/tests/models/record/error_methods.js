// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

var store, Application;
module("SC.Record Error Methods", {
  setup: function() {

    Application = {};
    Application.Thing = SC.Record.extend({
      name: SC.Record.attr(String)
    });

    SC.RunLoop.begin();
    store = SC.Store.create();

    var records = [
      { guid: 1, name: 'Thing One' },
      { guid: 2, name: 'Thing Two' }
    ];

    var types = [ Application.Thing, Application.Thing ];

    store.loadRecords(types, records);
    SC.RunLoop.end();
  },

  teardown: function() {
    store = null;
    Application = null;
  }
});

test("Verify error methods behave correctly", function() {
  var thing1 = store.find(Application.Thing, 1);
  var storeKey = thing1.get('storeKey');

  var thing2 = store.find(Application.Thing, 2);

  SC.RunLoop.begin();
  store.writeStatus(storeKey, SC.Record.BUSY_LOADING);
  store.dataSourceDidError(storeKey, SC.Record.GENERIC_ERROR);
  SC.RunLoop.end();

  ok((thing1.get('isError') === YES), "isError on thing1 should be YES");
  ok((thing2.get('isError') === NO), "isError on thing2 should be NO");

  equals(thing1.get('errorObject'), SC.Record.GENERIC_ERROR,
    "get('errorObject') on thing1 should return the correct error object");

  equals(thing2.get('errorObject'), null,
    "get('errorObject') on thing2 should return null");
});
