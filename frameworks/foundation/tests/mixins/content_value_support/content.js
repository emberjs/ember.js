// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module, test, equals, ok */

// ..........................................................
// contentPropertyDidChange()
//
var view, content;
module('SC.ContentValueSupport#contentPropertyDidChange', {
  setup: function () {
    content = SC.Object.create();
    view = SC.View.create(SC.ContentValueSupport);
  },

  teardown: function () {
    content = null;
    view.destroy();
  }
});

test("invoked with key = * whenever content changes", function () {
  view.contentPropertyDidChange = function (target, key) {
    ok(target === content, 'should pass content object as target target=%@'.fmt(target));
    equals(key, '*', 'should pass * as key');
  };
  view.set('content', content);
});

test("should not be invoked when arbitrary keys are changed", function () {
  var isTesting = NO, count = 0;
  view.contentPropertyDidChange = function (target, key) {
    if (!isTesting) return; //wait until testing should begin...
    count++;
  };

  view.set('content', content);

  isTesting = YES;

  content.set('foo', 'foo');
  content.set('bar', 'bar');

  equals(count, 0, "method was not invoked");
});

test("should no longer be invoked when a key is changed on a former content object", function () {
  var isTesting = NO;
  view.contentPropertyDidChange = function (target, key) {
    if (!isTesting) return; //wait until testing should begin...
    ok(NO, 'should not invoke contentPropertyDidChange after content is removed');
  };

  view.set('content', content);
  content.set('foo', 'foo');
  view.set('content', null);

  isTesting = YES;
  content.set('bar', 'bar');
});

test("should fire even on a content object set when the object is created", function () {
  var callCount = 0;
  var view = SC.View.create(SC.ContentValueSupport, {
    contentPropertyDidChange: function () { callCount++; },
    content: content
  });

  equals(callCount, 1, 'should call contentPropertyDidChange on init to do initial setup');

  content.set('foo', 'foo');
  equals(callCount, 1, 'should not call contentPropertyDidChange when changing content.foo');
});

test("should call updatePropertyFromContent for all properties when content changes", function () {
  var originalContent = SC.Object.create({
    contentFoo: 'foo1',
    contentBar: 'bar1'
  });

  var fooDidChangeCount = 0,
    barDidChangeCount = 0;

  var view = SC.View.create(SC.ContentValueSupport, {
    contentKeys: {
      'contentFooKey': 'foo',
      'contentBarKey': 'bar'
    },
    contentFooKey: 'contentFoo',
    contentBarKey: 'contentBar',

    foo: null,
    bar: null,

    fooDidChange: function () {
      fooDidChangeCount++;
    }.observes('foo'),

    barDidChange: function () {
      barDidChangeCount++;
    }.observes('bar'),

    content: null
  });

  equals(fooDidChangeCount, 0, "foo indicated as changed this many times");
  equals(barDidChangeCount, 0, "bar indicated as changed this many times");

  view.set('content', originalContent);

  equals(fooDidChangeCount, 1, "foo indicated as changed this many times");
  equals(barDidChangeCount, 1, "bar indicated as changed this many times");

  // set new content
  var newContent = SC.Object.create({
    contentFoo: 'foo2',
    contentBar: 'bar2'
  });

  view.set('content', newContent);

  equals(fooDidChangeCount, 2, "foo indicated as changed this many times");
  equals(barDidChangeCount, 2, "bar indicated as changed this many times");

  // Clean up.
  originalContent.destroy();
  newContent.destroy();
});

// ..........................................................
// updatePropertyFromContent()
//
module("SC.ContentValueSupport#updatePropertyFromContent()", {
  setup: function () {
    content = SC.Object.create({ foo: "foo", bar: "bar" });
    view = SC.View.create(SC.ContentValueSupport, { content: content });
  },
  teardown: function () {
    content = null;
    view.destroy();
  }
});

test("copies value of content[key] to this[prop] if changed key.  Gets key from contentKey property", function () {
  view.contentValueKey = 'foo'; // set key mapping.
  view.updatePropertyFromContent('value', 'foo', 'contentValueKey');
  equals(view.get('value'), 'foo', 'should copy foo from content.foo to value');
});

test("does nothing of changed key does not match contentKey value", function () {
  view.value = "foo";
  view.contentValueKey = "foo";
  view.updatePropertyFromContent('value', 'bar', 'contentValueKey');
  equals(view.get('value'), 'foo', 'should not have changed "value"');
});

test("if contentKey is not passed, assume contentPROPKey", function () {
  view.contentValueKey = "foo";
  view.updatePropertyFromContent("value", "foo");
  equals(view.get('value'), 'foo', 'should have looked at foo since contentValueKey is set to foo');
});

test("if contentFooKey is not set on receiver, ask displayDelegate", function () {
  view.displayDelegate = SC.Object.create({ contentValueKey: "foo" });
  view.updatePropertyFromContent("value", "foo", "contentValueKey");
  equals(view.get('value'), 'foo', 'should have looked at foo since contentValueKey is set to foo');
});

test("should be able to get value from a content object that is not SC.Object", function () {
  view.content = { foo: "foo" };
  view.contentValueKey = "foo";
  view.updatePropertyFromContent("value", "foo", "contentValueKey");
  equals(view.get('value'), 'foo', 'should have looked at foo since contentValueKey is set to foo');
});

// ..........................................................
// updateContentWithValueObserver()
//
module("SC.ContentValueSupport#updatePropertyFromContent()", {
  setup: function () {
    content = SC.Object.create({ foo: "foo", bar: "bar" });
    view = SC.View.create(SC.ContentValueSupport, {
      value: "bar",
      content: content,
      contentValueKey: "bar",
      displayDelegate: SC.Object.create({ contentValueKey: "foo" })
    });
  },
  teardown: function () {
    content = null;
    view.destroy();
  }
});

test("if contentValueKey is set, changing value will be pushed to content", function () {
  view.set('value', 'baz');
  equals(content.get('bar'), 'baz', 'should copy from view.value to content');
});

test("does nothing if content is null", function () {
  view.set('content', null);
  view.set('value', 'baz'); // should be no errors here...
  equals(content.get('bar'), 'bar', 'should not change');
  equals(content.get('foo'), 'foo', 'should not change');
});

test("if contentValueKey is undefined, asks display delegate instead", function () {
  delete view.contentValueKey;
  view.set('value', 'baz');
  equals(content.get('foo'), 'baz', 'should copy from view.value to content');
});

test("if contentValueKey is not set & displayDelegate not set, does nothing", function () {
  delete view.contentValueKey;
  delete view.displayDelegate;
  view.set('value', 'baz');
  equals(content.get('bar'), 'bar', 'should not change');
  equals(content.get('foo'), 'foo', 'should not change');
});

// ..........................................................
// updateContentWithValueObserver()
//
module("SC.ContentValueSupport#contentKeys", {
  setup: function () {
    this.count = 0;
    var self = this;

    this.obj = SC.Object.create(SC.ContentValueSupport, SC.DelegateSupport, {
      contentKeys: {'contentFooKey': 'foo'},
      contentFooKey: 'foo',
      content: SC.Object.create({foo: 'BAR'}),
      contentPropertyDidChange: function (orig, target, key) {
        equals(target, this.content, "content is target");
        self.count++;

        return orig(target, key);
      }.enhance()
    });
  },

  teardown: function () {
    this.obj.destroy();

    this.obj = null;
  }
});

test("different contentKeys on creation are observed correctly", function () {
  equals(this.count, 1, "Content property setup was called on init");

  this.obj.content.set('foo', 'BAR2');

  equals(this.count, 2, "observer was called again on set");

  equals(this.obj.get('foo'), 'BAR2', "value is updated correctly");

  this.obj.content.set('bar', 'ASDF');

  equals(this.count, 2, "observer was not called again on setting other keys");
});

test("different contentKeys after creation are observed correctly", function () {
  equals(this.count, 1,  "Content property setup was called on init");

  this.obj.beginPropertyChanges();
  this.obj.set({
    contentKeys: {'contentBarKey': 'bar'},
    contentBarKey: 'bar'
  });
  this.obj.endPropertyChanges();

  equals(this.count, 2, "observer was called again when changing contentKeys");

  this.obj.content.set('bar', 'BAR2');

  equals(this.count, 3, "observer was called when changing bar");

  equals(this.obj.get('bar'), 'BAR2', "value is updated correctly");

  this.obj.content.set('asdfasf', 'asdfasd');

  equals(this.count, 3, "observer was not called again on setting other keys");

  this.obj.content.set('foo', 'asdfasd');

  equals(this.count, 3, "observer was not called again on setting old observed keys");
});
