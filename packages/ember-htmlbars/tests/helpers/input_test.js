import run from "ember-metal/run_loop";
import { set } from "ember-metal/property_set";
import View from "ember-views/views/view";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import compile from "ember-template-compiler/system/compile";
import Registry from "container/registry";
import ComponentLookup from "ember-views/component_lookup";
import TextField from 'ember-views/views/text_field';
import Checkbox from 'ember-views/views/checkbox';
import EventDispatcher from 'ember-views/system/event_dispatcher';

var view;
var controller, registry, container;

function commonSetup() {
  registry = new Registry();
  registry.register('component:-text-field', TextField);
  registry.register('component:-checkbox', Checkbox);
  registry.register('component-lookup:main', ComponentLookup);
  registry.register('event_dispatcher:main', EventDispatcher);
  container = registry.container();

  var dispatcher = container.lookup('event_dispatcher:main');
  dispatcher.setup({}, '#qunit-fixture');
}

QUnit.module("{{input type='text'}}", {
  setup() {
    commonSetup();

    controller = {
      val: "hello",
      place: "Enter some text",
      name: "some-name",
      max: 30,
      size: 30,
      tab: 5
    };

    view = View.extend({
      container: container,
      controller: controller,
      template: compile('{{input type="text" disabled=disabled value=val placeholder=place name=name maxlength=max size=size tabindex=tab}}')
    }).create();

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    runDestroy(container);
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

  let id = view.$('input').prop('id');

  run(null, set, controller, 'val', 'bye!');
  equal(view.$('input').val(), "bye!", "updates text field after value changes");

  equal(view.$('input').prop('id'), id, "the component hasn't changed");
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
    view.get('childViews')[0]._elementValueDidChange();
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
  setup() {
    commonSetup();

    controller = {};

    view = View.extend({
      container: container,
      controller: controller,
      template: compile('{{input type="text" disabled=true value="hello" placeholder="Enter some text" name="some-name" maxlength=30 size=30 tabindex=5}}')
    }).create();

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    runDestroy(container);
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

QUnit.test('specifying `on="someevent" action="foo"` triggers the action', function() {
  expect(2);
  runDestroy(view);
  expectDeprecation(`Using '{{input on="focus-in" action="doFoo"}}' ('foo.hbs' @ L1:C0) is deprecated. Please use '{{input focus-in="doFoo"}}' instead.`);

  controller = {
    send(actionName, value, sender) {
      equal(actionName, 'doFoo', "text field sent correct action name");
    }
  };

  view = View.create({
    container,
    controller,

    template: compile('{{input type="text" on="focus-in" action="doFoo"}}', { moduleName: 'foo.hbs' })
  });

  runAppend(view);

  run(function() {
    var textField = view.$('input');
    textField.trigger('focusin');
  });
});

QUnit.module("{{input type='text'}} - dynamic type", {
  setup() {
    commonSetup();

    controller = {
      someProperty: 'password'
    };

    view = View.extend({
      container: container,
      controller: controller,
      template: compile('{{input type=someProperty}}')
    }).create();

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    runDestroy(container);
  }
});

QUnit.test("should insert a text field into DOM", function() {
  equal(view.$('input').attr('type'), 'password', "a bound property can be used to determine type.");
});

QUnit.test("should change if the type changes", function() {
  equal(view.$('input').attr('type'), 'password', "a bound property can be used to determine type.");

  run(function() {
    set(controller, 'someProperty', 'text');
  });

  equal(view.$('input').attr('type'), 'text', "it changes after the type changes");
});

QUnit.module("{{input}} - default type", {
  setup() {
    commonSetup();

    controller = {};

    view = View.extend({
      container: container,
      controller: controller,
      template: compile('{{input}}')
    }).create();

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    runDestroy(container);
  }
});

QUnit.test("should have the default type", function() {
  equal(view.$('input').attr('type'), 'text', "Has a default text type");
});

QUnit.module("{{input type='checkbox'}}", {
  setup() {
    commonSetup();

    controller = {
      tab: 6,
      name: 'hello',
      val: false
    };

    view = View.extend({
      container: container,
      controller: controller,
      template: compile('{{input type="checkbox" disabled=disabled tabindex=tab name=name checked=val}}')
    }).create();

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    runDestroy(container);

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
  setup() {
    commonSetup();

    view = View.extend({
      container: container,
      controller: controller,
      template: compile('{{input type="checkbox" disabled=disabled tabindex=tab name=name value=val}}')
    }).create();
  },

  teardown() {
    runDestroy(view);
    runDestroy(container);

  }
});

QUnit.test("It asserts the presence of checked=", function() {
  expectAssertion(function() {
    runAppend(view);
  }, /you must use `checked=/);
});

QUnit.module("{{input type=boundType}}", {
  setup() {
    commonSetup();

    controller = {
      inputType: "checkbox",
      isChecked: true
    };

    view = View.extend({
      container: container,
      controller: controller,
      template: compile('{{input type=inputType checked=isChecked}}')
    }).create();

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    runDestroy(container);
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
  setup() {
    commonSetup();

    controller = {
      tab: 6,
      name: 'hello',
      val: false
    };

    view = View.extend({
      container: container,
      controller: controller,
      template: compile('{{input type="checkbox" disabled=true tabindex=6 name="hello" checked=false}}')
    }).create();

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    runDestroy(container);
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

QUnit.module("{{input type='text'}} - null/undefined values", {
  setup() {
    commonSetup();
  },

  teardown() {
    runDestroy(view);
    runDestroy(container);
  }
});

QUnit.test("placeholder attribute bound to undefined is not present", function() {
  view = View.extend({
    container: container,
    controller: {},
    template: compile('{{input placeholder=someThingNotThere}}')
  }).create();

  runAppend(view);

  ok(!view.element.childNodes[1].hasAttribute('placeholder'), "attribute not present");

  run(null, set, view, 'controller.someThingNotThere', 'foo');

  equal(view.element.childNodes[1].getAttribute('placeholder'), 'foo', "attribute is present");
});

QUnit.test("placeholder attribute bound to null is not present", function() {
  view = View.extend({
    container: container,
    controller: {
      someNullProperty: null
    },
    template: compile('{{input placeholder=someNullProperty}}')
  }).create();

  runAppend(view);

  ok(!view.element.childNodes[1].hasAttribute('placeholder'), "attribute not present");

  run(null, set, view, 'controller.someNullProperty', 'foo');

  equal(view.element.childNodes[1].getAttribute('placeholder'), 'foo', "attribute is present");
});
