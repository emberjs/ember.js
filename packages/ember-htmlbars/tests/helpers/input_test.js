import run from "ember-metal/run_loop";
import { set as o_set } from "ember-metal/property_set";
import View from "ember-views/views/view";

import EmberHandlebars from "ember-handlebars";
import htmlbarsCompile from "ember-htmlbars/system/compile";

var compile;
if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
} else {
  compile = EmberHandlebars.compile;
}

var textField;
var controller;

function set(object, key, value) {
  run(function() { o_set(object, key, value); });
}

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

QUnit.module("{{input type='text'}} - static values", {
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

QUnit.module("{{input type='text'}} - dynamic type", {
  setup: function() {
    controller = {
      someProperty: 'password'
    };

    textField = View.extend({
      controller: controller,
      template: compile('{{input type=someProperty}}')
    }).create();

    append();
  },

  teardown: function() {
    destroy(textField);
  }
});

test("should insert a text field into DOM", function() {
  equal(textField.$('input').attr('type'), 'password', "a bound property can be used to determine type.");
});

QUnit.module("{{input}} - default type", {
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
