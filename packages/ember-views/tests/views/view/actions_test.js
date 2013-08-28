var set = Ember.set, get = Ember.get, view;

module("Ember.View action handling", {
  teardown: function() {
    Ember.run(function() {
      if (view) { view.destroy(); }
    });
  }
});

test("Action can be handled by a function on actions object", function() {
  expect(1);
  view = Ember.View.extend({
    actions: {
      poke: function() {
        ok(true, 'poked');
      }
    }
  }).create();
  view.send("poke");
});

test("Action can be handled by a function on the view (DEPRECATED)", function() {
  Ember.TESTING_DEPRECATION = true;
  expect(1);
  view = Ember.View.extend({
    poke: function() {
      ok(true, 'poked');
      Ember.TESTING_DEPRECATION = true;
    }
  }).create();
  view.send("poke");
});

test("A handled action can be bubbled to the target for continued processing", function() {
  expect(2);
  view = Ember.View.extend({
    actions: {
      poke: function() {
        ok(true, 'poked 1');
        return true;
      }
    },
    target: Ember.Controller.extend({
      actions: {
        poke: function() {
          ok(true, 'poked 2');
        }
      }
    }).create()
  }).create();
  view.send("poke");
});

test("Action can be handled by a superclass' actions object", function() {
  expect(4);

  var SuperView = Ember.View.extend({
    actions: {
      foo: function() {
        ok(true, 'foo');
      },
      bar: function(msg) {
        equal(msg, "HELLO");
      }
    }
  });

  var BarViewMixin = Ember.Mixin.create({
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

test("Actions cannot be provided at create time", function() {
  expectAssertion(function() {
    view = Ember.View.create({
      actions: {
        foo: function() {
          ok(true, 'foo');
        }
      }
    });
  });
  // but should be OK on an object that doesn't mix in Ember.ActionHandler
  var obj = Ember.Object.create({
    actions: ['foo']
  });
});


