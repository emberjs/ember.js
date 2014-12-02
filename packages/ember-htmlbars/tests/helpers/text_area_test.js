import run from "ember-metal/run_loop";
import View from "ember-views/views/view";
import EmberHandlebars from "ember-htmlbars/compat";
import htmlbarsCompile from "ember-htmlbars/system/compile";
import { set as o_set } from "ember-metal/property_set";
import { appendView, destroyView } from "ember-views/tests/view_helpers";

var compile;
if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
} else {
  compile = EmberHandlebars.compile;
}

var textArea, controller;

function set(object, key, value) {
  run(function() { o_set(object, key, value); });
}

QUnit.module("{{textarea}}", {
  setup: function() {
    controller = {
      val: 'Lorem ipsum dolor'
    };

    textArea = View.extend({
      controller: controller,
      template: compile('{{textarea disabled=disabled value=val}}')
    }).create();

    appendView(textArea);
  },

  teardown: function() {
    destroyView(textArea);
  }
});

test("Should insert a textarea", function() {
  equal(textArea.$('textarea').length, 1, "There is a single textarea");
});

test("Should become disabled when the controller changes", function() {
  ok(textArea.$('textarea').is(':not(:disabled)'), "Nothing is disabled yet");
  set(controller, 'disabled', true);
  ok(textArea.$('textarea').is(':disabled'), "The disabled attribute is updated");
});

test("Should bind its contents to the specified value", function() {
  equal(textArea.$('textarea').val(), "Lorem ipsum dolor", "The contents are included");
  set(controller, 'val', "sit amet");
  equal(textArea.$('textarea').val(), "sit amet", "The new contents are included");
});
