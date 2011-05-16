var textField, TestObject;

module("SC.TextField", {
  setup: function() {
    TestObject = window.TestObject = SC.Object.create({
      value: null
    });

    textField = SC.TextField.create();
  },

  teardown: function() {
    textField.destroy();
    TestObject = window.TestObject = textField = null;
  }
});

test("input value is updated when setting value property of view", function() {
  SC.run(function() {
    textField.set('value', 'foo');
    textField.append();
  });

  equals(textField.$('input').val(), "foo", "renders text field with value");

  SC.run(function() { textField.set('value', 'bar'); });

  equals(textField.$('input').val(), "bar", "updates text field after value changes");
});

test("input placeholder is updated when setting placeholder property of view", function() {
  SC.run(function() {
    textField.set('placeholder', 'foo');
    textField.append();
  });

  equals(textField.$('input').attr('placeholder'), "foo", "renders text field with placeholder");

  SC.run(function() { textField.set('placeholder', 'bar'); });

  equals(textField.$('input').attr('placeholder'), "bar", "updates text field after placeholder changes");
});

test("input type is configurable when creating view", function() {
  SC.run(function() {
    textField.set('type', 'password');
    textField.append();
  });

  equals(textField.$('input').attr('type'), 'password', "renders text field with type");
});

test("value binding works properly for inputs that haven't been created", function() {
  var view = SC.TextField.create({
    valueBinding: 'TestObject.value'
  });

  equals(view.get('value'), null, "precond - default value is null");
  equals(view.$('input').length, 0, "precond - view doesn't have its layer created yet, thus no input element");

  SC.run(function() { TestObject.set('value', 'ohai'); });

  equals(view.get('value'), 'ohai', "value property was properly updated");

  SC.run(function() { view.append(); });

  equals(view.get('value'), 'ohai', "value property remains the same once the view has been appended");
  equals(view.$('input').val(), 'ohai', "value is reflected in the input element once it is created");
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

//   textField.$('input').focus();
//   equals(focusCalled, 1, "focus called after field receives focus");

//   textField.$('input').blur();
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

//   textField.$('input').focus();
//   equals(insertNewlineCalled+cancelCalled, 0, "precond - no callbacks called yet");

//   SC.RootResponder.responder.keyup(new SC.Event({ type: 'keyup', keyCode: 13 }));
//   equals(insertNewlineCalled, 1, "calls insertNewline after hitting return");

//   SC.RootResponder.responder.keyup(new SC.Event({ type: 'keyup', keyCode: 27 }));
//   equals(cancelCalled, 1, "calls cancel after pressing escape key");
// });

