module("ember-states removal");

test("errors occur when attempting to use Ember.StateManager or Ember.State", function() {
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