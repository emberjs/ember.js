require('ember-routing');

var oldInjections, app;
var indexOf = Ember.ArrayPolyfills.indexOf;

module("Ember.Application injections", {
  setup: function() {
    oldInjections = Ember.Application.injections;
    Ember.Application.injections = Ember.A();
  },

  teardown: function() {
    Ember.Application.injections = oldInjections;

    if (app) {
      Ember.run(function() { app.destroy(); });
    }
  }
});

test("injections can be registered in a specified order", function() {
  var order = [];
  Ember.Application.registerInjection({
    name: 'fourth',
    after: 'third',
    injection: function(app, router, property) {
      if (property === 'order') order.push('fourth');
    }
  });

  Ember.Application.registerInjection({
    name: 'second',
    before: 'third',
    injection: function(app, router, property) {
      if (property === 'order') order.push('second');
    }
  });

  Ember.Application.registerInjection({
    name: 'fifth',
    after: 'fourth',
    injection: function(app, router, property) {
      if (property === 'order') order.push('fifth');
    }
  });

  Ember.Application.registerInjection({
    name: 'first',
    before: 'second',
    injection: function(app, router, property) {
      if (property === 'order') order.push('first');
    }
  });

  Ember.Application.registerInjection({
    name: 'third',
    injection: function(app, router, property) {
      if (property === 'order') order.push('third');
    }
  });

  Ember.run(function() {
    app = Ember.Application.create({
      router: false,
      order: order,
      rootElement: '#qunit-fixture'
    });
    app.initialize();
  });

  deepEqual(order, ['first', 'second', 'third', 'fourth', 'fifth']);

  Ember.run(function() {
    app.destroy();
  });
});

test("injections can have multiple dependencies", function () {
  var order = [],
      a = {
        name: "a",
        before: "b",
        injection: function(app, router, property) {
          if (property === 'order') order.push('a');
        }
      },
      b = {
        name: "b",
        injection: function(app, router, property) {
          if (property === 'order') order.push('b');
        }
      },
      c = {
        name: "c",
        after: "b",
        injection: function(app, router, property) {
          if (property === 'order') order.push('c');
        }
      },
      afterB = {
        name: "after b",
        after: "b",
        injection: function(app, router, property) {
          if (property === 'order') order.push("after b");
        }
      },
      afterC = {
        name: "after c",
        after: "c",
        injection: function(app, router, property) {
          if (property === 'order') order.push("after c");
        }
      };
  Ember.Application.registerInjection(b);
  Ember.Application.registerInjection(a);
  Ember.Application.registerInjection(afterC);
  Ember.Application.registerInjection(afterB);
  Ember.Application.registerInjection(c);

  Ember.run(function() {
    app = Ember.Application.create({
      router: false,
      order: order,
      rootElement: '#qunit-fixture'
    });
    app.initialize();
  });

  ok(indexOf.call(order, a.name) < indexOf.call(order, b.name), 'a < b');
  ok(indexOf.call(order, b.name) < indexOf.call(order, c.name), 'b < c');
  ok(indexOf.call(order, b.name) < indexOf.call(order, afterB.name), 'b < afterB');
  ok(indexOf.call(order, c.name) < indexOf.call(order, afterC.name), 'c < afterC');

  Ember.run(function() {
    app.destroy();
  });
});

test("injections are passed properties created from previous injections", function() {
  var secondInjectionWasPassedProperty = false;

  Ember.Application.registerInjection({
    name: 'first',
    injection: function(app, router, property) {
      app.set('foo', true);
    }
  });

  Ember.Application.registerInjection({
    name: 'second',
    after: 'first',
    injection: function(app, router, property) {
      if (property === 'foo') {
        secondInjectionWasPassedProperty = true;
      }
    }
  });

  Ember.run(function() {
    app = Ember.Application.create({
      router: false,
      rootElement: '#qunit-fixture'
    });
    app.initialize();
  });

  ok(secondInjectionWasPassedProperty, "second injections wasn't passed the property created in the first");

  Ember.run(function() {
    app.destroy();
  });
});

