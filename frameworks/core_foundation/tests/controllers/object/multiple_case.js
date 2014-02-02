// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var src, src2, content, controller;

// ..........................................................
// NO MULTIPLE CONTENT
// 

module("SC.ObjectController - multiple_case - ALLOWSMULTIPLE = NO", {
  setup: function() {
    src        = SC.Object.create({ foo: "foo1", bar: "bar1" });
    src2       = SC.Object.create({ foo: "foo2", bar: "bar1" });
    content    = [src, src2];
    controller = SC.ObjectController.create({ 
      content: content,
      allowsMultipleContent: NO 
    });
  },
  
  teardown: function() {
    controller.destroy();
  }
});

test("hasContent", function() {
  equals(controller.get("hasContent"), NO, 'hasContent should be NO');
});

test("getting any value should return undefined", function() {
  equals(controller.get("foo"), undefined, 'controller.get(foo)');
  equals(controller.get("bar"), undefined, 'controller.get(bar)');
});

test("setting any unknown value should have no effect", function() {
  equals(controller.set("foo", "FOO"), controller, 'controller.set(foo, FOO) should return self');  
  equals(controller.set("bar", "BAR"), controller, 'controller.set(bar, BAR) should return self');
  equals(src.get("foo"), "foo1", 'src.get(foo)');
  equals(src.get("bar"), "bar1", 'src.get(bar)');
});

// ..........................................................
// MULTIPLE CONTENT
// 

module("SC.ObjectController - multiple_case - ALLOWSMULTIPLE = YES", {
  setup: function() {
    src        = SC.Object.create({ foo: "foo1", bar: "bar1" });
    src2       = SC.Object.create({ foo: "foo2", bar: "bar1" });
    content    = [src, src2];
    controller = SC.ObjectController.create({ 
      content: content,
      allowsMultipleContent: YES 
    });
  },
  
  teardown: function() {
    controller.destroy();
  }
});

test("getting any unknown value", function() {
  same(controller.get("foo"), ["foo1", "foo2"], 'controller.get(foo) should return array with all items');
  same(controller.get("bar"), "bar1", 'controller.get(bar) should return single property since all items match');
});

test("setting any unknown value should pass through", function() {
  equals(controller.set("foo", "EDIT"), controller, 'controller.set(foo, EDIT) should return self');  
  equals(controller.set("bar", "EDIT"), controller, 'controller.set(bar, EDIT) should return self');
  equals(controller.set("baz", "EDIT"), controller, 'controller.set(baz, EDIT) should return self');
  
  equals(src.get("foo"), "EDIT", 'src.get(foo)');
  equals(src.get("bar"), "EDIT", 'src.get(bar)');
  equals(src.get("baz"), "EDIT", 'src.get(bar)');

  equals(src2.get("foo"), "EDIT", 'src2.get(foo)');
  equals(src2.get("bar"), "EDIT", 'src2.get(bar)');
  equals(src2.get("baz"), "EDIT", 'src2.get(bar)');
});

test("changing a property on a content object", function() {
  var callCount = 0;
  controller.addObserver("bar", function() { callCount++; });

  equals(controller.get("bar"), "bar1", "controller.get(bar) before edit should have original value");

  src.set("bar", "EDIT");
  same(controller.get("bar"), ["EDIT", "bar1"], "controller.get(bar) after edit should have updated value");
  equals(callCount, 1, 'observer on controller should have fired');
});

test("hasContent", function() {
  equals(controller.get("hasContent"), YES, 'should have content');
  
  var callCount = 0;
  controller.addObserver("hasContent", function() { callCount++; });
  
  controller.set("content", null);
  equals(controller.get("hasContent"), NO, "hasContent should == NO after setting to null");
  ok(callCount > 0, 'hasContent observer should fire when setting to null');
  
  callCount = 0;
  controller.set("content", content);
  equals(controller.get("hasContent"), YES, "hasContent should == YES after setting back to content");
  ok(callCount > 0, "hasContent observer should fire");
});

