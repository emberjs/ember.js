// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok */

module("SC.View");

test("setting themeName should trigger a theme observer", function() {
  var count = 0;
  var view = SC.View.create({
    themeDidChange: function() {
      count++;
    }.observes('theme')
  });

  view.set('themeName', 'hello');
  equals(1, count, "theme observers should get called");
});

test("setting themeName should trigger a theme observer when extending", function() {
  var count = 0;
  var View = SC.View.extend({
    themeDidChange: function() {
      count++;
    }.observes('theme')
  });

  View.create().set('themeName', 'hello');
  equals(1, count, "theme observers should get called");
});

test("it still works with the backward compatible theme property", function() {
  var count = 0;
  var view = SC.View.create({
    theme: 'sc-base',
    themeDidChange: function() {
      count++;
    }.observes('theme')
  });

  equals(SC.Theme.find('sc-base'), view.get('theme'));
  view.set('themeName', 'hello');
  equals(1, count, "theme observers should get called");
});

test("it still works with the backward compatible theme property when extending", function() {
  var count = 0;
  var View = SC.View.extend({
    theme: 'sc-base',
    themeDidChange: function() {
      count++;
    }.observes('theme')
  });

  var view = View.create();
  equals(SC.Theme.find('sc-base'), view.get('theme'));
  view.set('themeName', 'hello');
  equals(1, count, "theme observers should get called");
});

