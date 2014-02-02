// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module("SC.View - Static Layout functionality");

test("Static layout", function() {
  var view = SC.View.create({
    useStaticLayout: YES
  });

  view.createLayer();

  ok(view.$().is('.sc-static-layout'), "views with useStaticLayout get the sc-static-layout class");
});

test("Background color", function() {
  var view = SC.View.create({
    backgroundColor: "red"
  });

  view.createLayer();

  equals(view.get('layer').style.backgroundColor, "red", "backgroundColor sets the CSS background-color class");
});
