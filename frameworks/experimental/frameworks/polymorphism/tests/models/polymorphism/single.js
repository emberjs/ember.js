// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

(function() {
  
  var store, Person, Place, Male, Female, home, colin, maggie;
  
  module("Polymorphic SC.Record - toOne tests", {
    setup: function() {
      SC.RunLoop.begin();
      store = SC.Store.create();

      Person = SC.Record.extend({
        name: SC.Record.attr(String)
      });
      Person.isPolymorphic = YES;

      Place = SC.Record.extend({
        where: SC.Record.attr(String),
        person: SC.Record.toOne(Person, {inverse: 'place'})
      });

      Male = Person.extend({
        isMale: YES
      });

      Female = Person.extend({
        isFemale: YES
      });

      home = store.createRecord(Place, {
        guid: '0',
        where: 'Canada',
        person: '1'
      });

      colin = store.createRecord(Male, {
        guid: '1',
        name: 'Colin'
      });

      maggie = store.createRecord(Female, {
        guid: '2',
        name: 'Maggie'
      });
    },
    teardown: function() {
      store = Person = Place = Male = Female = home = colin = maggie = null;
      SC.RunLoop.end();
    }
  });

  test("toOne relationship returns record of correct type", function() {
    equals(home.get('person'), colin, "Correct record is returned for polymorphic relationship");
    ok(SC.kindOf(home.get('person'), Male), "Correct record type is returned for polymorphic relationship");
  });

  test("setting toOne relationship works", function() {
    home.set('person', maggie);
    ok(SC.kindOf(home.get('person'), Female), "Changing toOne to record of different type works");
  });

})();
