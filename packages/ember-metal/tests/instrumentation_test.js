import {
  instrument,
  subscribe,
  unsubscribe,
  reset
} from "ember-metal/instrumentation";

QUnit.module("Ember Instrumentation", {
  setup: function() {

  },
  teardown: function() {
    reset();
  }
});

QUnit.test("execute block even if no listeners", function() {
  var result = instrument("render", {}, function() {
    return "hello";
  });
  equal(result, "hello", 'called block');
});

QUnit.test("subscribing to a simple path receives the listener", function() {
  expect(12);

  var sentPayload = {};
  var count = 0;

  subscribe("render", {
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

  instrument("render", sentPayload, function() {

  });

  instrument("render.handlebars", sentPayload, function() {

  });
});

QUnit.test("returning a value from the before callback passes it to the after callback", function() {
  expect(2);

  var passthru1 = {};
  var passthru2 = {};

  subscribe("render", {
    before: function(name, timestamp, payload) {
      return passthru1;
    },
    after: function(name, timestamp, payload, beforeValue) {
      strictEqual(beforeValue, passthru1);
    }
  });

  subscribe("render", {
    before: function(name, timestamp, payload) {
      return passthru2;
    },
    after: function(name, timestamp, payload, beforeValue) {
      strictEqual(beforeValue, passthru2);
    }
  });

  instrument("render", null, function() {});
});

QUnit.test("instrument with 2 args (name, callback) no payload", function() {
  expect(1);

  subscribe("render", {
    before: function(name, timestamp, payload) {
      deepEqual(payload, {});
    },
    after: function() {}
  });

  instrument("render", function() {});
});

QUnit.test("instrument with 3 args (name, callback, binding) no payload", function() {
  expect(2);

  var binding = {};
  subscribe("render", {
    before: function(name, timestamp, payload) {
      deepEqual(payload, {});
    },
    after: function() {}
  });

  instrument("render", function() {
    deepEqual(this, binding);
  }, binding);
});


QUnit.test("instrument with 3 args (name, payload, callback) with payload", function() {
  expect(1);

  var expectedPayload = { hi: 1 };
  subscribe("render", {
    before: function(name, timestamp, payload) {
      deepEqual(payload, expectedPayload);
    },
    after: function() {}
  });

  instrument("render", expectedPayload, function() {});
});

QUnit.test("instrument with 4 args (name, payload, callback, binding) with payload", function() {
  expect(2);

  var expectedPayload = { hi: 1 };
  var binding = {};
  subscribe("render", {
    before: function(name, timestamp, payload) {
      deepEqual(payload, expectedPayload);
    },
    after: function() {}
  });

  instrument("render", expectedPayload, function() {
    deepEqual(this, binding);
  }, binding);
});


QUnit.test("raising an exception in the instrumentation attaches it to the payload", function() {
  expect(2);

  var error = new Error("Instrumentation");

  subscribe("render", {
    before: function() {},
    after: function(name, timestamp, payload) {
      strictEqual(payload.exception, error);
    }
  });

  subscribe("render", {
    before: function() {},
    after: function(name, timestamp, payload) {
      strictEqual(payload.exception, error);
    }
  });

  instrument("render.handlebars", null, function() {
    throw error;
  });
});

QUnit.test("it is possible to add a new subscriber after the first instrument", function() {
  instrument("render.handlebars", null, function() {});

  subscribe("render", {
    before: function() {
      ok(true, "Before callback was called");
    },
    after: function() {
      ok(true, "After callback was called");
    }
  });

  instrument("render.handlebars", null, function() {});
});

QUnit.test("it is possible to remove a subscriber", function() {
  expect(4);

  var count = 0;

  var subscriber = subscribe("render", {
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

  instrument("render.handlebars", null, function() {});

  unsubscribe(subscriber);

  instrument("render.handlebars", null, function() {});
});
