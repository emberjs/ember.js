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

test("input tabindex is updated when setting tabindex property of view", function() {
  Ember.run(function() {
    set(textField, 'tabindex', '5');
    textField.append();
  });

  equal(textField.$().attr('tabindex'), "5", "renders text field with the tabindex");

  Ember.run(function() { set(textField, 'tabindex', '3'); });

  equal(textField.$().attr('tabindex'), "3", "updates text field after tabindex changes");
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
    textField = Ember.TextField.createWithMixins({
      valueBinding: 'TestObject.value'
    });
  });

  equal(get(textField, 'value'), null, "precond - default value is null");
  equal(textField.$(), undefined, "precond - view doesn't have its layer created yet, thus no input element");

  Ember.run(function() {
    set(TestObject, 'value', 'ohai');
  });

  equal(get(textField, 'value'), 'ohai', "value property was properly updated");

  Ember.run(function() { textField.append(); });

  equal(get(textField, 'value'), 'ohai', "value property remains the same once the view has been appended");
  equal(textField.$().val(), 'ohai', "value is reflected in the input element once it is created");
});

test("value binding sets value on the element", function() {
  Ember.run(function() {
    textField = Ember.TextField.createWithMixins({
      valueBinding: 'TestObject.value'
    });
    textField.append();
  });

  // Set the value via the DOM
  Ember.run(function() {
    textField.$().val('via dom');
    // Trigger lets the view know we changed this value (like a real user editing)
    textField.trigger('input', Ember.Object.create({
      type: 'input'
    }));
  });

  equal(get(textField, 'value'), 'via dom', "value property was properly updated via dom");
  equal(textField.$().val(), 'via dom', "dom property was properly updated via dom");

  // Now, set it via the binding
  Ember.run(function() {
    set(TestObject, 'value', 'via view');
  });

  equal(get(textField, 'value'), 'via view', "value property was properly updated via view");
  equal(textField.$().val(), 'via view', "dom property was properly updated via view");
});

test("should call the insertNewline method when return key is pressed", function() {
  var wasCalled;
  var event = Ember.Object.create({
    keyCode: 13
  });

  Ember.run(function() { textField.append(); });

  textField.insertNewline = function() {
    wasCalled = true;
  };

  textField.trigger('keyUp', event);
  ok(wasCalled, "invokes insertNewline method");
});

test("should call the cancel method when escape key is pressed", function() {
  var wasCalled;
  var event = Ember.Object.create({
    keyCode: 27
  });

  Ember.run(function() { textField.append(); });

  textField.cancel = function() {
    wasCalled = true;
  };

  textField.trigger('keyUp', event);
  ok(wasCalled, "invokes cancel method");
});

test("should send an action if one is defined when the return key is pressed", function() {
  expect(3);

  var StubController = Ember.Object.extend({
    send: function(actionName, value, sender) {
      equal(actionName, 'didTriggerAction', "text field sent correct action name");
      equal(value, "textFieldValue", "text field sent its current value as first argument");
      equal(sender, textField, "text field sent itself as second argument");
    }
  });

  textField.set('action', 'didTriggerAction');
  textField.set('value', "textFieldValue");
  textField.set('controller', StubController.create());

  Ember.run(function() { textField.append(); });

  var event = {
    keyCode: 13,
    stopPropagation: Ember.K
  };

  textField.trigger('keyUp', event);
});

test("bubbling of handled actions can be enabled via bubbles property", function() {
  textField.set('bubbles', true);
  textField.set('action', 'didTriggerAction');

  textField.set('controller', Ember.Object.create({
    send: Ember.K
  }));

  append();

  var stopPropagationCount = 0;
  var event = {
    keyCode: 13,
    stopPropagation: function() {
      stopPropagationCount++;
    }
  };

  textField.trigger('keyUp', event);
  equal(stopPropagationCount, 0, "propagation was not prevented if bubbles is true");

  textField.set('bubbles', false);
  textField.trigger('keyUp', event);
  equal(stopPropagationCount, 1, "propagation was prevented if bubbles is false");
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

