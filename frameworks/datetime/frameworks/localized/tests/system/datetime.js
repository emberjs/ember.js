// ==========================================================================
// Project:   DateTime Unit Test
// Copyright: ©2010 Martin Ottenwaelter
// ==========================================================================

/*globals module test ok equals same stop start */

module('Time');

var dt, options, ms, timezone, startTime, timezones;

module("SC.DateTime", {
  setup: function() {
  },
  teardown: function() {
  }
});

/**
 * This test runs expired time format tests, based on the localization strings
 * found in strings.js
 */
test('FormatElapsed', function() {
  var dateTimeTest = SC.DateTime.create();
  equals(dateTimeTest.toFormattedString("%E"), "Right now");
  
  dateTimeTest = dateTimeTest.advance({ second: 1 });  // +1 second;
  equals(dateTimeTest.toFormattedString("%E"), "In a moment");
  dateTimeTest = dateTimeTest.advance({ second: 19 });  // +19 seconds;
  equals(dateTimeTest.toFormattedString("%E"), "In 20 seconds");
  dateTimeTest =  dateTimeTest.advance({ minute: 1 });  // +1 minute;
  equals(dateTimeTest.toFormattedString("%E"), "In a minute");
  dateTimeTest = dateTimeTest.advance({ minute: 4 });  // +5 minutes;
  equals(dateTimeTest.toFormattedString("%E"), "In 5 minutes");
  dateTimeTest = dateTimeTest.advance({ hour: 1 });  // +60 minutes;
  equals(dateTimeTest.toFormattedString("%E"), "An hour from now");
  dateTimeTest = dateTimeTest.advance({ hour: 2 });  // +2 hours;
  equals(dateTimeTest.toFormattedString("%E"), "In about 3 hours");
  dateTimeTest = dateTimeTest.advance({ day: 1 });  // +1 day;
  equals(dateTimeTest.toFormattedString("%E"), dateTimeTest.toFormattedString("_SC.DateTime.dayIn".loc()));
  dateTimeTest = dateTimeTest.advance({ day: 2 });  // +2 days;
  equals(dateTimeTest.toFormattedString("%E"), dateTimeTest.toFormattedString("_SC.DateTime.daysIn".loc()));
  dateTimeTest = dateTimeTest.advance({ day: 5 });  // +1 week;
  equals(dateTimeTest.toFormattedString("%E"), "Next week");
  dateTimeTest = dateTimeTest.advance({ day: 7 });  // +2 week;
  equals(dateTimeTest.toFormattedString("%E"), "In 2 weeks");
  console.warn(dateTimeTest.toString());
  dateTimeTest = dateTimeTest.advance({ month: 1 });  // +1 month;
  console.warn(dateTimeTest.toString());
  equals(dateTimeTest.toFormattedString("%E"), "Next month");
  dateTimeTest = dateTimeTest.advance({ month: 2 });  // +3 month;
  console.warn(dateTimeTest.toString());
  equals(dateTimeTest.toFormattedString("%E"), "In 3 months");
  dateTimeTest = dateTimeTest.advance({ year: 1 });  // +1 year;
  equals(dateTimeTest.toFormattedString("%E"), "Next year");
  dateTimeTest = dateTimeTest.advance({ year: 2 });  // +3 year;
  equals(dateTimeTest.toFormattedString("%E"), "In 3 years");

  var dateTimeTest = SC.DateTime.create();
  dateTimeTest = dateTimeTest.advance({ second: -1 });  // -1 second;
  equals(dateTimeTest.toFormattedString("%E"), "A moment ago");
  dateTimeTest = dateTimeTest.advance({ second: -19 });  // -19 seconds;
  equals(dateTimeTest.toFormattedString("%E"), "20 seconds ago");
  dateTimeTest = dateTimeTest.advance({ minute: -1 });  // -1 minute;
  equals(dateTimeTest.toFormattedString("%E"), "A minute ago");
  dateTimeTest = dateTimeTest.advance({ minute: -4 });  // -5 minutes;
  equals(dateTimeTest.toFormattedString("%E"), "5 minutes ago");
  dateTimeTest = dateTimeTest.advance({ hour: -1 });  // -60 minutes;
  equals(dateTimeTest.toFormattedString("%E"), "An hour ago");
  dateTimeTest = dateTimeTest.advance({ hour: -2 });  // -2 hours;
  equals(dateTimeTest.toFormattedString("%E"), "About 3 hours ago");
  dateTimeTest = dateTimeTest.advance({ day: -1 });  // -1 day;
  equals(dateTimeTest.toFormattedString("%E"), dateTimeTest.toFormattedString("_SC.DateTime.dayAgo".loc()));
  dateTimeTest = dateTimeTest.advance({ day: -2 });  // -2 days;
  equals(dateTimeTest.toFormattedString("%E"), dateTimeTest.toFormattedString("_SC.DateTime.daysAgo".loc()));
  dateTimeTest = dateTimeTest.advance({ day: -5 });  // -1 week;
  equals(dateTimeTest.toFormattedString("%E"), "About a week ago");
  dateTimeTest = dateTimeTest.advance({ day: -7 });  // -2 week;
  equals(dateTimeTest.toFormattedString("%E"), "2 weeks ago");
  dateTimeTest = dateTimeTest.advance({ month: -1 });  // -1 month;
  equals(dateTimeTest.toFormattedString("%E"), "About a month ago");
  dateTimeTest = dateTimeTest.advance({ month: -2 });  // -3 month;
  equals(dateTimeTest.toFormattedString("%E"), "3 months ago");
  dateTimeTest = dateTimeTest.advance({ year: -1 });  // -1 year;
  equals(dateTimeTest.toFormattedString("%E"), "Last year");
  dateTimeTest = dateTimeTest.advance({ year: -2 });  // -3 year;
  equals(dateTimeTest.toFormattedString("%E"), "3 years ago");
});
