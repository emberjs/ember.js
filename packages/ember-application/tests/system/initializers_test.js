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

test("initializers set on Application subclasses should not be shared between apps", function(){
  var firstInitializerRunCount = 0, secondInitializerRunCount = 0;
  var FirstApp = Ember.Application.extend();
  FirstApp.initializer({
    name: 'first',
    initialize: function(container) {
      firstInitializerRunCount++;
    }
  });
  var SecondApp = Ember.Application.extend();
  SecondApp.initializer({
    name: 'second',
    initialize: function(container) {
      secondInitializerRunCount++;
    }
  });
  Ember.$('#qunit-fixture').html('<div id="first"></div><div id="second"></div>');
  Ember.run(function() {
    var firstApp = FirstApp.create({
      router: false,
      rootElement: '#qunit-fixture #first'
    });
  });
  equal(firstInitializerRunCount, 1, 'first initializer only was run');
  equal(secondInitializerRunCount, 0, 'first initializer only was run');
  Ember.run(function() {
    var secondApp = SecondApp.create({
      router: false,
      rootElement: '#qunit-fixture #second'
    });
  });
  equal(firstInitializerRunCount, 1, 'second initializer only was run');
  equal(secondInitializerRunCount, 1, 'second initializer only was run');
});
