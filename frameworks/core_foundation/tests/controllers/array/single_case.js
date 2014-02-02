// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals should_throw */

var content, controller, extra;

var TestObject = SC.Object.extend({
  title: "test",
  toString: function() { return "TestObject(%@)".fmt(this.get("title")); }
});


// ..........................................................
// allowsSingleContent
//

module("SC.ArrayController - single_case - SINGLE", {
  setup: function() {
    content = TestObject.create({ title: "FOO" });
    controller = SC.ArrayController.create({
      content: content, allowsSingleContent: YES
    });
  },

  teardown: function() {
    controller.destroy();
  }
});

test("state properties", function() {
  equals(controller.get("hasContent"), YES, 'c.hasContent');
  equals(controller.get("canRemoveContent"), YES, "c.canRemoveContent");
  equals(controller.get("canReorderContent"), NO, "c.canReorderContent");
  equals(controller.get("canAddContent"), NO, "c.canAddContent");
});

// addObject should append to end of array + notify observers on Array itself
test("addObject", function() {
  should_throw(function() {
    controller.addObject(extra);
  }, Error, "controller.addObject should throw exception");
});

test("removeObject - no destroyOnRemoval", function() {
  var callCount = 0;
  controller.set('destroyOnRemoval', NO);
  controller.addObserver('[]', function() { callCount++; });

  controller.removeObject(content);

  equals(controller.get('content'), null, 'removeObject(content) should set content to null');
  equals(callCount, 1, 'should notify observer since content did not change');
  equals(controller.get('length'), 0, 'should now have length of 0');
  equals(content.isDestroyed, NO, 'content.isDestroyed should be destroyed');
});

test("removeObject - destroyOnRemoval", function() {
  controller.set('destroyOnRemoval', YES);
  SC.run(function() { controller.removeObject(content); });
  equals(content.isDestroyed, YES, 'content.isDestroyed should be destroyed');
});


test("basic array READ operations", function() {
  equals(controller.get("length"), 1, 'length should be 1');
  equals(controller.objectAt(0), content, "objectAt(0) should return content");
});

test("basic array WRITE operations", function() {
  should_throw(function() {
    controller.replace(0,1,[extra]);
  }, Error, "calling replace on an enumerable should throw");
});

test("arrangedObjects", function() {
  equals(controller.get("arrangedObjects"), controller, 'c.arrangedObjects should return receiver');
});


// ..........................................................
// allowsSingleContent=NO
//

module("SC.ArrayController - single_case - allowsSingleContent=NO", {
  setup: function() {
    content = TestObject.create({ title: "FOO" });
    controller = SC.ArrayController.create({
      content: content, allowsSingleContent: NO
    });
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

// addObject should append to end of array + notify observers on Array itself
test("addObject", function() {
  should_throw(function() {
    controller.addObject(extra);
  }, Error, "controller.addObject should throw exception");
});

test("removeObject", function() {
  should_throw(function() {
    controller.removeObject(extra);
  }, Error, "controller.removeObject should throw exception");
});

test("basic array READ operations", function() {
  equals(controller.get("length"), 0, 'length should be empty');
  equals(controller.objectAt(0), undefined, "objectAt() should return undefined");
});

test("basic array WRITE operations", function() {
  should_throw(function() {
    controller.replace(0,1,[extra]);
  }, Error, "calling replace on an enumerable should throw");
});

test("arrangedObjects", function() {
  equals(controller.get("arrangedObjects"), controller, 'c.arrangedObjects should return receiver');
});

