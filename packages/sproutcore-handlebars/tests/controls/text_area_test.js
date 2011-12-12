// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals TestObject */

var textArea;
var get = Ember.get, set = Ember.set;

module("Ember.TextArea", {
  setup: function() {
    TestObject = Ember.Object.create({
      value: null
    });

    textArea = Ember.TextArea.create();
  },

  teardown: function() {
    textArea.destroy();
    TestObject = textArea = null;
  }
});

function append() {
  Ember.run(function() {
    textArea.appendTo('#qunit-fixture');
  });
}

test("should become disabled if the disabled attribute is true", function() {
  textArea.set('disabled', true);
  append();

  ok(textArea.$().is(":disabled"));
});

test("should become disabled if the disabled attribute is true", function() {
  append();
  ok(textArea.$().is(":not(:disabled)"));

  Ember.run(function() { textArea.set('disabled', true); });
  ok(textArea.$().is(":disabled"));

  Ember.run(function() { textArea.set('disabled', false); });
  ok(textArea.$().is(":not(:disabled)"));
});

test("input value is updated when setting value property of view", function() {
  Ember.run(function() {
    set(textArea, 'value', 'foo');
    textArea.append();
  });

  equals(textArea.$().val(), "foo", "renders text field with value");

  Ember.run(function() { set(textArea, 'value', 'bar'); });

  equals(textArea.$().val(), "bar", "updates text field after value changes");
});

test("input placeholder is updated when setting placeholder property of view", function() {
  Ember.run(function() {
    set(textArea, 'placeholder', 'foo');
    textArea.append();
  });

  equals(textArea.$().attr('placeholder'), "foo", "renders text field with placeholder");

  Ember.run(function() { set(textArea, 'placeholder', 'bar'); });

  equals(textArea.$().attr('placeholder'), "bar", "updates text field after placeholder changes");
});

test("value binding works properly for inputs that haven't been created", function() {

  Ember.run(function() {
    textArea = Ember.TextArea.create({
      valueBinding: 'TestObject.value'
    });
  });

  equals(get(textArea, 'value'), null, "precond - default value is null");
  equals(textArea.$().length, 0, "precond - view doesn't have its layer created yet, thus no input element");

  Ember.run(function() {
    set(TestObject, 'value', 'ohai');
  });

  equals(get(textArea, 'value'), 'ohai', "value property was properly updated");

  Ember.run(function() { textArea.append(); });

  equals(get(textArea, 'value'), 'ohai', "value property remains the same once the view has been appended");
  equals(textArea.$().val(), 'ohai', "value is reflected in the input element once it is created");
});

test("should call the insertNewline method when return key is pressed", function() {
  var wasCalled;
  var event = Ember.Object.create({
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
  var event = Ember.Object.create({
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

//   Ember.RootResponder.responder.keyup(new Ember.Event({ type: 'keyup', keyCode: 13 }));
//   equals(insertNewlineCalled, 1, "calls insertNewline after hitting return");

//   Ember.RootResponder.responder.keyup(new Ember.Event({ type: 'keyup', keyCode: 27 }));
//   equals(cancelCalled, 1, "calls cancel after pressing escape key");
// });

