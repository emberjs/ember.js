import { get } from "ember-metal/property_get";
import { set as o_set } from "ember-metal/property_set";
import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";
import EventDispatcher from "ember-views/system/event_dispatcher";
import EmberHandlebars from "ember-handlebars-compiler";

// import {expectAssertion} from "ember-metal/tests/debug_helpers";

function set(obj, key, value) {
  run(function() { o_set(obj, key, value); });
}

var checkboxView, dispatcher, controller;

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

QUnit.module("{{input type='checkbox'}} - prevent dynamic type", {
  setup: function() {
    checkboxView = EmberView.extend({
      controller: controller,
      inputType: "checkbox",
      template: compile('{{input type=inputType}}')
    }).create();
  },

  teardown: function() {
    destroy(checkboxView);
  }
});

test("It works", function() {
  expectAssertion(function() {
    append();
  }, /not a variable/);
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

QUnit.module("Ember.Checkbox", {
  setup: function() {
    dispatcher = EventDispatcher.create();
    dispatcher.setup();
  },

  teardown: function() {
    run(function() {
      dispatcher.destroy();
      checkboxView.destroy();
    });
  }
});

function append() {
  run(function() {
    checkboxView.appendTo('#qunit-fixture');
  });
}

test("should begin disabled if the disabled attribute is true", function() {
  checkboxView = Ember.Checkbox.create({});

  checkboxView.set('disabled', true);
  append();

  ok(checkboxView.$().is(":disabled"));
});

test("should become disabled if the disabled attribute is changed", function() {
  checkboxView = Ember.Checkbox.create({});

  append();
  ok(checkboxView.$().is(":not(:disabled)"));

  run(function() { checkboxView.set('disabled', true); });
  ok(checkboxView.$().is(":disabled"));

  run(function() { checkboxView.set('disabled', false); });
  ok(checkboxView.$().is(":not(:disabled)"));
});

test("should begin indeterminate if the indeterminate attribute is true", function() {
  checkboxView = Ember.Checkbox.create({});

  checkboxView.set('indeterminate', true);
  append();

  equal(checkboxView.$().prop('indeterminate'), true, "Checkbox should be indeterminate");
});

test("should become indeterminate if the indeterminate attribute is changed", function() {
  checkboxView = Ember.Checkbox.create({});

  append();

  equal(checkboxView.$().prop('indeterminate'), false, "Checkbox should not be indeterminate");

  run(function() { checkboxView.set('indeterminate', true); });
  equal(checkboxView.$().prop('indeterminate'), true, "Checkbox should be indeterminate");

  run(function() { checkboxView.set('indeterminate', false); });
  equal(checkboxView.$().prop('indeterminate'), false, "Checkbox should not be indeterminate");
});

test("should support the tabindex property", function() {
  checkboxView = Ember.Checkbox.create({});

  run(function() { checkboxView.set('tabindex', 6); });
  append();

  equal(checkboxView.$().prop('tabindex'), '6', 'the initial checkbox tabindex is set in the DOM');

  run(function() { checkboxView.set('tabindex', 3); });
  equal(checkboxView.$().prop('tabindex'), '3', 'the checkbox tabindex changes when it is changed in the view');
});

test("checkbox name is updated when setting name property of view", function() {
  checkboxView = Ember.Checkbox.create({});

  run(function() { checkboxView.set('name', 'foo'); });
  append();

  equal(checkboxView.$().attr('name'), "foo", "renders checkbox with the name");

  run(function() { checkboxView.set('name', 'bar'); });

  equal(checkboxView.$().attr('name'), "bar", "updates checkbox after name changes");
});

test("checked property mirrors input value", function() {
  checkboxView = Ember.Checkbox.create({});
  run(function() { checkboxView.append(); });

  equal(get(checkboxView, 'checked'), false, "initially starts with a false value");
  equal(!!checkboxView.$().prop('checked'), false, "the initial checked property is false");

  set(checkboxView, 'checked', true);

  equal(checkboxView.$().prop('checked'), true, "changing the value property changes the DOM");

  run(function() { checkboxView.remove(); });
  run(function() { checkboxView.append(); });

  equal(checkboxView.$().prop('checked'), true, "changing the value property changes the DOM");

  run(function() { checkboxView.remove(); });
  run(function() { set(checkboxView, 'checked', false); });
  run(function() { checkboxView.append(); });

  equal(checkboxView.$().prop('checked'), false, "changing the value property changes the DOM");
});

test("checking the checkbox updates the value", function() {
  checkboxView = Ember.Checkbox.create({ checked: true });
  append();

  equal(get(checkboxView, 'checked'), true, "precond - initially starts with a true value");
  equal(!!checkboxView.$().prop('checked'), true, "precond - the initial checked property is true");

  // IE fires 'change' event on blur.
  checkboxView.$()[0].focus();
  checkboxView.$()[0].click();
  checkboxView.$()[0].blur();

  equal(!!checkboxView.$().prop('checked'), false, "after clicking a checkbox, the checked property changed");
  equal(get(checkboxView, 'checked'), false, "changing the checkbox causes the view's value to get updated");
});
