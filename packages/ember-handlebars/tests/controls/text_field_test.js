// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals TestObject:true */

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
    Ember.run(function() {
      textField.destroy();
    });
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

  equal(textField.$().val(), "foo", "renders text field with value");

  Ember.run(function() { set(textField, 'value', 'bar'); });

  equal(textField.$().val(), "bar", "updates text field after value changes");
});

test("input placeholder is updated when setting placeholder property of view", function() {
  Ember.run(function() {
    set(textField, 'placeholder', 'foo');
    textField.append();
  });

  equal(textField.$().attr('placeholder'), "foo", "renders text field with placeholder");

  Ember.run(function() { set(textField, 'placeholder', 'bar'); });

  equal(textField.$().attr('placeholder'), "bar", "updates text field after placeholder changes");
});

test("input maxlength is updated when setting maxlength property of view", function() {
  Ember.run(function() {
    set(textField, 'maxlength', '30');
    textField.append();
  });

  equal(textField.$().attr('maxlength'), "30", "renders text field with maxlength");

  Ember.run(function() { set(textField, 'maxlength', '40'); });

  equal(textField.$().attr('maxlength'), "40", "updates text field after maxlength changes");
});

test("input size is updated when setting size property of view", function() {
  Ember.run(function() {
    set(textField, 'size', '30');
    textField.append();
  });

  equal(textField.$().attr('size'), "30", "renders text field with size");

  Ember.run(function() { set(textField, 'size', '40'); });

  equal(textField.$().attr('size'), "40", "updates text field after size changes");
});

test("input type is configurable when creating view", function() {
  Ember.run(function() {
    set(textField, 'type', 'password');
    textField.append();
  });

  equal(textField.$().attr('type'), 'password', "renders text field with type");
});

test("value binding works properly for inputs that haven't been created", function() {

  Ember.run(function() {
    textField = Ember.TextField.create({
      valueBinding: 'TestObject.value'
    });
  });

  equal(get(textField, 'value'), null, "precond - default value is null");
  equal(textField.$().length, 0, "precond - view doesn't have its layer created yet, thus no input element");

  Ember.run(function() {
    set(TestObject, 'value', 'ohai');
  });

  equal(get(textField, 'value'), 'ohai', "value property was properly updated");

  Ember.run(function() { textField.append(); });

  equal(get(textField, 'value'), 'ohai', "value property remains the same once the view has been appended");
  equal(textField.$().val(), 'ohai', "value is reflected in the input element once it is created");
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

//   equal(focusCalled+blurCalled, 0, "precond - no callbacks called yet");

//   textField.$().focus();
//   equal(focusCalled, 1, "focus called after field receives focus");

//   textField.$().blur();
//   equal(blurCalled, 1, "blur alled after field blurs");
// });

// test("calls correct method for key events", function() {
//   var insertNewlineCalled = 0;
//   var cancelCalled = 0;

//   textField.insertNewline = function() {
//     insertNewlineCalled++;
//     return true;
//   };
//   textField.cancel = function() {
//     cancelCalled++;
//     return true;
//   };

//   textField.$().focus();
//   equal(insertNewlineCalled+cancelCalled, 0, "precond - no callbacks called yet");

//   Ember.RootResponder.responder.keyup(new Ember.Event({ type: 'keyup', keyCode: 13 }));
//   equal(insertNewlineCalled, 1, "calls insertNewline after hitting return");

//   Ember.RootResponder.responder.keyup(new Ember.Event({ type: 'keyup', keyCode: 27 }));
//   equal(cancelCalled, 1, "calls cancel after pressing escape key");
// });

