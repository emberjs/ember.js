module("Ember.Component");

var Component = Ember.Component.extend();

test("The context of an Ember.Component is itself", function() {
  var control = Component.create();
  strictEqual(control, control.get('context'), "A control's context is itself");
});

test("The controller (target of `action`) of an Ember.Component is itself", function() {
  var control = Component.create();
  strictEqual(control, control.get('controller'), "A control's controller is itself");
});
