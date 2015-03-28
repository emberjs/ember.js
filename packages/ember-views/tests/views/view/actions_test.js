import run from "ember-metal/run_loop";
import { Mixin } from "ember-metal/mixin";
import Controller from "ember-runtime/controllers/controller";
import EmberObject from "ember-runtime/system/object";
import View from "ember-views/views/view";

var view;

QUnit.module("View action handling", {
  teardown: function() {
    run(function() {
      if (view) { view.destroy(); }
    });
  }
});

QUnit.test("Action can be handled by a function on actions object", function() {
  expect(1);
  view = View.extend({
    actions: {
      poke: function() {
        ok(true, 'poked');
      }
    }
  }).create();
  view.send("poke");
});

QUnit.test("A handled action can be bubbled to the target for continued processing", function() {
  expect(2);
  view = View.extend({
    actions: {
      poke: function() {
        ok(true, 'poked 1');
        return true;
      }
    },
    target: Controller.extend({
      actions: {
        poke: function() {
          ok(true, 'poked 2');
        }
      }
    }).create()
  }).create();
  view.send("poke");
});

QUnit.test("Action can be handled by a superclass' actions object", function() {
  expect(4);

  var SuperView = View.extend({
    actions: {
      foo: function() {
        ok(true, 'foo');
      },
      bar: function(msg) {
        equal(msg, "HELLO");
      }
    }
  });

  var BarViewMixin = Mixin.create({
    actions: {
      bar: function(msg) {
        equal(msg, "HELLO");
        this._super(msg);
      }
    }
  });

  var IndexView = SuperView.extend(BarViewMixin, {
    actions: {
      baz: function() {
        ok(true, 'baz');
      }
    }
  });

  view = IndexView.create();
  view.send("foo");
  view.send("bar", "HELLO");
  view.send("baz");
});

QUnit.test("Actions cannot be provided at create time", function() {
  expectAssertion(function() {
    view = View.create({
      actions: {
        foo: function() {
          ok(true, 'foo');
        }
      }
    });
  });
  // but should be OK on an object that doesn't mix in Ember.ActionHandler
  EmberObject.create({
    actions: ['foo']
  });
});


