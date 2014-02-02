// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same */

(function() {
var pane = SC.ControlTestPane.design()
  .add("basic", SC.CheckboxView, {
    value: NO, isEnabled: YES, title: "Hello World"
  })

  .add("selected", SC.CheckboxView, {
    value: YES, title: "Hello World"
  })

  .add("disabled", SC.CheckboxView, {
    isEnabled: NO, title: "Hello World"
  })

  .add("disabled - selected", SC.CheckboxView, {
    isEnabled: NO, value: YES, title: "Hello World"
  })

  .add("static layout 1", SC.CheckboxView, {
    useStaticLayout: YES,
    layout: { width: 'auto', right: 'auto' },
    title: 'Static Layout'
  })

  .add("static layout 2", SC.CheckboxView, {
    useStaticLayout: YES,
    layout: { width: 'auto', right: 'auto' },
    title: 'Different Length Title'
  })

  .add("role", SC.CheckboxView, {
    value: YES, title: "role-checkbox"
  })

  .add("aria-label", SC.CheckboxView, {
    value: NO, title: "aria-label"
  });

// ..........................................................
// TEST VIEWS
//
module('SC.CheckboxView ui', {
  setup: function(){
    htmlbody('<style> .sc-static-layout { border: 1px red dotted; } </style>');
    pane.standardSetup().setup();
  },
  teardown: function(){
    pane.standardSetup().teardown();
    clearHtmlbody();
  }
});

test("basic", function() {
  var view = pane.view('basic');
  ok(!view.$().hasClass('disabled'), 'should not have disabled class');
  ok(!view.$().hasClass('sel'), 'should not have sel class');

  var input = view.$();
  equals(input.attr('aria-checked'), 'false',  'input should not be checked');

  var label = view.$('span.label');
  equals(label.text(), 'Hello World', 'should have label');
});

test("selected", function() {
  var view = pane.view('selected');
  ok(!view.$().hasClass('disabled'), 'should not have disabled class');
  ok(view.$().hasClass('sel'), 'should have sel class');

  var input = view.$();
  equals(input.attr('aria-checked'), 'true','input should be checked');

  var label = view.$('span.label');
  equals(label.text(), 'Hello World', 'should have label');
});

test("disabled", function() {
  var view = pane.view('disabled');
  ok(view.$().hasClass('disabled'), 'should have disabled class');
  ok(!view.$().hasClass('sel'), 'should not have sel class');

  var input = view.$();
  equals(input.attr('aria-checked'), 'false','input should not be checked');

  var label = view.$('span.label');
  equals(label.text(), 'Hello World', 'should have label');
});

test("disabled - selected", function() {
  var view = pane.view('disabled - selected');
  ok(view.$().hasClass('disabled'), 'should have disabled class');
  ok(view.$().hasClass('sel'), 'should have sel class');

  var input = view.$();
  equals(input.attr('aria-checked'), 'true','input should be checked');

  var label = view.$('span.label');
  equals(label.text(), 'Hello World', 'should have label');
});

test("role", function() {
  var view = pane.view('role');
  equals(view.$().attr('role'),'checkbox', 'should have role as checkbox');
});

test("aria-labelledby", function() {
  var view = pane.view('aria-label');
  equals(document.getElementById(view.$().attr('aria-labelledby')), view.$('span.label')[0], "aria-labelledby points at the label");
});
})();
