// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok */

var context = null, elem = null;

module("SC.RenderContext#update", {
  setup: function() {
    elem = document.createElement('div');
    context = SC.RenderContext(elem) ;
  },

  teardown: function() {
    elem = context = null; // avoid memory leaks
  }
});

test("should replace innerHTML of DIV if strings were pushed", function() {
  elem.innerHTML = "initial";
  context.push("changed").update();
  equals(elem.innerHTML, "changed", "innerHTML did change");
});

test("should NOT replace innerHTML of DIV if no strings were pushed", function() {
  elem.innerHTML = "initial";
  context.update();
  equals(elem.innerHTML, "initial", "innerHTML did NOT change");
});

test("returns receiver if no prevObject", function() {
  equals(context.update(), context, "return value");
});

test("returns previous context if there is one", function() {
  var c2 = context.begin(elem);
  equals(c2.update(), context, "returns prev context");
});

test("clears internal _elem to avoid memory leaks on update", function() {
  ok(!!context._elem, 'precondition - has element')  ;
  context.update();
  ok(!context._elem, "no longer an element");
});

// ..........................................................
// Attribute Editing
//
module("SC.RenderContext#update - attrs", {
  setup: function() {
    elem = document.createElement('div');
    SC.$(elem).attr("foo", "initial");
    context = SC.RenderContext(elem);
  },

  teardown: function() {
    elem = context = null ;
  }
});

test("does not change attributes if attrs were not actually changed", function() {
  context.update();
  equals(elem.getAttribute("foo"), "initial", "attribute");
});

test("updates attribute if attrs changed", function() {
  context.setAttr('foo', 'changed');
  context.update();
  equals(elem.getAttribute("foo"), "changed", "attribute");
});

test("adds attribute if new", function() {
  context.setAttr('bar', 'baz');
  context.update();
  equals(elem.getAttribute("bar"), "baz", "attribute");
});

test("removes attribute if value is null", function() {
  context.setAttr('foo', null);
  context.update();
  equals(elem.getAttribute("foo"), null, "attribute");
});

// ..........................................................
// ID
//
module("SC.RenderContext#update - id", {
  setup: function() {
    elem = document.createElement('div');
    SC.$(elem).attr("id", "foo");
    context = SC.RenderContext(elem);
  },

  teardown: function() {
    elem = context = null ;
  }
});

test("does not change id if retrieved but not edited", function() {
  context.id();
  context.update();
  equals(elem.getAttribute("id"), "foo", "id");
});

test("replaces id if edited", function() {
  context.id('bar');
  context.update();
  equals(elem.getAttribute("id"), "bar", "id");
});

test("set id overrides attr", function() {
  context.setAttr("id", "bar");
  context.id('baz');
  context.update();
  equals(elem.getAttribute("id"), "baz", "should use id");
});

// ..........................................................
// Class Name Editing
//
module("SC.RenderContext#update - className", {
  setup: function() {
    elem = document.createElement('div');
    SC.$(elem).attr("class", "foo bar");
    context = SC.RenderContext(elem);
  },

  teardown: function() {
    elem = context = null ;
  }
});

test("does not change class names if retrieved but not edited", function() {
  context.classes();
  context.update();
  equals(SC.$(elem).attr("class"), "foo bar", "class");
});


// ..........................................................
// Style Editing
//
module("SC.RenderContext#update - style", {
  setup: function() {
    elem = document.createElement('div');
    SC.$(elem).attr("style", "color: red;");
    context = SC.RenderContext(elem);
  },

  teardown: function() {
    elem = context = null ;
  }
});

test("does not change styles if retrieved but not edited", function() {
  context.styles();
  context.update();
  var style = SC.$(elem).attr("style").trim();
  if (!style.match(/;$/)) style += ';' ;

  equals(style.toLowerCase(), "color: red;", "style");
});

test("replaces style name if styles edited", function() {
  context.setStyle({ color: "black" });
  context.update();

  // Browsers return single attribute styles differently, sometimes with a trailing ';'
  // sometimes, without one. Normalize it here.
  var style = SC.$(elem).attr("style").trim();
  if (!style.match(/;\s{0,1}$/)) style += ';' ;

  equals(style.toLowerCase(), "color: black;", "attribute");
});


test("set styles override style attr", function() {
  context.setAttr("style", "color: green");
  context.setStyle({ color: "black" });
  context.update();

  // Browsers return single attribute styles differently, sometimes with a trailing ';'
  // sometimes, without one. Normalize it here.
  var style = SC.$(elem).attr("style").trim();
  if (!style.match(/;$/)) style += ';' ;

  equals(style.toLowerCase(), "color: black;", "attribute");
});

test("set styles handle custom browser attributes", function() {
  context.resetStyles();
  context.setStyle({ columnCount: '3', mozColumnCount: '3', webkitColumnCount: '3', oColumnCount: '3', msColumnCount: '3' });
  context.update();

  // Browsers return single attribute styles differently, sometimes with a trailing ';'
  // sometimes, without one. Normalize it here.
  var style = SC.$(elem).attr("style").trim();
  if (!style.match(/;$/)) style += ';' ;

  // Older Gecko completely ignores css attributes that it doesn't understand.
  if(SC.browser.isMozilla) equals(style, "-moz-column-count: 3;");
  else if (SC.browser.isIE) equals(style, "-ms-column-count: 3;");
  else if (SC.browser.engine === SC.ENGINE.webkit) equals(style, "-webkit-column-count: 3;");
});
