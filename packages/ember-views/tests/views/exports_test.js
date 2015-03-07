import Ember from "ember-views";

QUnit.module("ember-view exports");

QUnit.test("should export a disabled CoreView", function() {
  expectDeprecation(function() {
    Ember.CoreView.create();
  }, 'Ember.CoreView is deprecated. Please use Ember.View.');
});
