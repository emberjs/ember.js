import run from "ember-metal/run_loop";
import EventDispatcher from "ember-views/system/event_dispatcher";
import { set } from "ember-metal/property_set";
import View from "ember-views/views/view";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import compile from "ember-template-compiler/system/compile";
import jQuery from "ember-views/system/jquery";

var view;
var controller;

QUnit.module("{{input type='text'}}", {
  setup: function() {
    controller = {
      val: "hello",
      place: "Enter some text",
      name: "some-name",
      max: 30,
      size: 30,
      tab: 5
    };

    view = View.extend({
      controller: controller,
      template: compile('{{input type="text" disabled=disabled value=val placeholder=place name=name maxlength=max size=size tabindex=tab}}')
    }).create();

    runAppend(view);
  },

  teardown: function() {
    runDestroy(view);
  }
});

QUnit.test("should insert a text field into DOM", function() {
  equal(view.$('input').length, 1, "A single text field was inserted");
});

QUnit.test("should become disabled if the disabled attribute is true", function() {
  ok(view.$('input').is(':not(:disabled)'), "There are no disabled text fields");

  run(null, set, controller, 'disabled', true);
  ok(view.$('input').is(':disabled'), "The text field is disabled");

  run(null, set, controller, 'disabled', false);
  ok(view.$('input').is(':not(:disabled)'), "There are no disabled text fields");
});

QUnit.test("input value is updated when setting value property of view", function() {
  equal(view.$('input').val(), "hello", "renders text field with value");
  run(null, set, controller, 'val', 'bye!');
  equal(view.$('input').val(), "bye!", "updates text field after value changes");
});

QUnit.test("input placeholder is updated when setting placeholder property of view", function() {
  equal(view.$('input').attr('placeholder'), "Enter some text", "renders text field with placeholder");
  run(null, set, controller, 'place', 'Text, please enter it');
  equal(view.$('input').attr('placeholder'), "Text, please enter it", "updates text field after placeholder changes");
});

QUnit.test("input name is updated when setting name property of view", function() {
  equal(view.$('input').attr('name'), "some-name", "renders text field with name");
  run(null, set, controller, 'name', 'other-name');
  equal(view.$('input').attr('name'), "other-name", "updates text field after name changes");
});

QUnit.test("input maxlength is updated when setting maxlength property of view", function() {
  equal(view.$('input').attr('maxlength'), "30", "renders text field with maxlength");
  run(null, set, controller, 'max', 40);
  equal(view.$('input').attr('maxlength'), "40", "updates text field after maxlength changes");
});

QUnit.test("input size is updated when setting size property of view", function() {
  equal(view.$('input').attr('size'), "30", "renders text field with size");
  run(null, set, controller, 'size', 40);
  equal(view.$('input').attr('size'), "40", "updates text field after size changes");
});

QUnit.test("input tabindex is updated when setting tabindex property of view", function() {
  equal(view.$('input').attr('tabindex'), "5", "renders text field with the tabindex");
  run(null, set, controller, 'tab', 3);
  equal(view.$('input').attr('tabindex'), "3", "updates text field after tabindex changes");
});

QUnit.test("cursor position is not lost when updating content", function() {
  equal(view.$('input').val(), "hello", "precondition - renders text field with value");

  var $input = view.$('input');
  var input = $input[0];

  // set the cursor position to 3 (no selection)
  run(function() {
    input.value = 'derp';
    input.selectionStart = 3;
    input.selectionEnd = 3;
  });

  run(null, set, controller, 'val', 'derp');

  equal(view.$('input').val(), "derp", "updates text field after value changes");

  equal(input.selectionStart, 3, 'cursor position was not lost');
  equal(input.selectionEnd, 3, 'cursor position was not lost');
});

QUnit.test("input can be updated multiple times", function() {
  equal(view.$('input').val(), "hello", "precondition - renders text field with value");

  var $input = view.$('input');
  var input = $input[0];

  run(null, set, controller, 'val', '');
  equal(view.$('input').val(), "", "updates first time");

  // Simulates setting the input to the same value as it already is which won't cause a rerender
  run(function() {
    input.value = 'derp';
  });
  run(null, set, controller, 'val', 'derp');
  equal(view.$('input').val(), "derp", "updates second time");

  run(null, set, controller, 'val', '');
  equal(view.$('input').val(), "", "updates third time");
});


QUnit.module("{{input type='text'}} - static values", {
  setup: function() {
    controller = {};

    view = View.extend({
      controller: controller,
      template: compile('{{input type="text" disabled=true value="hello" placeholder="Enter some text" name="some-name" maxlength=30 size=30 tabindex=5}}')
    }).create();

    runAppend(view);
  },

  teardown: function() {
    runDestroy(view);
  }
});

QUnit.test("should insert a text field into DOM", function() {
  equal(view.$('input').length, 1, "A single text field was inserted");
});

QUnit.test("should become disabled if the disabled attribute is true", function() {
  ok(view.$('input').is(':disabled'), "The text field is disabled");
});

QUnit.test("input value is updated when setting value property of view", function() {
  equal(view.$('input').val(), "hello", "renders text field with value");
});

QUnit.test("input placeholder is updated when setting placeholder property of view", function() {
  equal(view.$('input').attr('placeholder'), "Enter some text", "renders text field with placeholder");
});

QUnit.test("input name is updated when setting name property of view", function() {
  equal(view.$('input').attr('name'), "some-name", "renders text field with name");
});

QUnit.test("input maxlength is updated when setting maxlength property of view", function() {
  equal(view.$('input').attr('maxlength'), "30", "renders text field with maxlength");
});

QUnit.test("input size is updated when setting size property of view", function() {
  equal(view.$('input').attr('size'), "30", "renders text field with size");
});

QUnit.test("input tabindex is updated when setting tabindex property of view", function() {
  equal(view.$('input').attr('tabindex'), "5", "renders text field with the tabindex");
});

QUnit.module("{{input type='text'}} - dynamic type", {
  setup: function() {
    controller = {
      someProperty: 'password'
    };

    view = View.extend({
      controller: controller,
      template: compile('{{input type=someProperty}}')
    }).create();

    runAppend(view);
  },

  teardown: function() {
    runDestroy(view);
  }
});

QUnit.test("should insert a text field into DOM", function() {
  equal(view.$('input').attr('type'), 'password', "a bound property can be used to determine type.");
});

QUnit.module("{{input}} - default type", {
  setup: function() {
    controller = {};

    view = View.extend({
      controller: controller,
      template: compile('{{input}}')
    }).create();

    runAppend(view);
  },

  teardown: function() {
    runDestroy(view);
  }
});

QUnit.test("should have the default type", function() {
  equal(view.$('input').attr('type'), 'text', "Has a default text type");
});

var dispatcher;
QUnit.module("{{input action='doSomething' on='key-press'}}", {
  setup: function() {
    controller = {
      send: function(actionName, value, sender) {
        equal(actionName, 'doSomething', "the action was called");
      }
    };

    dispatcher = EventDispatcher.create();
    dispatcher.setup();

    view = View.extend({
      controller: controller,
      template: compile('{{input action="doSomething" on="key-press"}}')
    }).create();

    runAppend(view);
  },

  teardown: function() {
    run(function() {
      dispatcher.destroy();
    });

    runDestroy(view);
  }
});

test("should trigger an action on key-press event", function() {
  expect(1);
  var event = jQuery.Event("keypress");
  event.keyCode = event.which = 13;
  view.$('input').trigger(event);
});


QUnit.module("{{input type='checkbox'}}", {
  setup: function() {
    controller = {
      tab: 6,
      name: 'hello',
      val: false
    };

    view = View.extend({
      controller: controller,
      template: compile('{{input type="checkbox" disabled=disabled tabindex=tab name=name checked=val}}')
    }).create();

    runAppend(view);
  },

  teardown: function() {
    runDestroy(view);
  }
});

QUnit.test("should append a checkbox", function() {
  equal(view.$('input[type=checkbox]').length, 1, "A single checkbox is added");
});

QUnit.test("should begin disabled if the disabled attribute is true", function() {
  ok(view.$('input').is(':not(:disabled)'), "The checkbox isn't disabled");
  run(null, set, controller, 'disabled', true);
  ok(view.$('input').is(':disabled'), "The checkbox is now disabled");
});

QUnit.test("should support the tabindex property", function() {
  equal(view.$('input').prop('tabindex'), '6', 'the initial checkbox tabindex is set in the DOM');
  run(null, set, controller, 'tab', 3);
  equal(view.$('input').prop('tabindex'), '3', 'the checkbox tabindex changes when it is changed in the view');
});

QUnit.test("checkbox name is updated", function() {
  equal(view.$('input').attr('name'), "hello", "renders checkbox with the name");
  run(null, set, controller, 'name', 'bye');
  equal(view.$('input').attr('name'), "bye", "updates checkbox after name changes");
});

QUnit.test("checkbox checked property is updated", function() {
  equal(view.$('input').prop('checked'), false, "the checkbox isn't checked yet");
  run(null, set, controller, 'val', true);
  equal(view.$('input').prop('checked'), true, "the checkbox is checked now");
});

QUnit.module("{{input type='checkbox'}} - prevent value= usage", {
  setup: function() {
    view = View.extend({
      controller: controller,
      template: compile('{{input type="checkbox" disabled=disabled tabindex=tab name=name value=val}}')
    }).create();
  },

  teardown: function() {
    runDestroy(view);
  }
});

QUnit.test("It asserts the presence of checked=", function() {
  expectAssertion(function() {
    runAppend(view);
  }, /you must use `checked/);
});

QUnit.module("{{input type=boundType}}", {
  setup: function() {
    controller = {
      inputType: "checkbox",
      isChecked: true
    };

    view = View.extend({
      controller: controller,
      template: compile('{{input type=inputType checked=isChecked}}')
    }).create();

    runAppend(view);
  },

  teardown: function() {
    runDestroy(view);
  }
});

QUnit.test("should append a checkbox", function() {
  equal(view.$('input[type=checkbox]').length, 1, "A single checkbox is added");
});

// Checking for the checked property is a good way to verify that the correct
// view was used.
QUnit.test("checkbox checked property is updated", function() {
  equal(view.$('input').prop('checked'), true, "the checkbox is checked");
});

QUnit.module("{{input type='checkbox'}} - static values", {
  setup: function() {
    controller = {
      tab: 6,
      name: 'hello',
      val: false
    };

    view = View.extend({
      controller: controller,
      template: compile('{{input type="checkbox" disabled=true tabindex=6 name="hello" checked=false}}')
    }).create();

    runAppend(view);
  },

  teardown: function() {
    runDestroy(view);
  }
});

QUnit.test("should begin disabled if the disabled attribute is true", function() {
  ok(view.$().is(':not(:disabled)'), "The checkbox isn't disabled");
});

QUnit.test("should support the tabindex property", function() {
  equal(view.$('input').prop('tabindex'), '6', 'the initial checkbox tabindex is set in the DOM');
});

QUnit.test("checkbox name is updated", function() {
  equal(view.$('input').attr('name'), "hello", "renders checkbox with the name");
});

QUnit.test("checkbox checked property is updated", function() {
  equal(view.$('input').prop('checked'), false, "the checkbox isn't checked yet");
});
