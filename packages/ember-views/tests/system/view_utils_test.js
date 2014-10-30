import run from "ember-metal/run_loop";
import View from "ember-views/views/view";

var view;

QUnit.module("ViewUtils", {
  teardown: function() {
    run(function() {
      if (view) { view.destroy(); }
    });
  }
});

test("getViewClientRects", function() {
  if (!(window.Range && window.Range.prototype.getClientRects)) {
    ok(true, "The test environment does not support the DOM API required for getViewClientRects.");
    return;
  }

  view = View.create({
    render: function(buffer) {
      buffer.push("Hello, world!");
    }
  });

  run(function() { view.appendTo('#qunit-fixture'); });

  ok(Ember.ViewUtils.getViewClientRects(view) instanceof window.ClientRectList);
});

test("getViewBoundingClientRect", function() {
  if (!(window.Range && window.Range.prototype.getBoundingClientRect)) {
    ok(true, "The test environment does not support the DOM API required for getViewBoundingClientRect.");
    return;
  }

  view = View.create({
    render: function(buffer) {
      buffer.push("Hello, world!");
    }
  });

  run(function() { view.appendTo('#qunit-fixture'); });

  ok(Ember.ViewUtils.getViewBoundingClientRect(view) instanceof window.ClientRect);
});
