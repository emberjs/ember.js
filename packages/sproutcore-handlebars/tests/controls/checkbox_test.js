// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get, set = SC.set, checkboxView, application;

module("SC.Checkbox", {
  setup: function() {
    application = SC.Application.create();

    // force setup since document may not be ready yet.
    get(application, 'eventDispatcher').setup();
  },
  teardown: function() {
    checkboxView.destroy();
    application.destroy();
  }
});

function setAndFlush(view, key, value) {
  SC.run(function() {
    SC.set(view, key, value);
  });
}

test("value property mirrors input value", function() {
  checkboxView = SC.Checkbox.create({});
  SC.run(function() { checkboxView.append(); });

  equals(get(checkboxView, 'value'), false, "initially starts with a false value");
  equals(!!checkboxView.$('input').prop('checked'), false, "the initial checked property is false");

  setAndFlush(checkboxView, 'value', true);

  equals(checkboxView.$('input').prop('checked'), true, "changing the value property changes the DOM");

  checkboxView.remove();
  SC.run(function() { checkboxView.append(); });

  equals(checkboxView.$('input').prop('checked'), true, "changing the value property changes the DOM");

  SC.run(function() { checkboxView.remove(); });
  SC.run(function() { set(checkboxView, 'value', false); });
  SC.run(function() { checkboxView.append(); });

  equals(checkboxView.$('input').prop('checked'), false, "changing the value property changes the DOM");
});

test("value property mirrors input value", function() {
  checkboxView = SC.Checkbox.create({ value: true });
  SC.run(function() { checkboxView.append(); });

  equals(get(checkboxView, 'value'), true, "precond - initially starts with a true value");
  equals(!!checkboxView.$('input').prop('checked'), true, "the initial checked property is true");

  setAndFlush(checkboxView, 'value', false);

  equals(!!checkboxView.$('input').prop('checked'), false, "changing the value property changes the DOM");

  SC.run(function() { checkboxView.remove(); });
  SC.run(function() { checkboxView.append(); });

  equals(checkboxView.$('input').prop('checked'), false, "changing the value property changes the DOM");

  SC.run(function() { checkboxView.remove(); });
  setAndFlush(checkboxView, 'value', true);
  SC.run(function() { checkboxView.append(); });

  equals(checkboxView.$('input').prop('checked'), true, "changing the value property changes the DOM");
});

test("checking the checkbox updates the value", function() {
  checkboxView = SC.Checkbox.create({ value: true });
  SC.run(function() { checkboxView.append(); });

  equals(get(checkboxView, 'value'), true, "precond - initially starts with a true value");
  equals(checkboxView.$('input').prop('checked'), true, "precond - the initial checked property is true");

  // click will trigger change event. can't call change event directly because that won't modify the checkbox's value.
  checkboxView.$('input').click();

  equals(checkboxView.$('input').prop('checked'), false, "after clicking a checkbox, the checked property changed");
  equals(get(checkboxView, 'value'), false, "changing the checkbox causes the view's value to get updated");
});

