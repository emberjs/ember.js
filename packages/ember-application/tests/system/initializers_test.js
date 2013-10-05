var oldInitializers, app;
var indexOf = Ember.ArrayPolyfills.indexOf;

module("Ember.Application initializers", {
  setup: function() {
  },

  teardown: function() {
    if (app) {
      Ember.run(function() { app.destroy(); });
    }
  }
});

test("initializers can be registered in a specified order", function() {
  var order = [];
  var Application = Ember.Application.extend();
  Application.initializer({
    name: 'fourth',
    after: 'third',
    initialize: function(container) {
      order.push('fourth');
    }
  });

  Application.initializer({
    name: 'second',
    before: 'third',
    initialize: function(container) {
      order.push('second');
    }
  });

  Application.initializer({
    name: 'fifth',
    after: 'fourth',
    initialize: function(container) {
      order.push('fifth');
    }
  });

  Application.initializer({
    name: 'first',
    before: 'second',
    initialize: function(container) {
      order.push('first');
    }
  });

  Application.initializer({
    name: 'third',
    initialize: function(container) {
      order.push('third');
    }
  });

  Ember.run(function() {
    app = Application.create({
      router: false,
      rootElement: '#qunit-fixture'
    });
  });

  deepEqual(order, ['first', 'second', 'third', 'fourth', 'fifth']);
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

test("initializers are concatenated", function(){
  var firstInitializerRunCount = 0, secondInitializerRunCount = 0;
  var FirstApp = Ember.Application.extend();
  FirstApp.initializer({
    name: 'first',
    initialize: function(container) {
      firstInitializerRunCount++;
    }
  });

  var SecondApp = FirstApp.extend();
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
  equal(firstInitializerRunCount, 1, 'first initializer only was run when base class created');
  equal(secondInitializerRunCount, 0, 'first initializer only was run when base class created');
  firstInitializerRunCount = 0;
  Ember.run(function() {
    var secondApp = SecondApp.create({
      router: false,
      rootElement: '#qunit-fixture #second'
    });
  });
  equal(firstInitializerRunCount, 1, 'first initializer was run when subclass created');
  equal(secondInitializerRunCount, 1, 'second initializers was run when subclass created');
});

test("initializers are per-app", function(){
  expect(0);
  var FirstApp = Ember.Application.extend();
  FirstApp.initializer({
    name: 'shouldNotCollide',
    initialize: function(container) {}
  });

  var SecondApp = Ember.Application.extend();
  SecondApp.initializer({
    name: 'shouldNotCollide',
    initialize: function(container) {}
  });
});
