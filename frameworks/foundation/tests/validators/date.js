// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same */

module("SC.Validator.Date");

test("Converts into String if a number is given",function() {
  var date = SC.DateTime.create({milliseconds: 1234947136000 + (new Date().getTimezoneOffset() * 60000)});

  var c = SC.Validator.Date.fieldValueForObject(date._ms, '', '');
  var expected = "Feb 18, 2009 8:52:16 AM";
  equals(c, expected, "Number converted to date format");
});

test("Converts into number when date string is given", function() {
  var expected = 1234918336000;
  var date = SC.DateTime.create(expected);
  var d = SC.Validator.Date.objectForFieldValue(date.toFormattedString('%b %d, %Y %i:%M:%S %p'),'','');
  equals(d, expected, "Number of milliseconds returned is correct");
});
