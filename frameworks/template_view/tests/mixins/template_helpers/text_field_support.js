// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
(function() {
  var TestObject, textFieldView, pane;

  module("Text Field Support", {
    setup: function() {
      TestObject = window.TestObject = SC.Object.create({
        value: null
      });

      textFieldView = SC.TemplateView.create(SC.TextFieldSupport, {
        template: SC.Handlebars.compile('<input type="text">')
      });

      pane = SC.MainPane.create({
        childViews: [textFieldView]
      });
      pane.append();
    },

    teardown: function() {
      pane.remove();
      TestObject = window.TestObject = textFieldView = pane = null;
    }
  });

  test("value property mirrors input value", function() {
    textFieldView.$('input').val('foo bar');

    equals(textFieldView.get('value'), 'foo bar', "gets value property from DOM");

    textFieldView.set('value', "afterlife");
    equals(textFieldView.$('input').val(), "afterlife", "sets value of DOM to value property");
  });

  // Not really sure how to test this without doing something like adding a selection then checking 
  // to see if it's still there after setting value
  test("only update DOM if value changed");

  test("value binding works properly for inputs that haven't been created", function() {
    var view = SC.TemplateView.create(SC.TextFieldSupport, {
      template: SC.Handlebars.compile('<input type="text">'),
      valueBinding: 'TestObject.value'
    });

    equals(view.get('value'), null, "precond - default value is null");
    equals(view.$('input').length, 0, "precond - view doesn't have its layer created yet, thus no input element");

    SC.run(function() { TestObject.set('value', 'ohai'); });

    equals(view.get('value'), 'ohai', "value property was properly updated");

    SC.run(function() { pane.appendChild(view); });

    equals(view.get('value'), 'ohai', "value property remains the same once the view has been appended");
    equals(view.$('input').val(), 'ohai', "value is reflected in the input element once it is created");
  });

  test("listens for focus and blur events", function() {
    var focusCalled = 0;
    var blurCalled = 0;

    textFieldView.focus = function() {
      focusCalled++;
    };
    textFieldView.blur = function() {
      blurCalled++;
    };

    equals(focusCalled+blurCalled, 0, "precond - no callbacks called yet");

    textFieldView.$('input').focus();
    equals(focusCalled, 1, "focus called after field receives focus");

    textFieldView.$('input').blur();
    equals(blurCalled, 1, "blur called after field blurs");
  });

  test("calls correct method for key events", function() {
    var insertNewlineCalled = 0;
    var cancelCalled = 0;

    textFieldView.insertNewline = function() {
      insertNewlineCalled++;
      return YES;
    };
    textFieldView.cancel = function() {
      cancelCalled++;
      return YES;
    };

    textFieldView.$('input').focus();
    equals(insertNewlineCalled+cancelCalled, 0, "precond - no callbacks called yet");

    SC.RootResponder.responder.keyup(new SC.Event({ type: 'keyup', keyCode: 13 }));
    equals(insertNewlineCalled, 1, "calls insertNewline after hitting return");

    SC.RootResponder.responder.keyup(new SC.Event({ type: 'keyup', keyCode: 27 }));
    equals(cancelCalled, 1, "calls cancel after pressing escape key");

  });

  module("SC.TextField", {
    setup: function() {
      TestObject = window.TestObject = SC.Object.create({
        value: null
      });

      textFieldView = SC.TextField.create();

      pane = SC.MainPane.create({
        childViews: [textFieldView]
      });
      pane.append();
    },

    teardown: function() {
      pane.remove();
      TestObject = window.TestObject = textFieldView = pane = null;
    }
  });

  test("value property mirrors input value", function() {
    textFieldView.$('input').val('foo bar');

    equals(textFieldView.get('value'), 'foo bar', "gets value property from DOM");

    textFieldView.set('value', "afterlife");
    equals(textFieldView.$('input').val(), "afterlife", "sets value of DOM to value property");
  });

  // Not really sure how to test this without doing something like adding a selection then checking 
  // to see if it's still there after setting value
  test("only update DOM if value changed");

  test("value binding works properly for inputs that haven't been created", function() {
    var view = SC.TextField.create({
      valueBinding: 'TestObject.value'
    });

    equals(view.get('value'), null, "precond - default value is null");
    equals(view.$('input').length, 0, "precond - view doesn't have its layer created yet, thus no input element");

    SC.run(function() { TestObject.set('value', 'ohai'); });

    equals(view.get('value'), 'ohai', "value property was properly updated");

    SC.run(function() { pane.appendChild(view); });

    equals(view.get('value'), 'ohai', "value property remains the same once the view has been appended");
    equals(view.$('input').val(), 'ohai', "value is reflected in the input element once it is created");
  });

  test("listens for focus and blur events", function() {
    var focusCalled = 0;
    var blurCalled = 0;

    textFieldView.focus = function() {
      focusCalled++;
    };
    textFieldView.blur = function() {
      blurCalled++;
    };

    equals(focusCalled+blurCalled, 0, "precond - no callbacks called yet");

    textFieldView.$('input').focus();
    equals(focusCalled, 1, "focus called after field receives focus");

    textFieldView.$('input').blur();
    equals(blurCalled, 1, "blur called after field blurs");
  });

  test("calls correct method for key events", function() {
    var insertNewlineCalled = 0;
    var cancelCalled = 0;

    textFieldView.insertNewline = function() {
      insertNewlineCalled++;
      return YES;
    };
    textFieldView.cancel = function() {
      cancelCalled++;
      return YES;
    };

    textFieldView.$('input').focus();
    equals(insertNewlineCalled+cancelCalled, 0, "precond - no callbacks called yet");

    SC.RootResponder.responder.keyup(new SC.Event({ type: 'keyup', keyCode: 13 }));
    equals(insertNewlineCalled, 1, "calls insertNewline after hitting return");

    SC.RootResponder.responder.keyup(new SC.Event({ type: 'keyup', keyCode: 27 }));
    equals(cancelCalled, 1, "calls cancel after pressing escape key");
  });

  test("creates textarea tag if isMultiline", function() {
    var view = SC.TextField.create({
      isMultiline: YES
    });
    SC.run(function() { pane.appendChild(view); });
    equals(view.$('textarea').length, 1, "view creates textarea tag instead of input");
  });

})();
