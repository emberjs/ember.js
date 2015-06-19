import run from 'ember-metal/run_loop';
import { get } from 'ember-metal/property_get';
import { set as o_set } from 'ember-metal/property_set';
import EmberObject from 'ember-runtime/system/object';
import TextField from 'ember-views/views/text_field';
import EventDispatcher from 'ember-views/system/event_dispatcher';
import jQuery from 'ember-views/system/jquery';

function K() { return this; }

var textField;
var TestObject;

var view;

var appendView = function(view) {
  run(view, 'appendTo', '#qunit-fixture');
};

var caretPosition = function(element) {
  var ctrl = element[0];
  var caretPos = 0;

  // IE Support
  if (document.selection) {
    ctrl.focus();
    var selection = document.selection.createRange();

    selection.moveStart('character', -ctrl.value.length);

    caretPos = selection.text.length;
  } else if (ctrl.selectionStart || ctrl.selectionStart === '0') {
    // Firefox support
    caretPos = ctrl.selectionStart;
  }

  return caretPos;
};

var setCaretPosition = function(element, pos) {
  var ctrl = element[0];

  if (ctrl.setSelectionRange) {
    ctrl.focus();
    ctrl.setSelectionRange(pos, pos);
  } else if (ctrl.createTextRange) {
    var range = ctrl.createTextRange();
    range.collapse(true);
    range.moveEnd('character', pos);
    range.moveStart('character', pos);
    range.select();
  }
};

function set(object, key, value) {
  run(function() { o_set(object, key, value); });
}

function append() {
  run(function() {
    textField.appendTo('#qunit-fixture');
  });
}

QUnit.module('Ember.TextField', {
  setup() {
    TestObject = window.TestObject = EmberObject.create({
      value: null
    });

    textField = TextField.create();
  },

  teardown() {
    run(function() {
      textField.destroy();
    });
    TestObject = window.TestObject = textField = null;
  }
});

QUnit.test('should become disabled if the disabled attribute is true before append', function() {
  textField.set('disabled', true);
  append();

  ok(textField.$().is(':disabled'));
});

QUnit.test('should become disabled if the disabled attribute is true', function() {
  append();
  ok(textField.$().is(':not(:disabled)'));

  run(function() { textField.set('disabled', true); });
  ok(textField.$().is(':disabled'));

  run(function() { textField.set('disabled', false); });
  ok(textField.$().is(':not(:disabled)'));
});

QUnit.test('input value is updated when setting value property of view', function() {
  run(function() {
    set(textField, 'value', 'foo');
    textField.append();
  });

  equal(textField.$().val(), 'foo', 'renders text field with value');

  run(function() { set(textField, 'value', 'bar'); });

  equal(textField.$().val(), 'bar', 'updates text field after value changes');
});

QUnit.test('input placeholder is updated when setting placeholder property of view', function() {
  run(function() {
    set(textField, 'placeholder', 'foo');
    textField.append();
  });

  equal(textField.$().attr('placeholder'), 'foo', 'renders text field with placeholder');

  run(function() { set(textField, 'placeholder', 'bar'); });

  equal(textField.$().attr('placeholder'), 'bar', 'updates text field after placeholder changes');
});

QUnit.test('input name is updated when setting name property of view', function() {
  run(function() {
    set(textField, 'name', 'foo');
    textField.append();
  });

  equal(textField.$().attr('name'), 'foo', 'renders text field with name');

  run(function() { set(textField, 'name', 'bar'); });

  equal(textField.$().attr('name'), 'bar', 'updates text field after name changes');
});

QUnit.test('input maxlength is updated when setting maxlength property of view', function() {
  run(function() {
    set(textField, 'maxlength', '30');
    textField.append();
  });

  equal(textField.$().attr('maxlength'), '30', 'renders text field with maxlength');

  run(function() { set(textField, 'maxlength', '40'); });

  equal(textField.$().attr('maxlength'), '40', 'updates text field after maxlength changes');
});

QUnit.test('input size is updated when setting size property of view', function() {
  run(function() {
    set(textField, 'size', '30');
    textField.append();
  });

  equal(textField.$().attr('size'), '30', 'renders text field with size');

  run(function() { set(textField, 'size', '40'); });

  equal(textField.$().attr('size'), '40', 'updates text field after size changes');
});

QUnit.test('input tabindex is updated when setting tabindex property of view', function() {
  run(function() {
    set(textField, 'tabindex', '5');
    textField.append();
  });

  equal(textField.$().attr('tabindex'), '5', 'renders text field with the tabindex');

  run(function() { set(textField, 'tabindex', '3'); });

  equal(textField.$().attr('tabindex'), '3', 'updates text field after tabindex changes');
});

QUnit.test('input title is updated when setting title property of view', function() {
  run(function() {
    set(textField, 'title', 'FooTitle');
    textField.append();
  });

  equal(textField.$().attr('title'), 'FooTitle', 'renders text field with the title');

  run(function() { set(textField, 'title', 'BarTitle'); });

  equal(textField.$().attr('title'), 'BarTitle', 'updates text field after title changes');
});

QUnit.test('input type is configurable when creating view', function() {
  run(function() {
    set(textField, 'type', 'password');
    textField.append();
  });

  equal(textField.$().attr('type'), 'password', 'renders text field with type');
});

QUnit.test('value binding works properly for inputs that haven\'t been created', function() {

  run(function() {
    textField.destroy(); // destroy existing textField
    textField = TextField.create({
      valueBinding: 'TestObject.value'
    });
  });

  equal(get(textField, 'value'), null, 'precond - default value is null');
  equal(textField.$(), undefined, 'precond - view doesn\'t have its layer created yet, thus no input element');

  run(function() {
    set(TestObject, 'value', 'ohai');
  });

  equal(get(textField, 'value'), 'ohai', 'value property was properly updated');

  run(function() { textField.append(); });

  equal(get(textField, 'value'), 'ohai', 'value property remains the same once the view has been appended');
  equal(textField.$().val(), 'ohai', 'value is reflected in the input element once it is created');
});

QUnit.test('value binding sets value on the element', function() {
  run(function() {
    textField.destroy(); // destroy existing textField
    textField = TextField.create({
      valueBinding: 'TestObject.value'
    });
    textField.append();
  });

  // Set the value via the DOM
  run(function() {
    textField.$().val('via dom');
    // Trigger lets the view know we changed this value (like a real user editing)
    textField.trigger('input', EmberObject.create({
      type: 'input'
    }));
  });

  equal(get(textField, 'value'), 'via dom', 'value property was properly updated via dom');
  equal(textField.$().val(), 'via dom', 'dom property was properly updated via dom');

  // Now, set it via the binding
  run(function() {
    set(TestObject, 'value', 'via view');
  });

  equal(get(textField, 'value'), 'via view', 'value property was properly updated via view');
  equal(textField.$().val(), 'via view', 'dom property was properly updated via view');
});

QUnit.test('should call the insertNewline method when return key is pressed', function() {
  var wasCalled;
  var event = EmberObject.create({
    keyCode: 13
  });

  run(function() { textField.append(); });

  textField.insertNewline = function() {
    wasCalled = true;
  };

  textField.trigger('keyUp', event);
  ok(wasCalled, 'invokes insertNewline method');
});

QUnit.test('should call the cancel method when escape key is pressed', function() {
  var wasCalled;
  var event = EmberObject.create({
    keyCode: 27
  });

  run(function() { textField.append(); });

  textField.cancel = function() {
    wasCalled = true;
  };

  textField.trigger('keyUp', event);
  ok(wasCalled, 'invokes cancel method');
});

QUnit.test('should send an action if one is defined when the return key is pressed', function() {
  expect(2);

  var StubController = EmberObject.extend({
    send(actionName, value, sender) {
      equal(actionName, 'didTriggerAction', 'text field sent correct action name');
      equal(value, 'textFieldValue', 'text field sent its current value as first argument');
    }
  });

  textField.set('action', 'didTriggerAction');
  textField.set('value', 'textFieldValue');
  textField.set('targetObject', StubController.create());

  run(function() { textField.append(); });

  var event = {
    keyCode: 13,
    stopPropagation: K
  };

  textField.trigger('keyUp', event);
});

QUnit.test('should send an action on keyPress if one is defined with onEvent=keyPress', function() {
  expect(2);

  var StubController = EmberObject.extend({
    send(actionName, value, sender) {
      equal(actionName, 'didTriggerAction', 'text field sent correct action name');
      equal(value, 'textFieldValue', 'text field sent its current value as first argument');
    }
  });

  textField.set('action', 'didTriggerAction');
  textField.set('onEvent', 'keyPress');
  textField.set('value', 'textFieldValue');
  textField.set('targetObject', StubController.create());

  run(function() { textField.append(); });

  var event = {
    keyCode: 48,
    stopPropagation: K
  };

  textField.trigger('keyPress', event);
});


QUnit.test('bubbling of handled actions can be enabled via bubbles property', function() {
  textField.set('bubbles', true);
  textField.set('action', 'didTriggerAction');

  textField.set('controller', EmberObject.create({
    send: K
  }));

  append();

  var stopPropagationCount = 0;
  var event = {
    keyCode: 13,
    stopPropagation() {
      stopPropagationCount++;
    }
  };

  textField.trigger('keyUp', event);
  equal(stopPropagationCount, 0, 'propagation was not prevented if bubbles is true');

  textField.set('bubbles', false);
  textField.trigger('keyUp', event);
  equal(stopPropagationCount, 1, 'propagation was prevented if bubbles is false');
});


var dispatcher, StubController;
QUnit.module('Ember.TextField - Action events', {
  setup() {

    dispatcher = EventDispatcher.create();
    dispatcher.setup();

    StubController = EmberObject.extend({
      send(actionName, value, sender) {
        equal(actionName, 'doSomething', 'text field sent correct action name');
      }
    });

  },

  teardown() {
    run(function() {
      dispatcher.destroy();

      if (textField) {
        textField.destroy();
      }

      if (view) {
        view.destroy();
      }
    });
  }
});

QUnit.test('when the text field is blurred, the `focus-out` action is sent to the controller', function() {
  expect(1);

  textField = TextField.create({
    'focus-out': 'doSomething',
    targetObject: StubController.create({})
  });

  append();

  run(function() {
    textField.$().blur();
  });

});

QUnit.test('when the text field is focused, the `focus-in` action is sent to the controller', function() {
  expect(1);

  textField = TextField.create({
    'focus-in': 'doSomething',
    targetObject: StubController.create({})
  });

  append();

  run(function() {
    textField.$().focusin();
  });


});

QUnit.test('when the user presses a key, the `key-press` action is sent to the controller', function() {
  expect(1);

  textField = TextField.create({
    'key-press': 'doSomething',
    targetObject: StubController.create({})
  });

  append();

  run(function() {
    var event = jQuery.Event('keypress');
    event.keyCode = event.which = 13;
    textField.$().trigger(event);
  });

});

QUnit.test('when the user inserts a new line, the `insert-newline` action is sent to the controller', function() {
  expect(1);

  textField = TextField.create({
    'insert-newline': 'doSomething',
    targetObject: StubController.create({})
  });

  append();

  run(function() {
    var event = jQuery.Event('keyup');
    event.keyCode = event.which = 13;
    textField.$().trigger(event);
  });

});


QUnit.test('when the user presses the `enter` key, the `enter` action is sent to the controller', function() {
  expect(1);

  textField = TextField.create({
    'enter': 'doSomething',
    targetObject: StubController.create({})
  });

  append();

  run(function() {
    var event = jQuery.Event('keyup');
    event.keyCode = event.which = 13;
    textField.$().trigger(event);
  });

});

QUnit.test('when the user hits escape, the `escape-press` action is sent to the controller', function() {
  expect(1);

  textField = TextField.create({
    'escape-press': 'doSomething',
    targetObject: StubController.create({})
  });

  append();

  run(function() {
    var event = jQuery.Event('keyup');
    event.keyCode = event.which = 27;
    textField.$().trigger(event);
  });

});

QUnit.test('when the user presses a key, the `key-down` action is sent to the controller', function() {
  expect(3);
  var event;

  textField = TextField.create({
    'key-down': 'doSomething',
    targetObject: StubController.create({
      send(actionName, value, evt) {
        equal(actionName, 'doSomething', 'text field sent correct action name');
        equal(value, '', 'value was blank in key-down');
        equal(evt, event, 'event was received as param');
      }
    })
  });

  append();

  run(function() {
    event = jQuery.Event('keydown');
    event.keyCode = event.which = 65;
    textField.$().val('foo');
    textField.$().trigger(event);
  });
});

QUnit.test('when the user releases a key, the `key-up` action is sent to the controller', function() {
  expect(3);
  var event;

  textField = TextField.create({
    'key-up': 'doSomething',
    targetObject: StubController.create({
      send(actionName, value, evt) {
        equal(actionName, 'doSomething', 'text field sent correct action name');
        equal(value, 'bar', 'value was received');
        equal(evt, event, 'event was received as param');
      }
    })
  });

  append();

  run(function() {
    event = jQuery.Event('keyup');
    event.keyCode = event.which = 65;
    textField.$().val('bar');
    textField.$().trigger(event);
  });
});

QUnit.test('should not reset cursor position when text field receives keyUp event', function() {
  view = TextField.create({
    value: 'Broseidon, King of the Brocean'
  });

  appendView(view);

  setCaretPosition(view.$(), 5);

  run(function() {
    view.trigger('keyUp', {});
  });

  equal(caretPosition(view.$()), 5, 'The keyUp event should not result in the cursor being reset due to the bind-attr observers');
});

QUnit.test('an unsupported type defaults to `text`', function() {
  view = TextField.create({
    type: 'blahblah'
  });

  equal(get(view, 'type'), 'text', 'should default to text if the type is not a valid type');

  appendView(view);

  equal(view.element.type, 'text');
});
