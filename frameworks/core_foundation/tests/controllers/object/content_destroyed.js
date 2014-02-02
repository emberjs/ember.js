// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var content, newContent, controller, destroyCount;

// ..........................................................
// SINGLE OBSERVABLE OBJECT
//

SC.TestObject = SC.Object.extend();

SC.TestObject.reopen({
  destroy: function() {
    destroyCount = 1;
  }
});

module("SC.ObjectController - content destroyed", {
  setup: function() {
    content = SC.TestObject.create({
      foo: "foo1", bar: "bar1"
    });
    newContent = SC.Object.create({
      foo: "foo2"
    });
    destroyCount = 0;

    controller = SC.ObjectController.create({
      destroyContentOnReplace: YES,
      content: content
    });
  },

  teardown: function() {
    controller.destroy();
  }
});

test("Setting content should call 'destroy' on old content if destroyContentOnReplace has been set", function() {
  controller.set('content', newContent);
  equals(destroyCount, 1, 'destroyCount');
  equals(controller.getPath('content.foo'), 'foo2');
});

test("Setting content should NOT call 'destroy' on old content if destroyContentOnReplace has not been set", function() {
  controller.set('destroyContentOnReplace', NO);
  controller.set('content', newContent);
  equals(destroyCount, 0, 'destroyCount');
  equals(controller.getPath('content.foo'), 'foo2');
});

test("Setting content should NOT call 'destroy' if set to the same object", function() {
  controller.set('content', content);
  equals(destroyCount, 0, 'destroyCount');
});
