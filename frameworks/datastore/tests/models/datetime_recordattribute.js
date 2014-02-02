// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test */

// This file tests both SC.DateTime which is in the foundation framework and
// SC.RecordAttribute which is in the datastore framework. The desktop
// framework might not be the best place for it but it works because the
// desktop framework requires both datestore and foundation frameworks.

var sprocket, nullSprocket, nullUnixTime, d1, d2, d3;

module('SC.DateTime transform', {

  setup: function() {

    d1 = SC.DateTime.create({ year: 2009, month: 3, day: 1, hour: 20, minute: 30, timezone: 480 });
    d2 = SC.DateTime.create({ year: 2009, month: 3, day: 1, hour: 20, minute: 30, timezone: SC.DateTime.timezone });
    d3 = SC.DateTime.create({ year: 2009, month: 3, day: 1, hour: 20, minute: 30, timezone: 0 });

    var MyApp = SC.Object.create({
      store: SC.Store.create()
    });

    MyApp.Sprocket = SC.Record.extend({
      createdAt: SC.Record.attr(SC.DateTime),
      frenchCreatedAt: SC.Record.attr(SC.DateTime, { format: '%d/%m/%Y %H:%M:%S' }),
      unixTimeCreatedAt: SC.Record.attr(SC.DateTime, { useUnixTime: YES })
    });

    SC.RunLoop.begin();
    MyApp.store.loadRecords(MyApp.Sprocket, [
      {
        guid: '1',
        createdAt: '2009-03-01T20:30:00-08:00',
        frenchCreatedAt: '01/03/2009 20:30:00',
        unixTimeCreatedAt: 1235939400
      },
      {
        guid: '2',
        createdAt: null,
        frenchCreatedAt: null,
        unixTimeCreatedAt: 'invalidValue'
      },
      {
        guid: '3',
        createdAt: null,
        frenchCreatedAt: null,
        unixTimeCreatedAt: null
      }
    ]);
    SC.RunLoop.end();

    sprocket = MyApp.store.find(MyApp.Sprocket, '1');
    nullSprocket = MyApp.store.find(MyApp.Sprocket, '2');
    nullUnixTime = MyApp.store.find(MyApp.Sprocket, '3');
  }

});

test("reading a DateTime should successfully parse the underlying string value", function() {
  equals(sprocket.get('createdAt'), d1, 'reading a DateTime should return the correct SC.DateTime object');
  equals(sprocket.get('frenchCreatedAt'), d2, 'reading a DateTime with a custom format should return the correct SC.DateTime object');
});

test("writing a DateTime should successfully format the value into a string", function() {
  d1 = d1.advance({ year: 1, hour: 2, minute: 28 });
  d2 = d2.advance({ month: -2, minute: 16 });

  sprocket.set('createdAt', d1);
  sprocket.set('frenchCreatedAt', d2);

  equals(sprocket.readAttribute('createdAt'), '2010-03-01T22:58:00-08:00', 'writing a DateTime should successfully format the value into the a string');
  equals(sprocket.readAttribute('frenchCreatedAt'), '01/01/2009 20:46:00', 'writing a DateTime with a custom format should successfully format the value into the a string');
});

test("reading or writing null values should work", function() {
  sprocket.set('createdAt', null);
  equals(sprocket.readAttribute('createdAt'), null, 'Setting a date attribute to null should work');

  equals(nullSprocket.get('createdAt'), null, 'Reading a null date attribute should work');
  equals(nullUnixTime.get('unixTimeCreatedAt'), null, 'Reading a null date attribute with useUnixTime: YES should work');
});

test("reading and writing a DateTime should successfully convert to/from unix time", function() {
  // Reading test
  equals(sprocket.get('unixTimeCreatedAt'), d3, 'reading a DateTime stored in unix time format should return the correct SC.DateTime object');

  // Writing test
  d3 = d3.advance({ year: 2, month: 7, day: 14, hour: -3 });
  sprocket.set('unixTimeCreatedAt', d3);
  equals(sprocket.readAttribute('unixTimeCreatedAt'), 1318699800, 'writing a DateTime attribute that stored in unix time format should store the correct attribute');
});

test("unix time should default to 0 ms when invalid value is provided", function() {
  equals(nullSprocket.get('unixTimeCreatedAt'), SC.DateTime.create({ milliseconds: 0, timezone: 0 }), 'reading a DateTime store in unix time should default to 0ms when an invalid value is provided');
});
