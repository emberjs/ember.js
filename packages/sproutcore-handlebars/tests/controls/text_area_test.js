// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals TestObject */

var textArea;
var get = SC.get, set = SC.set;

module("SC.TextArea", {
  setup: function() {
    TestObject = SC.Object.create({
      value: null
    });

    textArea = SC.TextArea.create();
  },

  teardown: function() {
    textArea.destroy();
    TestObject = textArea = null;
  }
});

test("input value is updated when setting value property of view", function() {
  SC.run(function() {
    set(textArea, 'value', 'foo');
    textArea.append();
  });

  equals(textArea.$().val(), "foo", "renders text field with value");

  SC.run(function() { set(textArea, 'value', 'bar'); });

  equals(textArea.$().val(), "bar", "updates text field after value changes");
});

test("input placeholder is updated when setting placeholder property of view", function() {
  SC.run(function() {
    set(textArea, 'placeholder', 'foo');
    textArea.append();
  });

  equals(textArea.$().attr('placeholder'), "foo", "renders text field with placeholder");

  SC.run(function() { set(textArea, 'placeholder', 'bar'); });

  equals(textArea.$().attr('placeholder'), "bar", "updates text field after placeholder changes");
});

test("value binding works properly for inputs that haven't been created", function() {

  SC.run(function() {
    textArea = SC.TextArea.create({
      valueBinding: 'TestObject.value'
    });
  });

  equals(get(textArea, 'value'), null, "precond - default value is null");
  equals(textArea.$().length, 0, "precond - view doesn't have its layer created yet, thus no input element");

  SC.run(function() {
    set(TestObject, 'value', 'ohai');
  });

  equals(get(textArea, 'value'), 'ohai', "value property was properly updated");

  SC.run(function() { textArea.append(); });

  equals(get(textArea, 'value'), 'ohai', "value property remains the same once the view has been appended");
  equals(textArea.$().val(), 'ohai', "value is reflected in the input element once it is created");
});

test("should call the insertNewline method when return key is pressed", function() {
  var wasCalled;
  var event = SC.Object.create({
    keyCode: 13
  });

  textArea.insertNewline = function() {
    wasCalled = true;
  };

  textArea.keyUp(event);
  ok(wasCalled, "invokes insertNewline method");
});

test("should call the cancel method when escape key is pressed", function() {
  var wasCalled;
  var event = SC.Object.create({
    keyCode: 27
  });

  textArea.cancel = function() {
    wasCalled = true;
  };

  textArea.keyUp(event);
  ok(wasCalled, "invokes cancel method");
});

// test("listens for focus and blur events", function() {
//   var focusCalled = 0;
//   var blurCalled = 0;

//   textArea.focus = function() {
//     focusCalled++;
//   };
//   textArea.blur = function() {
//     blurCalled++;
//   };

//   equals(focusCalled+blurCalled, 0, "precond - no callbacks called yet");

//   textArea.$().focus();
//   equals(focusCalled, 1, "focus called after field receives focus");

//   textArea.$().blur();
//   equals(blurCalled, 1, "blur alled after field blurs");
// });

// test("calls correct method for key events", function() {
//   var insertNewlineCalled = 0;
//   var cancelCalled = 0;

//   textArea.insertNewline = function() {
//     insertNewlineCalled++;
//     return YES;
//   };
//   textArea.cancel = function() {
//     cancelCalled++;
//     return YES;
//   };

//   textArea.$().focus();
//   equals(insertNewlineCalled+cancelCalled, 0, "precond - no callbacks called yet");

//   SC.RootResponder.responder.keyup(new SC.Event({ type: 'keyup', keyCode: 13 }));
//   equals(insertNewlineCalled, 1, "calls insertNewline after hitting return");

//   SC.RootResponder.responder.keyup(new SC.Event({ type: 'keyup', keyCode: 27 }));
//   equals(cancelCalled, 1, "calls cancel after pressing escape key");
// });

