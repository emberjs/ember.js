import Ember from "ember-metal/core"; // Ember.K
import run from "ember-metal/run_loop";
import Adapter from "ember-testing/adapters/adapter";

var adapter;

module("ember-testing Adapter", {
  setup: function() {
    adapter = new Adapter();
  },
  teardown: function() {
    run(adapter, adapter.destroy);
  }
});

test("asyncStart is a noop", function() {
  equal(adapter.asyncStart, Ember.K);
});

test("asyncEnd is a noop", function() {
  equal(adapter.asyncEnd, Ember.K);
});

test("exception throws", function() {
  var error = "Hai", thrown;
  try {
    adapter.exception(error);
  } catch (e) {
    thrown = e;
  }
  equal(thrown, error);
});
