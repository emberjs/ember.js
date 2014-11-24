import run from "ember-metal/run_loop";
import { set } from "ember-metal/property_set";
import View from "ember-views/views/view";

import EmberHandlebars from "ember-handlebars";
import htmlbarsCompile from "ember-htmlbars/system/compile";

var compile;
if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
} else {
  compile = EmberHandlebars.compile;
}

var view;
var controller;

function appendView(view) {
  run(function() {
    view.appendTo('#qunit-fixture');
  });
}

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

    appendView(view);
  },

  teardown: function() {
    if (view) {
      run(view, view.destroy);
    }
  }
});

test("should insert a text field into DOM", function() {
  equal(view.$('input').length, 1, "A single text field was inserted");
});

test("should become disabled if the disabled attribute is true", function() {
  ok(view.$('input').is(':not(:disabled)'), "There are no disabled text fields");

  run(null, set, controller, 'disabled', true);
  ok(view.$('input').is(':disabled'), "The text field is disabled");

  run(null, set, controller, 'disabled', false);
  ok(view.$('input').is(':not(:disabled)'), "There are no disabled text fields");
});

test("input value is updated when setting value property of view", function() {
  equal(view.$('input').val(), "hello", "renders text field with value");
  run(null, set, controller, 'val', 'bye!');
  equal(view.$('input').val(), "bye!", "updates text field after value changes");
});

test("input placeholder is updated when setting placeholder property of view", function() {
  equal(view.$('input').attr('placeholder'), "Enter some text", "renders text field with placeholder");
  run(null, set, controller, 'place', 'Text, please enter it');
  equal(view.$('input').attr('placeholder'), "Text, please enter it", "updates text field after placeholder changes");
});

test("input name is updated when setting name property of view", function() {
  equal(view.$('input').attr('name'), "some-name", "renders text field with name");
  run(null, set, controller, 'name', 'other-name');
  equal(view.$('input').attr('name'), "other-name", "updates text field after name changes");
});

test("input maxlength is updated when setting maxlength property of view", function() {
  equal(view.$('input').attr('maxlength'), "30", "renders text field with maxlength");
  run(null, set, controller, 'max', 40);
  equal(view.$('input').attr('maxlength'), "40", "updates text field after maxlength changes");
});

test("input size is updated when setting size property of view", function() {
  equal(view.$('input').attr('size'), "30", "renders text field with size");
  run(null, set, controller, 'size', 40);
  equal(view.$('input').attr('size'), "40", "updates text field after size changes");
});

test("input tabindex is updated when setting tabindex property of view", function() {
  equal(view.$('input').attr('tabindex'), "5", "renders text field with the tabindex");
  run(null, set, controller, 'tab', 3);
  equal(view.$('input').attr('tabindex'), "3", "updates text field after tabindex changes");
});

QUnit.module("{{input type='text'}} - static values", {
  setup: function() {
    controller = {};

    view = View.extend({
      controller: controller,
      template: compile('{{input type="text" disabled=true value="hello" placeholder="Enter some text" name="some-name" maxlength=30 size=30 tabindex=5}}')
    }).create();

    appendView(view);
  },

  teardown: function() {
    if (view) {
      run(view, view.destroy);
    }
  }
});

test("should insert a text field into DOM", function() {
  equal(view.$('input').length, 1, "A single text field was inserted");
});

test("should become disabled if the disabled attribute is true", function() {
  ok(view.$('input').is(':disabled'), "The text field is disabled");
});

test("input value is updated when setting value property of view", function() {
  equal(view.$('input').val(), "hello", "renders text field with value");
});

test("input placeholder is updated when setting placeholder property of view", function() {
  equal(view.$('input').attr('placeholder'), "Enter some text", "renders text field with placeholder");
});

test("input name is updated when setting name property of view", function() {
  equal(view.$('input').attr('name'), "some-name", "renders text field with name");
});

test("input maxlength is updated when setting maxlength property of view", function() {
  equal(view.$('input').attr('maxlength'), "30", "renders text field with maxlength");
});

test("input size is updated when setting size property of view", function() {
  equal(view.$('input').attr('size'), "30", "renders text field with size");
});

test("input tabindex is updated when setting tabindex property of view", function() {
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

    appendView(view);
  },

  teardown: function() {
    if (view) {
      run(view, view.destroy);
    }
  }
});

test("should insert a text field into DOM", function() {
  equal(view.$('input').attr('type'), 'password', "a bound property can be used to determine type.");
});

QUnit.module("{{input}} - default type", {
  setup: function() {
    controller = {};

    view = View.extend({
      controller: controller,
      template: compile('{{input}}')
    }).create();

    appendView(view);
  },

  teardown: function() {
    if (view) {
      run(view, view.destroy);
    }
  }
});

test("should have the default type", function() {
  equal(view.$('input').attr('type'), 'text', "Has a default text type");
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

    appendView(view);
  },

  teardown: function() {
    if (view) {
      run(view, view.destroy);
    }
  }
});

test("should append a checkbox", function() {
  equal(view.$('input[type=checkbox]').length, 1, "A single checkbox is added");
});

test("should begin disabled if the disabled attribute is true", function() {
  ok(view.$('input').is(':not(:disabled)'), "The checkbox isn't disabled");
  run(null, set, controller, 'disabled', true);
  ok(view.$('input').is(':disabled'), "The checkbox is now disabled");
});

test("should support the tabindex property", function() {
  equal(view.$('input').prop('tabindex'), '6', 'the initial checkbox tabindex is set in the DOM');
  run(null, set, controller, 'tab', 3);
  equal(view.$('input').prop('tabindex'), '3', 'the checkbox tabindex changes when it is changed in the view');
});

test("checkbox name is updated", function() {
  equal(view.$('input').attr('name'), "hello", "renders checkbox with the name");
  run(null, set, controller, 'name', 'bye');
  equal(view.$('input').attr('name'), "bye", "updates checkbox after name changes");
});

test("checkbox checked property is updated", function() {
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
    if (view) {
      run(view, view.destroy);
    }
  }
});

test("It asserts the presence of checked=", function() {
  expectAssertion(function() {
    appendView(view);
  }, /you must use `checked=/);
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

    appendView(view);
  },

  teardown: function() {
    if (view) {
      run(view, view.destroy);
    }
  }
});

test("should append a checkbox", function() {
  equal(view.$('input[type=checkbox]').length, 1, "A single checkbox is added");
});

// Checking for the checked property is a good way to verify that the correct
// view was used.
test("checkbox checked property is updated", function() {
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

    appendView(view);
  },

  teardown: function() {
    if (view) {
      run(view, view.destroy);
    }
  }
});

test("should begin disabled if the disabled attribute is true", function() {
  ok(view.$().is(':not(:disabled)'), "The checkbox isn't disabled");
});

test("should support the tabindex property", function() {
  equal(view.$('input').prop('tabindex'), '6', 'the initial checkbox tabindex is set in the DOM');
});

test("checkbox name is updated", function() {
  equal(view.$('input').attr('name'), "hello", "renders checkbox with the name");
});

test("checkbox checked property is updated", function() {
  equal(view.$('input').prop('checked'), false, "the checkbox isn't checked yet");
});
