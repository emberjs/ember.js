var get = Ember.get, getPath = Ember.getPath, set = Ember.set, group, rb, rb2, application;

var msie = window.jQuery && window.jQuery.browser.msie;

function setAndFlush(obj, key, value) {
  Ember.run(function() {
    set(obj, key, value);
  });
}

module("Ember.RadioButton", {
  setup: function() {
    application = Ember.Application.create();
    group = Ember.RadioButtonGroup.create();
    rb = Ember.RadioButton.create();
  },

  teardown: function() {
    rb.destroy();
    if(rb2) rb2.destroy();
    if(group) group.destroy();
    application.destroy();
  }
});

function append(v) {
  Ember.run(function() {
    v.appendTo('#qunit-fixture');
  });
}

test("should have the class 'ember-radio-button'", function() {
  rb.createElement();

  ok(rb.$().hasClass("ember-radio-button"));
});

test("#isDisabled by default returns false", function() {
  strictEqual(get(rb, "isDisabled"), false);
  rb.createElement();

  ok(rb.$().is(":not(:disabled)"));
});

test("#isDisabled= propogates changes to the disabled property on the element once inserted", function() {
  rb.createElement();

  setAndFlush(rb, "isDisabled", true);
  ok(rb.$().is(":disabled"), "the element became disabled when set to 'true'");

  setAndFlush(rb, "isDisabled", false);
  ok(rb.$().is(":not(:disabled)"));
});

test("#isSelected by default returns false", function() {
  strictEqual(get(rb, "isSelected"), false, "it returns false");
});

test("when #isSelected is false at render-time, the element 'checked' property should be false", function() {
  strictEqual(get(rb, "isSelected"), false, "precond - isSelected returns false");

  append(rb);
  strictEqual(rb.$().is(":checked"), false, "the element is not checked");
});

test("when #isSelected is true at render-time, the element 'checked' property should be true", function() {
  setAndFlush(rb, "isSelected", true);
  strictEqual(get(rb, "isSelected"), true, "precond - isSelected returns true");

  append(rb);
  strictEqual(rb.$().is(":checked"), true, "the element is checked");
});

test("#isSelected= when the element is in the DOM updates the element's 'checked' property accordingly", function() {
  append(rb);

  strictEqual(rb.$().is(":checked"), false, "precond - the element is not checked");
  setAndFlush(rb, "isSelected", true);
  strictEqual(rb.$().is(":checked"), true, "changing from false to true works");

  strictEqual(rb.$().is(":checked"), true, "precond - the element is checked");
  setAndFlush(rb, "isSelected", false);
  strictEqual(rb.$().is(":checked"), false, "changing from true to false works");
});

test("listens for user interaction and updates the 'isSelected' properly accordingly on the view", function() {
  append(rb);

  strictEqual(rb.$().is(":checked"), false, "precond - the element is not checked");
  strictEqual(get(rb, "isSelected"), false, "precond - isSelected returns false");

  // Can't find a way to programatically trigger a checkbox in IE and have it generate the
  // same events as if a user actually clicks.
  if (!msie) {
    rb.$()[0].click();
  } else {
    rb.$().trigger('click');
    rb.$().removeProp('checked').trigger('change');
  }

  ok(rb.$().is(":checked"), "after clicking a radio button, the checked property changed in the DOM.");
  equal(get(rb, "isSelected"), true, "after clicking a radio button, the isSelected property changed in the view.");
});

test("#group by default returns false", function() {
  strictEqual(get(rb, "group"), null, "it returns null");
});

test("#group= passed an Ember.RadioButtonGroup associates the radio button with the group", function() {
  equal(get(group, "numRadioButtons"), 0, "precond - the group has no radio buttons");

  rb2 = Ember.RadioButton.create({ group: group });
  ok(get(group, "_radioButtons").contains(rb2), "it works if group is set when instantiated");

  setAndFlush(rb, "group", group);
  ok(get(group, "_radioButtons").contains(rb), "it works using the setter");
});

test("#group= when the button is in a group and null is passed removes the radio button from the group", function() {
  setAndFlush(rb, "group", group);
  ok(get(group, "_radioButtons").contains(rb), "precond - the radio button is associated with the group");

  setAndFlush(rb, "group", null);
  ok(!get(group, "_radioButtons").contains(rb), "the radio button was removed from the group");
});

test("#group= when the button is selected and an Ember.RadioButtonGroup is passed the button becomes the group's selection", function() {
  equal(get(group, "numRadioButtons"), 0, "precond - the group has no radio buttons");

  rb2 = Ember.RadioButton.create({ group: group });
  ok(get(group, "_radioButtons").contains(rb2), "it works if group is set when instantiated");

  setAndFlush(rb, "group", group);
  ok(get(group, "_radioButtons").contains(rb), "it works using the setter");
});

module("Ember.RadioButtonGroup", {
  setup: function() {
    application = Ember.Application.create();
    group = Ember.RadioButtonGroup.create();
    rb = Ember.RadioButton.create();
    rb2 = Ember.RadioButton.create();
  },

  teardown: function() {
    rb.destroy();
    rb2.destroy();
    group.destroy();
    application.destroy();
  }
});

test("#numRadioButtons returns the number of radio buttons that belong to the group.", function() {
  equal(get(group, "numRadioButtons"), 0);

  group._addRadioButton(rb);
  equal(get(group, "numRadioButtons"), 1);

  group._addRadioButton(rb2);
  equal(get(group, "numRadioButtons"), 2);

  group._removeRadioButton(rb);
  equal(get(group, "numRadioButtons"), 1);
});

test("#selectedValue when there is no selection returns null", function() {
  strictEqual(get(group, "selection"), null, "precond - the group has no selection");
  strictEqual(get(group, "selectedValue"), null, "selectedValue is null");
});

test("#selectedValue when there is a selection returns its value", function() {
  var someValue = { foo: "bar" },
      selectedButton = Ember.RadioButton.create({ isSelected: true, group: group, value: someValue });

  strictEqual(get(group, "selection"), selectedButton, "precond - the group has a selection");
  strictEqual(get(group, "selectedValue"), someValue, "selectedValue returned the value of the selected button");
});

test("#selectedValue changes when the selection changes", function() {
  var originalValue = { baz: "bar" },
      newValue      = { foo: "bar" },
      originalSelection = Ember.RadioButton.create({ isSelected: true,  group: group, value: originalValue }),
      deselectedButton  = Ember.RadioButton.create({ isSelected: false, group: group, value: newValue });

  strictEqual(get(group, "selection"), originalSelection, "precond - the group has a selection");
  strictEqual(get(group, "selectedValue"), originalValue, "precond - selectedValue returned the value of the selected button");

  setAndFlush(deselectedButton, "isSelected", true);

  strictEqual(get(group, "selection"), deselectedButton, "precond - the selection changed");
  strictEqual(get(group, "selectedValue"), newValue, "selectedValue returned the correct value");
});

test("#selectedValue= passed a non-null value changes the selection to the radio button with that value", function() {
  var originalValue = { baz: "bar" },
      newValue      = { foo: "bar" },
      originalSelection = Ember.RadioButton.create({ isSelected: true,  group: group, value: originalValue }),
      deselectedButton  = Ember.RadioButton.create({ isSelected: false, group: group, value: newValue });

  strictEqual(get(group, "selection"), originalSelection, "precond - the group has a selection");
  strictEqual(get(group, "selectedValue"), originalValue, "precond - selectedValue returned the value of the selected button");

  setAndFlush(group, "selectedValue", newValue);

  strictEqual(get(group, "selection"), deselectedButton, "the selection changed");
  strictEqual(get(group, "selectedValue"), newValue, "selectedValue returned the correct value");
});

test("#selection when the group has no radio buttons returns null", function() {
  equal(get(group, "numRadioButtons"), 0, "precond - the group has no radio buttons");
  strictEqual(get(group, "selection"), null, "#selection returns null");
});

test("#selection when the group has radio buttons but none are selected returns null", function() {
  group._addRadioButton(rb);
  equal(get(group, "numRadioButtons"), 1, "precond - the group has radio buttons");
  strictEqual(get(rb, "isSelected"), false, "precond - no radio buttons are selected");
  strictEqual(get(group, "selection"), null, "#selection returns null");
});

test("#selection when the group has radio buttons and one is selected returns the selected radio button", function() {
  var selectedButton = Ember.RadioButton.create({ isSelected: true, group: group });
  equal(get(group, "numRadioButtons"), 1, "precond - the group has radio buttons");
  strictEqual(get(selectedButton, "isSelected"), true, "precond - a radio button is selected");
  strictEqual(get(group, "selection"), selectedButton, "#selection returns the selected radio button");
});

test("#selection becomes null when the selected radio button is removed from the group", function() {
  var originalSelection = Ember.RadioButton.create({ isSelected: true,  group: group });

  strictEqual(get(group, "selection"), originalSelection, "precond - the group has a selection");

  setAndFlush(originalSelection, "group", null);

  strictEqual(get(group, "selection"), null, "the selection changed to null");
  strictEqual(get(originalSelection, "isSelected"), true, "the 'isSelected' property on the did not change");
});

test("#selection will automatically change to radio buttons that are selected when joining the group", function() {
  var originalSelection = Ember.RadioButton.create({ isSelected: true,  group: group }), newAddition;

  strictEqual(get(group, "selection"), originalSelection, "precond - the group has a selection");

  newAddition = Ember.RadioButton.create({ isSelected: true,  group: group });

  strictEqual(get(group, "selection"), newAddition, "the selection changed to the new button");
  strictEqual(get(originalSelection, "isSelected"), false, "the 'isSelected' property on the previous selection changed from true to false");
});

test("#selection= passed anything other than null or an instance of Ember.RadioButton raises an error", function() {
  raises(function() {
    set(group, "selection", "foo");
  });
});

test("#selection= passed an Ember.RadioButton that isn't part of the group raises an error", function() {
  raises(function() {
    set(group, "selection", rb);
  });
});

test("#selection= sets the 'isSelected' property to true on the new selection", function() {
  var deselectedButton = Ember.RadioButton.create({ isSelected: false, group: group});

  setAndFlush(group, "selection", deselectedButton);
  strictEqual(get(group, "selection"), deselectedButton, "the change was successful");
  strictEqual(get(deselectedButton, "isSelected"), true, "the 'isSelected' property on the button changed from false to true");
});

test("#selection= sets the 'isSelected' property to false on the old selection", function() {
  var originalSelection = Ember.RadioButton.create({ isSelected: true,  group: group }),
      deselectedButton  = Ember.RadioButton.create({ isSelected: false, group: group });

  setAndFlush(group, "selection", deselectedButton);

  strictEqual(get(group, "selection"), deselectedButton, "the change was successful");
  strictEqual(get(originalSelection, "isSelected"), false, "the 'isSelected' property on the old selection changed from true to false");
});

test("#selection= when a selection exists and null was passed deselects the previous selection", function() {
  var originalSelection = Ember.RadioButton.create({ isSelected: true,  group: group });

  setAndFlush(group, "selection", null);

  strictEqual(get(group, "selection"), null, "precond - the change was successful");
  strictEqual(get(originalSelection, "isSelected"), false, "the 'isSelected' property on the button changed from true to false");
});

test("watches for changes to 'isSelected' on the radio buttons and updates the selection accordingly", function() {
  var originalSelection = Ember.RadioButton.create({ isSelected: true,  group: group }),
      deselectedButton  = Ember.RadioButton.create({ isSelected: false, group: group });

  setAndFlush(deselectedButton, "isSelected", true);

  strictEqual(get(group, "selection"), deselectedButton, "setting 'isSelected' to true on a deselected button changes the selection to it");
  strictEqual(get(originalSelection, "isSelected"), false, "the original selection was deselected");

  setAndFlush(deselectedButton, "isSelected", false);

  strictEqual(get(group, "selection"), null, "setting 'isSelected' on the selection to false changes the selection to null");
});

test("RadioButtonGroup as a view", function() {
  group = Ember.RadioButtonGroup.create({
    name: 'testName',
    template: Ember.Handlebars.compile(
      '{{ view RadioButton value="option1" }}' +
      '{{ view RadioButton value="option2" }}'
    )
  });

  append(group);

  var option1 = group.buttonForValue('option1');
  var option2 = group.buttonForValue('option2');

  equal(option1.$().attr('name'), 'testName');
  equal(option1.$().val(), 'option1');
  equal(get(option1, 'group'), group);

  equal(option2.$().attr('name'), 'testName');
  equal(option2.$().val(), 'option2');
  equal(get(option2, 'group'), group);
});

test("selectedValue works even if the view is not in the DOM", function() {
  group = Ember.RadioButtonGroup.create({
    name: 'testName',
    template: Ember.Handlebars.compile(
      '{{ view RadioButton value="option1" }}' +
      '{{ view RadioButton value="option2" }}'
    )
  });

  set(group, 'selectedValue', 'option1');

  append(group);

  equal(get(group, 'selectedValue'), 'option1', 'selectedValue should be set');

  console.log('FOOBAR');
  equal(group.$("[value='option1']").attr('checked'), 'checked', 'checkbox should be checked');
});
