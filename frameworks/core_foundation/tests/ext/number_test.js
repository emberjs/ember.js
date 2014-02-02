// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module, test, start, stop, expect, ok, equals*/

module("Number#ordinal");

/**
 * Admitedly not exhaustive, but tests the numbers from 1-100
 */
test("Properly Computes the Ordinal in english", function () {

  equals(SC.Locale.currentLocale.language, 'en');

  var sts = [1, 21, 31, 41, 51, 61, 71, 81, 91, 101],
    nds = [2, 22, 32, 42, 52, 62, 72, 82, 92, 102],
    rds = [3, 23, 33, 43, 53, 63, 73, 83, 93, 103];
  sts.forEach(function (number) {
    equals(number.ordinal(), 'st');
  });

  nds.forEach(function (number) {
    equals(number.ordinal(), 'nd');
  });

  rds.forEach(function (number) {
    equals(number.ordinal(), 'rd');
  });

  var ths = [];
  for (var i = 0; i < 100; i++) {
    ths.push(i);
  }

  ths.removeObjects(sts);
  ths.removeObjects(nds);
  ths.removeObjects(rds);

  ths.forEach(function (number) {
    equals(number.ordinal(), 'th');
  });

});

/**
 * Admitedly not exhaustive, but tests the numbers from 1-100
 */
test("Properly Computes the Ordinal in a language without an ordinal function using english", function () {

  // force it to japanese
  String.preferredLanguage = 'jp';

  SC.Locale.currentLocale = SC.Locale.createCurrentLocale();

  equals(SC.Locale.currentLocale.language, 'ja');

  var sts = [1, 21, 31, 41, 51, 61, 71, 81, 91, 101],
    nds = [2, 22, 32, 42, 52, 62, 72, 82, 92, 102],
    rds = [3, 23, 33, 43, 53, 63, 73, 83, 93, 103];
  sts.forEach(function (number) {
    equals(number.ordinal(), 'st');
  });

  nds.forEach(function (number) {
    equals(number.ordinal(), 'nd');
  });

  rds.forEach(function (number) {
    equals(number.ordinal(), 'rd');
  });

  var ths = [];
  for (var i = 0; i < 100; i++) {
    ths.push(i);
  }

  ths.removeObjects(sts);
  ths.removeObjects(nds);
  ths.removeObjects(rds);

  ths.forEach(function (number) {
    equals(number.ordinal(), 'th');
  });

});
