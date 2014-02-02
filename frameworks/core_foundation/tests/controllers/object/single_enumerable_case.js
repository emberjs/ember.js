// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var src, content, controller;

// ..........................................................
// SINGLE OBSERVABLE OBJECT IN SET
// 

module("SC.ObjectController - single_enumerable_case - OBSERVABLE OBJECT", {
  setup: function() {
    src        = SC.Object.create({ foo: "foo1", bar: "bar1" });
    content    = SC.Set.create().add(src); // use generic enumerable
    controller = SC.ObjectController.create({ 
      content: content,
      allowsMultipleContent: NO 
    });
  },
  
  teardown: function() {
    controller.destroy();
  }
});

test("getting any unknown value should pass through to object", function() {
  equals(controller.get("foo"), "foo1", 'controller.get(foo)');
  equals(controller.get("bar"), "bar1", 'controller.get(bar)');
});

test("setting any unknown value should pass through", function() {
  equals(controller.set("foo", "EDIT"), controller, 'controller.set(foo, EDIT) should return self');  
  equals(controller.set("bar", "EDIT"), controller, 'controller.set(bar, EDIT) should return self');
  equals(controller.set("baz", "EDIT"), controller, 'controller.set(baz, EDIT) should return self');
  
  equals(src.get("foo"), "EDIT", 'src.get(foo)');
  equals(src.get("bar"), "EDIT", 'src.get(bar)');
  equals(src.get("baz"), "EDIT", 'src.get(bar)');
});

test("changing a property on the content", function() {
  var callCount = 0;
  controller.addObserver("foo", function() { callCount++; });

  equals(controller.get("foo"), "foo1", "controller.get(foo) before edit should have original value");

  src.set("foo", "EDIT");
  equals(controller.get("foo"), "EDIT", "controller.get(foo) after edit should have updated value");
  equals(callCount, 1, 'observer on controller should have fired');
});

test("changing the content from one to another", function() {
  var callCount = 0 ;
  var src2 = SC.Object.create({ foo: "foo2", bar: "bar2" });
  var content2 = [src2]; // use another type of enumerable
  controller.addObserver("foo", function() { callCount++; });

  equals(controller.get("foo"), "foo1", "controller.get(foo) before edit should have original value");

  controller.set("content", content2);

  equals(controller.get("foo"), "foo2", "controller.get(foo) after content should contain new content");
  equals(callCount, 1, 'observer on controller should have fired');

  callCount = 0 ;
  src2.set("foo", "EDIT");
  equals(controller.get("foo"), "EDIT", "controller.get(foo) after edit should have updated value");
  equals(callCount, 1, 'observer on controller should have fired');
  
  callCount = 0;
  content.set("foo", "BAR");
  equals(controller.get("foo"), "EDIT", "controller.get(foo) after edit of non-content object should not change value");
  equals(callCount, 0, 'observer on controller should NOT have fired');
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

// ..........................................................
// SINGLE OBSERVABLE OBJECT WITH ALLOWS MULTIPLE YES
// 

module("SC.ObjectController - single_enumerable_case - ALLOWS MULTIPLE", {
  setup: function() {
    src        = SC.Object.create({ foo: "foo1", bar: "bar1" });
    content    = SC.Set.create().add(src); // use generic enumerable
    controller = SC.ObjectController.create({ 
      content: content,
      allowsMultipleContent: YES 
    });
  },
  
  teardown: function() {
    controller.destroy();
  }
});

test("getting any unknown value should pass through to object", function() {
  equals(controller.get("foo"), "foo1", 'controller.get(foo)');
  equals(controller.get("bar"), "bar1", 'controller.get(bar)');
});

test("setting any unknown value should pass through", function() {
  equals(controller.set("foo", "EDIT"), controller, 'controller.set(foo, EDIT) should return self');  
  equals(controller.set("bar", "EDIT"), controller, 'controller.set(bar, EDIT) should return self');
  equals(controller.set("baz", "EDIT"), controller, 'controller.set(baz, EDIT) should return self');
  
  equals(src.get("foo"), "EDIT", 'src.get(foo)');
  equals(src.get("bar"), "EDIT", 'src.get(bar)');
  equals(src.get("baz"), "EDIT", 'src.get(bar)');
});

test("changing a property on the content", function() {
  var callCount = 0;
  controller.addObserver("foo", function() { callCount++; });

  equals(controller.get("foo"), "foo1", "controller.get(foo) before edit should have original value");

  src.set("foo", "EDIT");
  equals(controller.get("foo"), "EDIT", "controller.get(foo) after edit should have updated value");
  equals(callCount, 1, 'observer on controller should have fired');
});

test("changing the content from one to another", function() {
  var callCount = 0 ;
  var src2 = SC.Object.create({ foo: "foo2", bar: "bar2" });
  var content2 = [src2]; // use another type of enumerable
  controller.addObserver("foo", function() { callCount++; });

  equals(controller.get("foo"), "foo1", "controller.get(foo) before edit should have original value");

  controller.set("content", content2);

  equals(controller.get("foo"), "foo2", "controller.get(foo) after content should contain new content");
  equals(callCount, 1, 'observer on controller should have fired');

  callCount = 0 ;
  src2.set("foo", "EDIT");
  equals(controller.get("foo"), "EDIT", "controller.get(foo) after edit should have updated value");
  equals(callCount, 1, 'observer on controller should have fired');
  
  callCount = 0;
  content.set("foo", "BAR");
  equals(controller.get("foo"), "EDIT", "controller.get(foo) after edit of non-content object should not change value");
  equals(callCount, 0, 'observer on controller should NOT have fired');
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

// ..........................................................
// SINGLE OBSERVABLE OBJECT IN COLLECTION, ADDED AFTER CONTROLLER CONTENT SET
// 

module("SC.ObjectController - single_enumerable_case after content set - ALLOWS MULTIPLE", {
  setup: function() {
    src        = SC.Object.create({ foo: "foo1", bar: "bar1" });
    content    = SC.Set.create(); // use generic enumerable
    controller = SC.ObjectController.create({ 
      content: content,
      allowsMultipleContent: YES 
    });
    content.add(src)
  },
  
  teardown: function() {
    controller.destroy();
  }
});

test("getting any unknown value should pass through to object", function() {
  equals(controller.get("foo"), "foo1", 'controller.get(foo)');
  equals(controller.get("bar"), "bar1", 'controller.get(bar)');
});

test("setting any unknown value should pass through", function() {
  equals(controller.set("foo", "EDIT"), controller, 'controller.set(foo, EDIT) should return self');  
  equals(controller.set("bar", "EDIT"), controller, 'controller.set(bar, EDIT) should return self');
  equals(controller.set("baz", "EDIT"), controller, 'controller.set(baz, EDIT) should return self');
  
  equals(src.get("foo"), "EDIT", 'src.get(foo)');
  equals(src.get("bar"), "EDIT", 'src.get(bar)');
  equals(src.get("baz"), "EDIT", 'src.get(bar)');
});

test("changing a property on the content", function() {
  var callCount = 0;
  controller.addObserver("foo", function() { callCount++; });

  equals(controller.get("foo"), "foo1", "controller.get(foo) before edit should have original value");

  src.set("foo", "EDIT");
  equals(controller.get("foo"), "EDIT", "controller.get(foo) after edit should have updated value");
  equals(callCount, 1, 'observer on controller should have fired');
});

test("changing the content from one to another", function() {
  var callCount = 0 ;
  var src2 = SC.Object.create({ foo: "foo2", bar: "bar2" });
  var content2 = [src2]; // use another type of enumerable
  controller.addObserver("foo", function() { callCount++; });

  equals(controller.get("foo"), "foo1", "controller.get(foo) before edit should have original value");

  controller.set("content", content2);

  equals(controller.get("foo"), "foo2", "controller.get(foo) after content should contain new content");
  equals(callCount, 1, 'observer on controller should have fired');

  callCount = 0 ;
  src2.set("foo", "EDIT");
  equals(controller.get("foo"), "EDIT", "controller.get(foo) after edit should have updated value");
  equals(callCount, 1, 'observer on controller should have fired');
  
  callCount = 0;
  content.set("foo", "BAR");
  equals(controller.get("foo"), "EDIT", "controller.get(foo) after edit of non-content object should not change value");
  equals(callCount, 0, 'observer on controller should NOT have fired');
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

