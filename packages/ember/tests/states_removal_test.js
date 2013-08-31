module("ember-states removal");

var defineProperty = Ember.platform.defineProperty;

test("errors occur when attempting to use Ember.StateManager or Ember.State", function() {
  if (defineProperty && defineProperty.isSimulated) {
    ok("Skipping this test as it requires a real Object.defineProperty");
    return;
  }

  raises(function() {
    Ember.StateManager.extend();
  }, /has been moved into a plugin/);

  raises(function() {
    Ember.State.extend();
  }, /has been moved into a plugin/);

    raises(function() {
    Ember.StateManager.create();
  }, /has been moved into a plugin/);

  raises(function() {
    Ember.State.create();
  }, /has been moved into a plugin/);
});