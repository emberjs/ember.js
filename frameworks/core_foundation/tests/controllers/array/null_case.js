// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals throws should_throw*/

var content, controller, extra;

var TestObject = SC.Object.extend({
  title: "test",  
  toString: function() { return "TestObject(%@)".fmt(this.get("title")); }
});


// ..........................................................
// NULL VALUE
// 

module("SC.ArrayController - null_case", {
  setup: function() {
    content = null;
    controller = SC.ArrayController.create({ content: content });
    extra = TestObject.create({ title: "FOO" });
  },
  
  teardown: function() {
    controller.destroy();
  }
});

test("state properties", function() {
  equals(controller.get("hasContent"), NO, 'c.hasContent');
  equals(controller.get("canRemoveContent"), NO, "c.canRemoveContent");
  equals(controller.get("canReorderContent"), NO, "c.canReorderContent");
  equals(controller.get("canAddContent"), NO, "c.canAddContent");
});

test("addObject", function() {
  should_throw(function() {
    controller.addObject(extra);
  }, Error, "controller.addObject should throw exception");
});

test("removeObject", function() {
  should_throw(function() {
    controller.removeObject(extra);
  }, Error, "controller.addObject should throw exception");
});

test("basic array operations", function() {
  equals(controller.get("length"), 0, 'length should be empty');
  equals(controller.objectAt(0), undefined, "objectAt() should return undefined");
  
  should_throw(function() {
    controller.replace(0,1,[extra]);
  }, Error, 'replace() should throw an error since it is not editable');
});

test("arrangedObjects", function() {
  equals(controller.get("arrangedObjects"), controller, 'c.arrangedObjects should return receiver');
});
