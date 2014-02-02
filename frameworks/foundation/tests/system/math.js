// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global module test equals context ok same */

module('SC.Math');

test("0.12 rounded default decimal place", function() {
  equals(SC.Math.round(0.12), 0);
});

test("1.23456789 rounded into decimals", function() {
  equals(SC.Math.round(1.23456789), 1, "0 decimal places");
  equals(SC.Math.round(1.23456789, 1), 1.2, "1 decimal place");
  equals(SC.Math.round(1.23456789, 2), 1.23, "2 decimal places");
  equals(SC.Math.round(1.23456789, 3), 1.235, "3 decimal places");
  equals(SC.Math.round(1.23456789, 4), 1.2346, "4 decimal places");
  equals(SC.Math.round(1.23456789, 7), 1.2345679, "7 decimal places");
});

test("123456.7890 rounded into wholes", function() {
  equals(SC.Math.round(123456.7890), 123457, "0 places");
  equals(SC.Math.round(123456.7890, -1), 123460, "1 place");
  equals(SC.Math.round(123456.7890, -2), 123500, "2 places");
  equals(SC.Math.round(123456.7890, -3), 123000, "3 places");
  equals(SC.Math.round(123456.7890, -4), 120000, "4 places");
});

test("near", function() {
  ok(SC.Math.near(1, 1), "Equal numbers should be considered near -- obviously");
  ok(!SC.Math.near(2, 1), "Unequal whole numbers should not be near");
  ok(SC.Math.near(1.00000001, 1), "Numbers inside lambda range should be considered near");
});

test("near - custom lambda", function() {
  ok(SC.Math.near(2, 1, 1), "Lambda should define an inclusive range -- ie. 2 with lambda 1 is considered near 1");
});
