// ==========================================================================
// Project: SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License: Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same */

// ..........................................................
// performKeyEquivalent() - verify that return value is correct.
//
var pane = SC.ControlTestPane.design()
  .add("basic", SC.ButtonView, {
    triggerAction: function() { return YES; },
    title:'hello world',
    keyEquivalent: 'return'
  });



module('SC.ButtonView#performKeyEquivalent', pane.standardSetup());

test("handles matching key equivalent 'return'", function() {
  var view = pane.view('basic');
  view.triggerAction = function(evt) { return YES; }; // act like we handled it if we get here
  var u = view.pane();
  ok(u.performKeyEquivalent('return'), "should return truthy value indicating it handled the key equivalent 'return'");
});

test("ignores non-matching key equivalent 'wrong_key'", function() {
  var view = pane.view('basic');
  view.triggerAction = function(evt) { return YES; }; // act like we handled it if we get here (we shouldn't in this case)
  ok(!view.performKeyEquivalent('wrong_key'), "should return falsy value indicating it ignored the non-matching key equivalent 'wrong_key'");
});

test("triggers on return if isDefault is set and no keyEquivalent is set", function() {
  var view = pane.view('basic');
  view.set('isDefault', YES);
  view.set('keyEquivalent', null);
  ok(view.performKeyEquivalent('return'), 'should be handled');

  view.set('keyEquivalent', 'a');
  ok(!view.performKeyEquivalent('return'), 'should NOT be handled');
});


test("triggers on escape if isCancel is set and no keyEquivalent is set", function() {
  var view = pane.view('basic');
  view.set('isCancel', YES);
  view.set('keyEquivalent', null);
  ok(view.performKeyEquivalent('escape'), 'should be handled');

  view.set('keyEquivalent', 'a');
  ok(!view.performKeyEquivalent('escape'), 'should NOT be handled');
});
