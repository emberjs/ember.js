var oldInitializers, app;
var indexOf = Ember.ArrayPolyfills.indexOf;

module("Ember.Application initializers", {
  setup: function() {
    oldInitializers = Ember.Application.initializers;
    Ember.Application.initializers = Ember.A();
  },

  teardown: function() {
    Ember.Application.initializers = oldInitializers;

    if (app) {
      Ember.run(function() { app.destroy(); });
    }
  }
});

test("initializers can be registered in a specified order", function() {
  var order = [];
  Ember.Application.initializer({
    name: 'fourth',
    after: 'third',
    initialize: function(container) {
      order.push('fourth');
    }
  });

  Ember.Application.initializer({
    name: 'second',
    before: 'third',
    initialize: function(container) {
      order.push('second');
    }
  });

  Ember.Application.initializer({
    name: 'fifth',
    after: 'fourth',
    initialize: function(container) {
      order.push('fifth');
    }
  });

  Ember.Application.initializer({
    name: 'first',
    before: 'second',
    initialize: function(container) {
      order.push('first');
    }
  });

  Ember.Application.initializer({
    name: 'third',
    initialize: function(container) {
      order.push('third');
    }
  });

  Ember.run(function() {
    app = Ember.Application.create({
      router: false,
      rootElement: '#qunit-fixture'
    });
  });

  deepEqual(order, ['first', 'second', 'third', 'fourth', 'fifth']);

  Ember.run(function() {
    app.destroy();
  });
});

test("initializers can have multiple dependencies", function () {
  var order = [],
      a = {
        name: "a",
        before: "b",
        initialize: function(container) {
          order.push('a');
        }
      },
      b = {
        name: "b",
        initialize: function(container) {
          order.push('b');
        }
      },
      c = {
        name: "c",
        after: "b",
        initialize: function(container) {
          order.push('c');
        }
      },
      afterB = {
        name: "after b",
        after: "b",
        initialize: function(container) {
          order.push("after b");
        }
      },
      afterC = {
        name: "after c",
        after: "c",
        initialize: function(container) {
          order.push("after c");
        }
      };
  Ember.Application.initializer(b);
  Ember.Application.initializer(a);
  Ember.Application.initializer(afterC);
  Ember.Application.initializer(afterB);
  Ember.Application.initializer(c);

  Ember.run(function() {
    app = Ember.Application.create({
      router: false,
      rootElement: '#qunit-fixture'
    });
  });

  ok(indexOf.call(order, a.name) < indexOf.call(order, b.name), 'a < b');
  ok(indexOf.call(order, b.name) < indexOf.call(order, c.name), 'b < c');
  ok(indexOf.call(order, b.name) < indexOf.call(order, afterB.name), 'b < afterB');
  ok(indexOf.call(order, c.name) < indexOf.call(order, afterC.name), 'c < afterC');

  Ember.run(function() {
    app.destroy();
  });
});

