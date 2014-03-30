module('Ember.Controller event handling');

test("Action can be handled by a function on actions object", function() {
  expect(1);
  var TestController = Ember.Controller.extend({
    actions: {
      poke: function() {
        ok(true, 'poked');
      }
    }
  });
  var controller = TestController.create({});
  controller.send("poke");
});

// TODO: Can we support this?
// test("Actions handlers can be configured to use another name", function() {
//   expect(1);
//   var TestController = Ember.Controller.extend({
//     actionsProperty: 'actionHandlers',
//     actionHandlers: {
//       poke: function() {
//         ok(true, 'poked');
//       }
//     }
//   });
//   var controller = TestController.create({});
//   controller.send("poke");
// });

test("When `_actions` is provided, `actions` is left alone", function() {
  expect(2);
  var TestController = Ember.Controller.extend({
    actions: ['foo', 'bar'],
    _actions: {
      poke: function() {
        ok(true, 'poked');
      }
    }
  });
  var controller = TestController.create({});
  controller.send("poke");
  equal('foo', controller.get("actions")[0], 'actions property is not untouched');
});

test("Actions object doesn't shadow a proxied object's 'actions' property", function() {
  var TestController = Ember.ObjectController.extend({
    content: {
      actions: 'foo'
    },
    actions: {
      poke: function() {
        console.log('ouch');
      }
    }
  });
  var controller = TestController.create({});
  equal(controller.get("actions"), 'foo', "doesn't shadow the content's actions property");
});

test("A handled action can be bubbled to the target for continued processing", function() {
  expect(2);
  var TestController = Ember.Controller.extend({
    actions: {
      poke: function() {
        ok(true, 'poked 1');
        return true;
      }
    }
  });

  var controller = TestController.create({
    target: Ember.Controller.extend({
      actions: {
        poke: function() {
          ok(true, 'poked 2');
        }
      }
    }).create()
  });
  controller.send("poke");
});

test("Action can be handled by a superclass' actions object", function() {
  expect(4);

  var SuperController = Ember.Controller.extend({
    actions: {
      foo: function() {
        ok(true, 'foo');
      },
      bar: function(msg) {
        equal(msg, "HELLO");
      }
    }
  });

  var BarControllerMixin = Ember.Mixin.create({
    actions: {
      bar: function(msg) {
        equal(msg, "HELLO");
        this._super(msg);
      }
    }
  });

  var IndexController = SuperController.extend(BarControllerMixin, {
    actions: {
      baz: function() {
        ok(true, 'baz');
      }
    }
  });

  var controller = IndexController.create({});
  controller.send("foo");
  controller.send("bar", "HELLO");
  controller.send("baz");
});

module('Ember.Controller deprecations');

if (!Ember.FEATURES.isEnabled('ember-routing-drop-deprecated-action-style')) {
  test("Action can be handled by method directly on controller (DEPRECATED)", function() {
    expectDeprecation(/Action handlers implemented directly on controllers are deprecated/);
    var TestController = Ember.Controller.extend({
      poke: function() {
        ok(true, 'poked');
      }
    });
    var controller = TestController.create({});
    controller.send("poke");
  });
}
