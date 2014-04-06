import Ember from "ember-metal/core"; //FEATURES
import run from "ember-metal/run_loop";
import jQuery from "ember-views/system/jquery";
import EventDispatcher from "ember-views/system/event_dispatcher";
import {get} from "ember-metal/property_get";
import {set as o_set} from "ember-metal/property_set";


var dispatcher, view, radio, component;

var set = function(object, key, value) {
  run(function() { o_set(object, key, value); });
};

function append() {
  run(function() {
    view.appendTo('#qunit-fixture');
  });
}

if (Ember.FEATURES.isEnabled("ember-handlebars-radio-buttons")) {

  module("Ember.RadioButton", {
    setup: function() {

      run(function() {
        dispatcher = EventDispatcher.create();
        dispatcher.setup();
      });
      
      radio = Ember.RadioButton.create({
        name: 'radio_button',
        value: 'tahoe'
      });

      view = radio;

      append();
    },
    teardown: function() {
      run(function() {
        radio.destroy();
        dispatcher.destroy();
      });
    }
  });

  test("setting selectedValue should update the checked property", function() {

    strictEqual(radio.$().prop('checked'), false, "precond - the element is not checked");
    strictEqual(get(radio, "checked"), false, "precond - checked returns false");

    set(radio, 'selectedValue', 'tahoe');

    ok(radio.$().prop('checked'), "after clicking a radio button, the checked property changed in the DOM.");
    equal(get(radio, "checked"), true, "after clicking a radio button, the checked property changed in the view.");
  });


  test("setting checked should update the selected value", function() {
    set(radio, 'checked', true);

    ok(radio.$().prop('checked'), "checked attribute should be set");
    equal(get(radio, 'selectedValue'), 'tahoe', 'selectedValue should be set');
  });

  test("trigger change event should update checked property", function() {
    jQuery('[value="tahoe"]').click();

    ok(jQuery('[value="tahoe"]').prop('checked'), "checked attribute should be set");
  });

  module("Ember.RadioButtonGroup", {
    setup: function() {
      run(function() {
        dispatcher = EventDispatcher.create();
        dispatcher.setup();
        view = Ember.ContainerView.create();
        var group = Ember.RadioButtonGroup.create({
          name: "options",
          template: Ember.Handlebars.compile(
            '{{view view.RadioButton value="option1"}}' +
            '{{view view.RadioButton value="option2"}}'
          )
        });
        append();
        view.pushObject(group);
        component = view.objectAt(0);
      });
    },
    teardown: function() {
      if (view) {
        run(function() {
          view.removeAt(0);
          view.destroy();
          dispatcher.destroy();
          view = null;
        });

      }
    }
  });

  test("value should update correctly", function() {

    set(component, 'value', 'option1');

    equal(get(component, 'value'), 'option1', 'value should be set');
    equal(component.$().find("[value='option1']").prop('checked'), true, 'checkbox should be checked');
    equal(component.$().find("[value='option2']").prop('checked'), false, 'checkbox should not be checked');

    set(component, 'value', 'option2');

    equal(get(component, 'value'), 'option2', 'value should be set');
    equal(component.$("[value='option2']").prop('checked'), true, 'checkbox should be checked');
    equal(component.$("[value='option1']").prop('checked'), false, 'checkbox should not be checked');
  });

  test("value should work even if the view is not in the DOM", function() {

    set(component, 'value', 'option1');

    equal(get(component, 'value'), 'option1', 'value should be set');
    equal(component.$("[value='option1']").prop('checked'), true, 'checkbox should be checked');
    equal(component.$("[value='option2']").prop('checked'), false, 'checkbox should not be checked');
  });

  test("should uncheck previous selection when new value is null", function() {

    set(component, 'value', null);

    equal(get(component, 'value'), null, 'value should be set');
    equal(component.$("[value='option1']").prop('checked'), false, 'checkbox should not be checked');
    equal(component.$("[value='option2']").prop('checked'), false, 'checkbox should not be checked');
  });

  test("value should update correctly after change event", function() {
    
    // Can't find a way to programatically trigger a checkbox in IE and have it generate the
    // same events as if a user actually clicks
    run(function() {
      var radio = component.$('[value="option1"]');
      if (jQuery.support.changeBubbles) {
        radio.click();
      } else {
        radio.trigger('click');
        radio.prop('checked', true).trigger('change');
      }
    });

    equal(get(component, 'value'), 'option1', 'value should be set');
    equal(component.$("[value='option1']").prop('checked'), true, 'checkbox should be checked');
    equal(component.$("[value='option2']").prop('checked'), false, 'checkbox should not be checked');
    
  });

  test("checked property is removed when value changes to an unknown value", function() {

    var button1 = component.$("[value='option1']");

    set(component, 'value', 'option1');
    equal(button1.prop('checked'), true, "option1 should be checked");

    set(component, 'value', 'foobar');
    equal(button1.prop('checked'), false, "option1 should not be checked");
  });
}
