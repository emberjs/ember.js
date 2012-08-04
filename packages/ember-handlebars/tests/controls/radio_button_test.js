var get = Ember.get, getPath = Ember.getPath, set = Ember.set, group, rb, rb2, application;

var view;

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

  strictEqual(view.$().is(":checked"), false, "precond - the element is not checked");
  strictEqual(get(view, "isChecked"), false, "precond - isChecked returns false");

  set(view, 'selectedValue', 'tahoe');

  ok(view.$().is(":checked"), "after clicking a radio button, the checked property changed in the DOM.");
  equal(get(view, "isChecked"), true, "after clicking a radio button, the isChecked property changed in the view.");
});

test("setting isChecked should update the selected value", function() {
  view = Ember.RadioButton.create({
    name: 'radio_button',
    value: 'tahoe'
  });

  appendView();

  Ember.run(function() {
    set(view, 'isChecked', true);
  });

  ok(view.$().is(":checked"), "checked attribute should be set");
  equal(get(view, 'selectedValue'), 'tahoe', 'selectedValue should be set');
});

module("Ember.RadioButtonGroup", {
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
  equal(view.$("[value='option1']").attr('checked'), 'checked', 'checkbox should be checked');
  equal(view.$("[value='option2']").attr('checked'), null, 'checkbox should not be checked');
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
  equal(view.$("[value='option1']").attr('checked'), 'checked', 'checkbox should be checked');
  equal(view.$("[value='option2']").attr('checked'), null, 'checkbox should not be checked');
});
