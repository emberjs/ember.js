/*globals TestObject:true */

var textField;
import Ember from "ember-metal/core"; // Ember.K
var K = Ember.K;

import run from "ember-metal/run_loop";
import {get} from "ember-metal/property_get";
import {set as o_set} from "ember-metal/property_set";
import EmberHandlebars from "ember-handlebars";
import EmberObject from "ember-runtime/system/object";
import {View} from "ember-views/views/view";

import TextField from "ember-handlebars/controls/text_field";
var set = function(object, key, value) {
  run(function() { o_set(object, key, value); });
};

function append() {
  run(function() {
    textField.appendTo('#qunit-fixture');
  });
}

function destroy(view) {
  run(function() {
    view.destroy();
  });
}

var controller, TestObject;

module("{{input type='text'}}", {
  setup: function() {
    controller = {
      val: "hello",
      place: "Enter some text",
      name: "some-name",
      max: 30,
      size: 30,
      tab: 5
    };

    textField = View.extend({
      controller: controller,
      template: compile('{{input type="text" disabled=disabled value=val placeholder=place name=name maxlength=max size=size tabindex=tab}}')
    }).create();

    append();
  },

  teardown: function() {
    destroy(textField);
  }
});

var compile = EmberHandlebars.compile;

test("should insert a text field into DOM", function() {
  equal(textField.$('input').length, 1, "A single text field was inserted");
});

test("should become disabled if the disabled attribute is true", function() {
  ok(textField.$('input').is(':not(:disabled)'), "There are no disabled text fields");

  set(controller, 'disabled', true);
  ok(textField.$('input').is(':disabled'), "The text field is disabled");

  set(controller, 'disabled', false);
  ok(textField.$('input').is(':not(:disabled)'), "There are no disabled text fields");
});

test("input value is updated when setting value property of view", function() {
  equal(textField.$('input').val(), "hello", "renders text field with value");
  set(controller, 'val', 'bye!');
  equal(textField.$('input').val(), "bye!", "updates text field after value changes");
});

test("input placeholder is updated when setting placeholder property of view", function() {
  equal(textField.$('input').attr('placeholder'), "Enter some text", "renders text field with placeholder");
  set(controller, 'place', 'Text, please enter it');
  equal(textField.$('input').attr('placeholder'), "Text, please enter it", "updates text field after placeholder changes");
});

test("input name is updated when setting name property of view", function() {
  equal(textField.$('input').attr('name'), "some-name", "renders text field with name");
  set(controller, 'name', 'other-name');
  equal(textField.$('input').attr('name'), "other-name", "updates text field after name changes");
});

test("input maxlength is updated when setting maxlength property of view", function() {
  equal(textField.$('input').attr('maxlength'), "30", "renders text field with maxlength");
  set(controller, 'max', 40);
  equal(textField.$('input').attr('maxlength'), "40", "updates text field after maxlength changes");
});

test("input size is updated when setting size property of view", function() {
  equal(textField.$('input').attr('size'), "30", "renders text field with size");
  set(controller, 'size', 40);
  equal(textField.$('input').attr('size'), "40", "updates text field after size changes");
});

test("input tabindex is updated when setting tabindex property of view", function() {
  equal(textField.$('input').attr('tabindex'), "5", "renders text field with the tabindex");
  set(controller, 'tab', 3);
  equal(textField.$('input').attr('tabindex'), "3", "updates text field after tabindex changes");
});

module("{{input type='text'}} - static values", {
  setup: function() {
    controller = {};

    textField = View.extend({
      controller: controller,
      template: compile('{{input type="text" disabled=true value="hello" placeholder="Enter some text" name="some-name" maxlength=30 size=30 tabindex=5}}')
    }).create();

    append();
  },

  teardown: function() {
    destroy(textField);
  }
});

test("should insert a text field into DOM", function() {
  equal(textField.$('input').length, 1, "A single text field was inserted");
});

test("should become disabled if the disabled attribute is true", function() {
  ok(textField.$('input').is(':disabled'), "The text field is disabled");
});

test("input value is updated when setting value property of view", function() {
  equal(textField.$('input').val(), "hello", "renders text field with value");
});

test("input placeholder is updated when setting placeholder property of view", function() {
  equal(textField.$('input').attr('placeholder'), "Enter some text", "renders text field with placeholder");
});

test("input name is updated when setting name property of view", function() {
  equal(textField.$('input').attr('name'), "some-name", "renders text field with name");
});

test("input maxlength is updated when setting maxlength property of view", function() {
  equal(textField.$('input').attr('maxlength'), "30", "renders text field with maxlength");
});

test("input size is updated when setting size property of view", function() {
  equal(textField.$('input').attr('size'), "30", "renders text field with size");
});

test("input tabindex is updated when setting tabindex property of view", function() {
  equal(textField.$('input').attr('tabindex'), "5", "renders text field with the tabindex");
});

module("{{input}} - default type", {
  setup: function() {
    controller = {};

    textField = View.extend({
      controller: controller,
      template: compile('{{input}}')
    }).create();

    append();
  },

  teardown: function() {
    destroy(textField);
  }
});

test("should have the default type", function() {
  equal(textField.$('input').attr('type'), 'text', "Has a default text type");
});

module("Ember.TextField", {
  setup: function() {
    TestObject = window.TestObject = EmberObject.create({
      value: null
    });

    textField = TextField.create();
  },

  teardown: function() {
    run(function() {
      textField.destroy();
    });
    TestObject = window.TestObject = textField = null;
  }
});

test("should become disabled if the disabled attribute is true", function() {
  textField.set('disabled', true);
  append();

  ok(textField.$().is(":disabled"));
});

test("should become disabled if the disabled attribute is true", function() {
  append();
  ok(textField.$().is(":not(:disabled)"));

  run(function() { textField.set('disabled', true); });
  ok(textField.$().is(":disabled"));

  run(function() { textField.set('disabled', false); });
  ok(textField.$().is(":not(:disabled)"));
});

test("input value is updated when setting value property of view", function() {
  run(function() {
    set(textField, 'value', 'foo');
    textField.append();
  });

  equal(textField.$().val(), "foo", "renders text field with value");

  run(function() { set(textField, 'value', 'bar'); });

  equal(textField.$().val(), "bar", "updates text field after value changes");
});

test("input placeholder is updated when setting placeholder property of view", function() {
  run(function() {
    set(textField, 'placeholder', 'foo');
    textField.append();
  });

  equal(textField.$().attr('placeholder'), "foo", "renders text field with placeholder");

  run(function() { set(textField, 'placeholder', 'bar'); });

  equal(textField.$().attr('placeholder'), "bar", "updates text field after placeholder changes");
});

test("input name is updated when setting name property of view", function() {
  run(function() {
    set(textField, 'name', 'foo');
    textField.append();
  });

  equal(textField.$().attr('name'), "foo", "renders text field with name");

  run(function() { set(textField, 'name', 'bar'); });

  equal(textField.$().attr('name'), "bar", "updates text field after name changes");
});

test("input maxlength is updated when setting maxlength property of view", function() {
  run(function() {
    set(textField, 'maxlength', '30');
    textField.append();
  });

  equal(textField.$().attr('maxlength'), "30", "renders text field with maxlength");

  run(function() { set(textField, 'maxlength', '40'); });

  equal(textField.$().attr('maxlength'), "40", "updates text field after maxlength changes");
});

test("input size is updated when setting size property of view", function() {
  run(function() {
    set(textField, 'size', '30');
    textField.append();
  });

  equal(textField.$().attr('size'), "30", "renders text field with size");

  run(function() { set(textField, 'size', '40'); });

  equal(textField.$().attr('size'), "40", "updates text field after size changes");
});

test("input tabindex is updated when setting tabindex property of view", function() {
  run(function() {
    set(textField, 'tabindex', '5');
    textField.append();
  });

  equal(textField.$().attr('tabindex'), "5", "renders text field with the tabindex");

  run(function() { set(textField, 'tabindex', '3'); });

  equal(textField.$().attr('tabindex'), "3", "updates text field after tabindex changes");
});

test("input title is updated when setting title property of view", function() {
  run(function() {
    set(textField, 'title', 'FooTitle');
    textField.append();
  });

  equal(textField.$().attr('title'), "FooTitle", "renders text field with the title");

  run(function() { set(textField, 'title', 'BarTitle'); });

  equal(textField.$().attr('title'), "BarTitle", "updates text field after title changes");
});

test("input type is configurable when creating view", function() {
  run(function() {
    set(textField, 'type', 'password');
    textField.append();
  });

  equal(textField.$().attr('type'), 'password', "renders text field with type");
});

test("value binding works properly for inputs that haven't been created", function() {

  run(function() {
    textField.destroy(); // destroy existing textField
    textField = TextField.createWithMixins({
      valueBinding: 'TestObject.value'
    });
  });

  equal(get(textField, 'value'), null, "precond - default value is null");
  equal(textField.$(), undefined, "precond - view doesn't have its layer created yet, thus no input element");

  run(function() {
    set(TestObject, 'value', 'ohai');
  });

  equal(get(textField, 'value'), 'ohai', "value property was properly updated");

  run(function() { textField.append(); });

  equal(get(textField, 'value'), 'ohai', "value property remains the same once the view has been appended");
  equal(textField.$().val(), 'ohai', "value is reflected in the input element once it is created");
});

test("value binding sets value on the element", function() {
  run(function() {
    textField.destroy(); // destroy existing textField
    textField = TextField.createWithMixins({
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

  equal(get(textField, 'value'), 'via dom', "value property was properly updated via dom");
  equal(textField.$().val(), 'via dom', "dom property was properly updated via dom");

  // Now, set it via the binding
  run(function() {
    set(TestObject, 'value', 'via view');
  });

  equal(get(textField, 'value'), 'via view', "value property was properly updated via view");
  equal(textField.$().val(), 'via view', "dom property was properly updated via view");
});

test("should call the insertNewline method when return key is pressed", function() {
  var wasCalled;
  var event = EmberObject.create({
    keyCode: 13
  });

  run(function() { textField.append(); });

  textField.insertNewline = function() {
    wasCalled = true;
  };

  textField.trigger('keyUp', event);
  ok(wasCalled, "invokes insertNewline method");
});

test("should call the cancel method when escape key is pressed", function() {
  var wasCalled;
  var event = EmberObject.create({
    keyCode: 27
  });

  run(function() { textField.append(); });

  textField.cancel = function() {
    wasCalled = true;
  };

  textField.trigger('keyUp', event);
  ok(wasCalled, "invokes cancel method");
});

test("should send an action if one is defined when the return key is pressed", function() {
  expect(2);

  var StubController = EmberObject.extend({
    send: function(actionName, value, sender) {
      equal(actionName, 'didTriggerAction', "text field sent correct action name");
      equal(value, "textFieldValue", "text field sent its current value as first argument");
    }
  });

  textField.set('action', 'didTriggerAction');
  textField.set('value', "textFieldValue");
  textField.set('targetObject', StubController.create());

  run(function() { textField.append(); });

  var event = {
    keyCode: 13,
    stopPropagation: K
  };

  textField.trigger('keyUp', event);
});

test("should send an action on keyPress if one is defined with onEvent=keyPress", function() {
  expect(2);

  var StubController = EmberObject.extend({
    send: function(actionName, value, sender) {
      equal(actionName, 'didTriggerAction', "text field sent correct action name");
      equal(value, "textFieldValue", "text field sent its current value as first argument");
    }
  });

  textField.set('action', 'didTriggerAction');
  textField.set('onEvent', 'keyPress');
  textField.set('value', "textFieldValue");
  textField.set('targetObject', StubController.create());

  run(function() { textField.append(); });

  var event = {
    keyCode: 48,
    stopPropagation: K
  };

  textField.trigger('keyPress', event);
});


test("bubbling of handled actions can be enabled via bubbles property", function() {
  textField.set('bubbles', true);
  textField.set('action', 'didTriggerAction');

  textField.set('controller', EmberObject.create({
    send: K
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
