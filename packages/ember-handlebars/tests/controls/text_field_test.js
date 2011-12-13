// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals TestObject */

var textField;
var get = Ember.get, set = Ember.set;

module("Ember.TextField", {
  setup: function() {
    TestObject = Ember.Object.create({
      value: null
    });

    textField = Ember.TextField.create();
  },

  teardown: function() {
    textField.destroy();
    TestObject = textField = null;
  }
});

function append() {
  Ember.run(function() {
    textField.appendTo('#qunit-fixture');
  });
}

test("should become disabled if the disabled attribute is true", function() {
  textField.set('disabled', true);
  append();

  ok(textField.$().is(":disabled"));
});

test("should become disabled if the disabled attribute is true", function() {
  append();
  ok(textField.$().is(":not(:disabled)"));

  Ember.run(function() { textField.set('disabled', true); });
  ok(textField.$().is(":disabled"));

  Ember.run(function() { textField.set('disabled', false); });
  ok(textField.$().is(":not(:disabled)"));
});

test("input value is updated when setting value property of view", function() {
  Ember.run(function() {
    set(textField, 'value', 'foo');
    textField.append();
  });

  equals(textField.$().val(), "foo", "renders text field with value");

  Ember.run(function() { set(textField, 'value', 'bar'); });

  equals(textField.$().val(), "bar", "updates text field after value changes");
});

test("input placeholder is updated when setting placeholder property of view", function() {
  Ember.run(function() {
    set(textField, 'placeholder', 'foo');
    textField.append();
  });

  equals(textField.$().attr('placeholder'), "foo", "renders text field with placeholder");

  Ember.run(function() { set(textField, 'placeholder', 'bar'); });

  equals(textField.$().attr('placeholder'), "bar", "updates text field after placeholder changes");
});

test("input type is configurable when creating view", function() {
  Ember.run(function() {
    set(textField, 'type', 'password');
    textField.append();
  });

  equals(textField.$().attr('type'), 'password', "renders text field with type");
});

test("value binding works properly for inputs that haven't been created", function() {

  Ember.run(function() {
    textField = Ember.TextField.create({
      valueBinding: 'TestObject.value'
    });
  });

  equals(get(textField, 'value'), null, "precond - default value is null");
  equals(textField.$().length, 0, "precond - view doesn't have its layer created yet, thus no input element");

  Ember.run(function() {
    set(TestObject, 'value', 'ohai');
  });

  equals(get(textField, 'value'), 'ohai', "value property was properly updated");

  Ember.run(function() { textField.append(); });

  equals(get(textField, 'value'), 'ohai', "value property remains the same once the view has been appended");
  equals(textField.$().val(), 'ohai', "value is reflected in the input element once it is created");
});

test("should call the insertNewline method when return key is pressed", function() {
  var wasCalled;
  var event = Ember.Object.create({
    keyCode: 13
  });

  textField.insertNewline = function() {
    wasCalled = true;
  };

  textField.keyUp(event);
  ok(wasCalled, "invokes insertNewline method");
});

test("should call the cancel method when escape key is pressed", function() {
  var wasCalled;
  var event = Ember.Object.create({
    keyCode: 27
  });

  textField.cancel = function() {
    wasCalled = true;
  };

  textField.keyUp(event);
  ok(wasCalled, "invokes cancel method");
});

// test("listens for focus and blur events", function() {
//   var focusCalled = 0;
//   var blurCalled = 0;

//   textField.focus = function() {
//     focusCalled++;
//   };
//   textField.blur = function() {
//     blurCalled++;
//   };

//   equals(focusCalled+blurCalled, 0, "precond - no callbacks called yet");

//   textField.$().focus();
//   equals(focusCalled, 1, "focus called after field receives focus");

//   textField.$().blur();
//   equals(blurCalled, 1, "blur alled after field blurs");
// });

// test("calls correct method for key events", function() {
//   var insertNewlineCalled = 0;
//   var cancelCalled = 0;

//   textField.insertNewline = function() {
//     insertNewlineCalled++;
//     return YES;
//   };
//   textField.cancel = function() {
//     cancelCalled++;
//     return YES;
//   };

//   textField.$().focus();
//   equals(insertNewlineCalled+cancelCalled, 0, "precond - no callbacks called yet");

//   Ember.RootResponder.responder.keyup(new Ember.Event({ type: 'keyup', keyCode: 13 }));
//   equals(insertNewlineCalled, 1, "calls insertNewline after hitting return");

//   Ember.RootResponder.responder.keyup(new Ember.Event({ type: 'keyup', keyCode: 27 }));
//   equals(cancelCalled, 1, "calls cancel after pressing escape key");
// });

