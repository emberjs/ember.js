var get = Ember.get, getPath = Ember.getPath, set = Ember.set, group, rb, rb2, application;

var view, dispatcher;

var appendView = function() {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};

module("Ember.RadioButton", {
  setup: function() {
  },

  teardown: function() {
    if (view) {
      Ember.run(function() {
        view.destroy();
      });
      view = null;
    }
  }
});

test("setting selectedValue should update the checked property", function() {
  view = Ember.RadioButton.create({
    name: 'radio_button',
    value: 'tahoe'
  });

  appendView();

  strictEqual(view.$().prop('checked'), false, "precond - the element is not checked");
  strictEqual(get(view, "checked"), false, "precond - checked returns false");

  set(view, 'selectedValue', 'tahoe');

  ok(view.$().prop('checked'), "after clicking a radio button, the checked property changed in the DOM.");
  equal(get(view, "checked"), true, "after clicking a radio button, the checked property changed in the view.");
});

test("setting checked should update the selected value", function() {
  view = Ember.RadioButton.create({
    name: 'radio_button',
    value: 'tahoe'
  });

  appendView();

  Ember.run(function() {
    set(view, 'checked', true);
  });

  ok(view.$().prop('checked'), "checked attribute should be set");
  equal(get(view, 'selectedValue'), 'tahoe', 'selectedValue should be set');
});

module("Ember.RadioButtonGroup", {
  setup: function() {
    dispatcher = Ember.EventDispatcher.create();
    dispatcher.setup();
  },

  teardown: function() {
    Ember.run(function() {
      dispatcher.destroy();
    });

    if (view) {
      Ember.run(function() {
        view.destroy();
      });
      view = null;
    }
  }
});

test("value should update correctly", function() {
  view = Ember.RadioButtonGroup.create({
    name: 'testName',
    template: Ember.Handlebars.compile(
      '{{ view RadioButton value="option1" }}' +
      '{{ view RadioButton value="option2" }}'
    )
  });

  appendView();

  Ember.run(function() {
    set(view, 'value', 'option1');
  });

  equal(get(view, 'value'), 'option1', 'value should be set');
  equal(view.$("[value='option1']").prop('checked'), true, 'checkbox should be checked');
  equal(view.$("[value='option2']").prop('checked'), false, 'checkbox should not be checked');

  Ember.run(function() {
    set(view, 'value', 'option2');
  });

  equal(get(view, 'value'), 'option2', 'value should be set');
  equal(view.$("[value='option2']").prop('checked'), true, 'checkbox should be checked');
  equal(view.$("[value='option1']").prop('checked'), false, 'checkbox should not be checked');
});

test("value should work even if the view is not in the DOM", function() {
  view = Ember.RadioButtonGroup.create({
    name: 'testName',
    template: Ember.Handlebars.compile(
      '{{ view RadioButton value="option1" }}' +
      '{{ view RadioButton value="option2" }}'
    )
  });

  Ember.run(function() {
    set(view, 'value', 'option1');
  });

  appendView();

  equal(get(view, 'value'), 'option1', 'value should be set');
  equal(view.$("[value='option1']").prop('checked'), true, 'checkbox should be checked');
  equal(view.$("[value='option2']").prop('checked'), false, 'checkbox should not be checked');
});

test("should uncheck previous selection when new value is null", function() {
  view = Ember.RadioButtonGroup.create({
    value: 'option1',
    name: 'testName',
    template: Ember.Handlebars.compile(
      '{{ view RadioButton value="option1" }}' +
      '{{ view RadioButton value="option2" }}'
    )
  });

  appendView();

  Ember.run(function() {
    set(view, 'value', null);
  });

  equal(get(view, 'value'), null, 'value should be set');
  equal(view.$("[value='option1']").prop('checked'), false, 'checkbox should not be checked');
  equal(view.$("[value='option2']").prop('checked'), false, 'checkbox should not be checked');
});

test("value should update correctly after change event", function() {
  view = Ember.RadioButtonGroup.create({
    name: 'testName',
    template: Ember.Handlebars.compile(
      '{{ view RadioButton value="option1" }}' +
      '{{ view RadioButton value="option2" }}'
    )
  });

  appendView();

  var button = view.$("[value='option1']");

  // Can't find a way to programatically trigger a checkbox in IE and have it generate the
  // same events as if a user actually clicks.
  if (!Ember.$.browser.msie) {
    button[0].click();
  } else {
    button.trigger('click');
    button.prop('checked', true).trigger('change');
  }

  equal(get(view, 'value'), 'option1', 'value should be set');
  equal(view.$("[value='option1']").prop('checked'), true, 'checkbox should be checked');
  equal(view.$("[value='option2']").prop('checked'), false, 'checkbox should not be checked');
});

test("checked property is removed when value changes to an unknown value", function() {
  view = Ember.RadioButtonGroup.create({
    name: 'testName',
    template: Ember.Handlebars.compile(
      '{{ view RadioButton value="option1" }}' 
    )
  });

  appendView();

  var button1 = view.$("[value='option1']");

  Ember.run(function() {
    set(view, 'value', 'option1');
  });
  equal(button1.prop('checked'), true, "option1 should be checked");

  Ember.run(function() {
    set(view, 'value', 'foobar');
  });

  equal(button1.prop('checked'), false, "option1 should not be checked");
});
