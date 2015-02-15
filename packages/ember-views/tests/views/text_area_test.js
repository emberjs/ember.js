import EmberObject from 'ember-runtime/system/object';
import run from 'ember-metal/run_loop';
import TextArea from 'ember-views/views/text_area';
import { get } from 'ember-metal/property_get';
import { set as o_set } from 'ember-metal/property_set';

var textArea, TestObject;

function set(object, key, value) {
  run(function() { o_set(object, key, value); });
}

function append() {
  run(function() {
    textArea.appendTo('#qunit-fixture');
  });
}

QUnit.module('TextArea', {
  setup() {
    TestObject = window.TestObject = EmberObject.create({
      value: null
    });

    textArea = TextArea.create();
  },

  teardown() {
    run(function() {
      textArea.destroy();
    });

    TestObject = window.TestObject = textArea = null;
  }
});

QUnit.test('should become disabled if the disabled attribute is true', function() {
  textArea.set('disabled', true);
  append();

  ok(textArea.$().is(':disabled'));
});

QUnit.test('should become disabled if the disabled attribute is true', function() {
  append();
  ok(textArea.$().is(':not(:disabled)'));

  run(function() { textArea.set('disabled', true); });
  ok(textArea.$().is(':disabled'));

  run(function() { textArea.set('disabled', false); });
  ok(textArea.$().is(':not(:disabled)'));
});

['placeholder', 'name', 'title', 'maxlength', 'rows', 'cols', 'tabindex'].forEach(function(attributeName) {
  QUnit.test(`text area ${attributeName} is updated when setting ${attributeName} property of view`, function() {
    run(function() {
      set(textArea, attributeName, '1');
      textArea.append();
    });

    equal(textArea.$().attr(attributeName), '1', 'renders text area with ' + attributeName);

    run(function() { set(textArea, attributeName, '2'); });

    equal(textArea.$().attr(attributeName), '2', `updates text area after ${attributeName} changes`);
  });
});

QUnit.test('text area value is updated when setting value property of view', function() {
  run(function() {
    set(textArea, 'value', 'foo');
    textArea.append();
  });

  equal(textArea.$().val(), 'foo', 'renders text area with value');

  run(function() { set(textArea, 'value', 'bar'); });

  equal(textArea.$().val(), 'bar', 'updates text area after value changes');
});

QUnit.test('value binding works properly for inputs that haven\'t been created', function() {
  run(function() {
    textArea.destroy(); // destroy existing textarea
    textArea = TextArea.create({
      valueBinding: 'TestObject.value'
    });
  });

  equal(get(textArea, 'value'), null, 'precond - default value is null');
  equal(textArea.$(), undefined, 'precond - view doesn\'t have its layer created yet, thus no input element');

  run(function() {
    set(TestObject, 'value', 'ohai');
  });

  equal(get(textArea, 'value'), 'ohai', 'value property was properly updated');

  run(function() { textArea.append(); });

  equal(get(textArea, 'value'), 'ohai', 'value property remains the same once the view has been appended');
  equal(textArea.$().val(), 'ohai', 'value is reflected in the input element once it is created');
});

['cut', 'paste', 'input'].forEach(function(eventName) {
  QUnit.test('should update the value on ' + eventName + ' events', function() {
    run(function() {
      textArea.append();
    });

    textArea.$().val('new value');
    run(function() {
      textArea.trigger(eventName, EmberObject.create({
        type: eventName
      }));
    });

    equal(textArea.get('value'), 'new value', 'value property updates on ' + eventName + ' events');
  });
});

QUnit.test('should call the insertNewline method when return key is pressed', function() {
  var wasCalled;
  var event = EmberObject.create({
    keyCode: 13
  });

  run(function() { textArea.append(); });

  textArea.insertNewline = function() {
    wasCalled = true;
  };

  textArea.trigger('keyUp', event);
  ok(wasCalled, 'invokes insertNewline method');
});

QUnit.test('should call the cancel method when escape key is pressed', function() {
  var wasCalled;
  var event = EmberObject.create({
    keyCode: 27
  });

  run(function() { textArea.append(); });

  textArea.cancel = function() {
    wasCalled = true;
  };

  textArea.trigger('keyUp', event);
  ok(wasCalled, 'invokes cancel method');
});
