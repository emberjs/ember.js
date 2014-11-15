import { set as o_set } from "ember-metal/property_set";
import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";
import EmberHandlebars from "ember-handlebars-compiler";

// import {expectAssertion} from "ember-metal/tests/debug_helpers";

function set(obj, key, value) {
  run(function() { o_set(obj, key, value); });
}

function append() {
  run(function() {
    checkboxView.appendTo('#qunit-fixture');
  });
}


var checkboxView, controller;

var compile = EmberHandlebars.compile;

function destroy(view) {
  run(function() {
    view.destroy();
  });
}

QUnit.module("{{input type='checkbox'}}", {
  setup: function() {
    controller = {
      tab: 6,
      name: 'hello',
      val: false
    };

    checkboxView = EmberView.extend({
      controller: controller,
      template: compile('{{input type="checkbox" disabled=disabled tabindex=tab name=name checked=val}}')
    }).create();

    append();
  },

  teardown: function() {
    destroy(checkboxView);
  }
});

test("should append a checkbox", function() {
  equal(checkboxView.$('input[type=checkbox]').length, 1, "A single checkbox is added");
});

test("should begin disabled if the disabled attribute is true", function() {
  ok(checkboxView.$('input').is(':not(:disabled)'), "The checkbox isn't disabled");
  set(controller, 'disabled', true);
  ok(checkboxView.$('input').is(':disabled'), "The checkbox is now disabled");
});

test("should support the tabindex property", function() {
  equal(checkboxView.$('input').prop('tabindex'), '6', 'the initial checkbox tabindex is set in the DOM');
  set(controller, 'tab', 3);
  equal(checkboxView.$('input').prop('tabindex'), '3', 'the checkbox tabindex changes when it is changed in the view');
});

test("checkbox name is updated", function() {
  equal(checkboxView.$('input').attr('name'), "hello", "renders checkbox with the name");
  set(controller, 'name', 'bye');
  equal(checkboxView.$('input').attr('name'), "bye", "updates checkbox after name changes");
});

test("checkbox checked property is updated", function() {
  equal(checkboxView.$('input').prop('checked'), false, "the checkbox isn't checked yet");
  set(controller, 'val', true);
  equal(checkboxView.$('input').prop('checked'), true, "the checkbox is checked now");
});

QUnit.module("{{input type='checkbox'}} - prevent value= usage", {
  setup: function() {
    checkboxView = EmberView.extend({
      controller: controller,
      template: compile('{{input type="checkbox" disabled=disabled tabindex=tab name=name value=val}}')
    }).create();
  },

  teardown: function() {
    destroy(checkboxView);
  }
});

test("It works", function() {
  expectAssertion(function() {
    append();
  }, /you must use `checked=/);
});

QUnit.module("{{input type=boundType}}", {
  setup: function() {
    controller = {
      inputType: "checkbox",
      isChecked: true
    };

    checkboxView = EmberView.extend({
      controller: controller,
      template: compile('{{input type=inputType checked=isChecked}}')
    }).create();

    append();
  },

  teardown: function() {
    destroy(checkboxView);
  }
});

test("should append a checkbox", function() {
  equal(checkboxView.$('input[type=checkbox]').length, 1, "A single checkbox is added");
});

// Checking for the checked property is a good way to verify that the correct
// view was used.
test("checkbox checked property is updated", function() {
  equal(checkboxView.$('input').prop('checked'), true, "the checkbox is checked");
});

QUnit.module("{{input type='checkbox'}} - static values", {
  setup: function() {
    controller = {
      tab: 6,
      name: 'hello',
      val: false
    };

    checkboxView = EmberView.extend({
      controller: controller,
      template: compile('{{input type="checkbox" disabled=true tabindex=6 name="hello" checked=false}}')
    }).create();

    append();
  },

  teardown: function() {
    destroy(checkboxView);
  }
});

test("should begin disabled if the disabled attribute is true", function() {
  ok(checkboxView.$().is(':not(:disabled)'), "The checkbox isn't disabled");
});

test("should support the tabindex property", function() {
  equal(checkboxView.$('input').prop('tabindex'), '6', 'the initial checkbox tabindex is set in the DOM');
});

test("checkbox name is updated", function() {
  equal(checkboxView.$('input').attr('name'), "hello", "renders checkbox with the name");
});

test("checkbox checked property is updated", function() {
  equal(checkboxView.$('input').prop('checked'), false, "the checkbox isn't checked yet");
});
