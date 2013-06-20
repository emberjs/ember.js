module("Ember.Control");

var Control = Ember.Control.extend();

test("The context of an Ember.Control is itself", function() {
  var control = Control.create();
  strictEqual(control, control.get('context'), "A control's context is itself");
});

test("The controller (target of `action`) of an Ember.Control is itself", function() {
  var control = Control.create();
  strictEqual(control, control.get('controller'), "A control's controller is itself");
});
