// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals TestObject:true */

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
    Ember.run(function() {
      textArea.destroy();
    });
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

  equal(textArea.$().val(), "foo", "renders text field with value");

  Ember.run(function() { set(textArea, 'value', 'bar'); });

  equal(textArea.$().val(), "bar", "updates text field after value changes");
});

test("input placeholder is updated when setting placeholder property of view", function() {
  Ember.run(function() {
    set(textArea, 'placeholder', 'foo');
    textArea.append();
  });

  equal(textArea.$().attr('placeholder'), "foo", "renders text area with placeholder");

  Ember.run(function() { set(textArea, 'placeholder', 'bar'); });

  equal(textArea.$().attr('placeholder'), "bar", "updates text area after placeholder changes");
});

test("input maxlength is updated when setting maxlength property of view", function() {
  Ember.run(function() {
    set(textArea, 'maxlength', '300');
    textArea.append();
  });

  equal(textArea.$().attr('maxlength'), "300", "renders text area with maxlength");

  Ember.run(function() { set(textArea, 'maxlength', '400'); });

  equal(textArea.$().attr('maxlength'), "400", "updates text area after maxlength changes");
});

test("input rows is updated when setting rows property of view", function() {
  Ember.run(function() {
    set(textArea, 'rows', '3');
    textArea.append();
  });

  equal(textArea.$().attr('rows'), "3", "renders text area with rows");

  Ember.run(function() { set(textArea, 'rows', '4'); });

  equal(textArea.$().attr('rows'), "4", "updates text area after rows changes");
});

test("input cols is updated when setting cols property of view", function() {
  Ember.run(function() {
    set(textArea, 'cols', '30');
    textArea.append();
  });

  equal(textArea.$().attr('cols'), "30", "renders text area with cols");

  Ember.run(function() { set(textArea, 'cols', '40'); });

  equal(textArea.$().attr('cols'), "40", "updates text area after cols changes");
});

test("value binding works properly for inputs that haven't been created", function() {

  Ember.run(function() {
    textArea = Ember.TextArea.create({
      valueBinding: 'TestObject.value'
    });
  });

  equal(get(textArea, 'value'), null, "precond - default value is null");
  equal(textArea.$().length, 0, "precond - view doesn't have its layer created yet, thus no input element");

  Ember.run(function() {
    set(TestObject, 'value', 'ohai');
  });

  equal(get(textArea, 'value'), 'ohai', "value property was properly updated");

  Ember.run(function() { textArea.append(); });

  equal(get(textArea, 'value'), 'ohai', "value property remains the same once the view has been appended");
  equal(textArea.$().val(), 'ohai', "value is reflected in the input element once it is created");
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

//   equal(focusCalled+blurCalled, 0, "precond - no callbacks called yet");

//   textArea.$().focus();
//   equal(focusCalled, 1, "focus called after field receives focus");

//   textArea.$().blur();
//   equal(blurCalled, 1, "blur alled after field blurs");
// });

// test("calls correct method for key events", function() {
//   var insertNewlineCalled = 0;
//   var cancelCalled = 0;

//   textArea.insertNewline = function() {
//     insertNewlineCalled++;
//     return true;
//   };
//   textArea.cancel = function() {
//     cancelCalled++;
//     return true;
//   };

//   textArea.$().focus();
//   equal(insertNewlineCalled+cancelCalled, 0, "precond - no callbacks called yet");

//   Ember.RootResponder.responder.keyup(new Ember.Event({ type: 'keyup', keyCode: 13 }));
//   equal(insertNewlineCalled, 1, "calls insertNewline after hitting return");

//   Ember.RootResponder.responder.keyup(new Ember.Event({ type: 'keyup', keyCode: 27 }));
//   equal(cancelCalled, 1, "calls cancel after pressing escape key");
// });

