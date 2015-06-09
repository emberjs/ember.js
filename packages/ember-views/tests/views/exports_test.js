import Ember from "ember-views";

let originalSupport;

QUnit.module("ember-view exports", {
  setup() {
    originalSupport = Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT;
  },
  teardown() {
    Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT = originalSupport;
  }
});

QUnit.test("should export a deprecated CoreView", function() {
  expectDeprecation(function() {
    Ember.CoreView.create();
  }, 'Ember.CoreView is deprecated. Please use Ember.View.');
});

QUnit.test("should export a deprecated View", function() {
  expectDeprecation(function() {
    Ember.View.create();
  }, /Ember.View is deprecated/);
});

QUnit.test("when legacy view support is enabled, Ember.View does not have deprecation", function() {
  Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT = true;

  expectNoDeprecation(function() {
    Ember.View.create();
  });
});
