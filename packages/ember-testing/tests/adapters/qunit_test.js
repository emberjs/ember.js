import run from "ember-metal/run_loop";
import QUnitAdapter from "ember-testing/adapters/qunit";

var adapter;

QUnit.module("ember-testing QUnitAdapter", {
  setup() {
    adapter = new QUnitAdapter();
  },
  teardown() {
    run(adapter, adapter.destroy);
  }
});

QUnit.test("asyncStart calls stop", function() {
  var originalStop = QUnit.stop;
  try {
    QUnit.stop = function() {
      ok(true, "stop called");
    };
    adapter.asyncStart();
  } finally {
    QUnit.stop = originalStop;
  }
});

QUnit.test("asyncEnd calls start", function() {
  var originalStart = QUnit.start;
  try {
    QUnit.start = function() {
      ok(true, "start called");
    };
    adapter.asyncEnd();
  } finally {
    QUnit.start = originalStart;
  }
});

QUnit.test("exception causes a failing assertion", function() {
  var error = { err: 'hai' };
  var originalOk = window.ok;
  try {
    window.ok = function(val, msg) {
      originalOk(!val, "ok is called with false");
      originalOk(msg, '{err: "hai"}');
    };
    adapter.exception(error);
  } finally {
    window.ok = originalOk;
  }
});
