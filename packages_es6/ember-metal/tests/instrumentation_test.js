var instrument = Ember.Instrumentation;

module("Ember Instrumentation", {
  setup: function() {

  },
  teardown: function() {
    instrument.reset();
  }
});

test("subscribing to a simple path receives the listener", function() {
  expect(12);

  var sentPayload = {}, count = 0;

  instrument.subscribe("render", {
    before: function(name, timestamp, payload) {
      if (count === 0) {
        strictEqual(name, "render");
      } else {
        strictEqual(name, "render.handlebars");
      }

      ok(typeof timestamp === 'number');
      strictEqual(payload, sentPayload);
    },

    after: function(name, timestamp, payload) {
      if (count === 0) {
        strictEqual(name, "render");
      } else {
        strictEqual(name, "render.handlebars");
      }

      ok(typeof timestamp === 'number');
      strictEqual(payload, sentPayload);

      count++;
    }
  });

  instrument.instrument("render", sentPayload, function() {

  });

  instrument.instrument("render.handlebars", sentPayload, function() {

  });
});

test("returning a value from the before callback passes it to the after callback", function() {
  expect(2);

  var passthru1 = {}, passthru2 = {};

  instrument.subscribe("render", {
    before: function(name, timestamp, payload) {
      return passthru1;
    },
    after: function(name, timestamp, payload, beforeValue) {
      strictEqual(beforeValue, passthru1);
    }
  });

  instrument.subscribe("render", {
    before: function(name, timestamp, payload) {
      return passthru2;
    },
    after: function(name, timestamp, payload, beforeValue) {
      strictEqual(beforeValue, passthru2);
    }
  });

  instrument.instrument("render", null, function() {});
});

test("raising an exception in the instrumentation attaches it to the payload", function() {
  expect(2);

  var error = new Error("Instrumentation");

  instrument.subscribe("render", {
    before: function() {},
    after: function(name, timestamp, payload) {
      strictEqual(payload.exception, error);
    }
  });

  instrument.subscribe("render", {
    before: function() {},
    after: function(name, timestamp, payload) {
      strictEqual(payload.exception, error);
    }
  });

  instrument.instrument("render.handlebars", null, function() {
    throw error;
  });
});

test("it is possible to add a new subscriber after the first instrument", function() {
  instrument.instrument("render.handlebars", null, function() {});

  instrument.subscribe("render", {
    before: function() {
      ok(true, "Before callback was called");
    },
    after: function() {
      ok(true, "After callback was called");
    }
  });

  instrument.instrument("render.handlebars", null, function() {});
});

test("it is possible to remove a subscriber", function() {
  expect(4);

  var count = 0;

  var subscriber = instrument.subscribe("render", {
    before: function() {
      equal(count, 0);
      ok(true, "Before callback was called");
    },
    after: function() {
      equal(count, 0);
      ok(true, "After callback was called");
      count++;
    }
  });

  instrument.instrument("render.handlebars", null, function() {});

  instrument.unsubscribe(subscriber);

  instrument.instrument("render.handlebars", null, function() {});
});
