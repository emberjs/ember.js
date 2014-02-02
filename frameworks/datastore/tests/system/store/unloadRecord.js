// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

(function() {
  var store, Person, Place;

  module("SC.Store#unloadRecord", {
    setup: function() {
      Person = SC.Record.extend({
        name: SC.Record.attr(String)
      });

      Place = SC.Record.extend({
        name: SC.Record.attr(String)
      });

      SC.RunLoop.begin();

      store = SC.Store.create();

      store.loadRecords(Person, [
        {guid: 1, name: 'Soups'},
        {guid: 2, name: 'Palmdale'},
        {guid: 3, name: 'Dubs'}
      ]);

      store.loadRecords(Place, [
        {guid: 4, name: "San Francisco"},
        {guid: 5, name: "St. John's"}
      ]);

      SC.RunLoop.end();
    },
    teardown: function() {
      store = Person = Place = null;
    }
  });

  test("Unload one record via storeKey", function() {
    var people = store.find(Person),
        record = store.find(Person, 1);

    equals(people.get('length'), 3, "precond - there are 3 People records in the store");

    store.unloadRecord(Person, 1);

    people = store.find(Person);
    equals(people.get('length'), 2, "there are 2 People records in the store after calling unloadRecord");
    ok(store.peekStatus(record) & SC.Record.EMPTY, "Record now has status of SC.Record.EMPTY");
  });

})();
