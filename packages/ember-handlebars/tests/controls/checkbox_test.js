var get = Ember.get, set = Ember.set,
    isInternetExplorer = window.navigator.userAgent.match(/msie/i),
    checkboxView, dispatcher;

module("Ember.Checkbox", {
  setup: function() {
    dispatcher = Ember.EventDispatcher.create();
    dispatcher.setup();
  },
  teardown: function() {
    Ember.run(function() {
      dispatcher.destroy();
      checkboxView.destroy();
    });
  }
});

function setAndFlush(view, key, value) {
  Ember.run(function() {
    Ember.set(view, key, value);
  });
}

function append() {
  Ember.run(function() {
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

  Ember.run(function() { checkboxView.set('disabled', true); });
  ok(checkboxView.$().is(":disabled"));

  Ember.run(function() { checkboxView.set('disabled', false); });
  ok(checkboxView.$().is(":not(:disabled)"));
});

test("should support the tabindex property", function() {
  checkboxView = Ember.Checkbox.create({});

  Ember.run(function() { checkboxView.set('tabindex', 6); });
  append();

  equal(checkboxView.$().prop('tabindex'), '6', 'the initial checkbox tabindex is set in the DOM');

  Ember.run(function() { checkboxView.set('tabindex', 3); });
  equal(checkboxView.$().prop('tabindex'), '3', 'the checkbox tabindex changes when it is changed in the view');
});


test("checked property mirrors input value", function() {
  checkboxView = Ember.Checkbox.create({});
  Ember.run(function() { checkboxView.append(); });

  equal(get(checkboxView, 'checked'), false, "initially starts with a false value");
  equal(!!checkboxView.$().prop('checked'), false, "the initial checked property is false");

  setAndFlush(checkboxView, 'checked', true);

  equal(checkboxView.$().prop('checked'), true, "changing the value property changes the DOM");

  Ember.run(function() { checkboxView.remove(); });
  Ember.run(function() { checkboxView.append(); });

  equal(checkboxView.$().prop('checked'), true, "changing the value property changes the DOM");

  Ember.run(function() { checkboxView.remove(); });
  Ember.run(function() { set(checkboxView, 'checked', false); });
  Ember.run(function() { checkboxView.append(); });

  equal(checkboxView.$().prop('checked'), false, "changing the value property changes the DOM");
});

test("checking the checkbox updates the value", function() {
  checkboxView = Ember.Checkbox.create({ checked: true });
  Ember.run(function() { checkboxView.appendTo('#qunit-fixture'); });

  equal(get(checkboxView, 'checked'), true, "precond - initially starts with a true value");
  equal(!!checkboxView.$().prop('checked'), true, "precond - the initial checked property is true");

  // Can't find a way to programatically trigger a checkbox in IE and have it generate the
  // same events as if a user actually clicks.
  if (!isInternetExplorer) {
    checkboxView.$()[0].click();
  } else {
    checkboxView.$().trigger('click');
    checkboxView.$().removeAttr('checked').trigger('change');
  }

  equal(!!checkboxView.$().prop('checked'), false, "after clicking a checkbox, the checked property changed");
  equal(get(checkboxView, 'checked'), false, "changing the checkbox causes the view's value to get updated");
});
