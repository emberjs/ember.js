import testBoth from 'ember-metal/tests/props_helper';
import run from 'ember-metal/run_loop';
import {addObserver, removeObserver, _suspendObserver} from "ember-metal/observer";
import {create}  from 'ember-metal/platform';
import {bind} from "ember-metal/binding";
import {rewatch} from "ember-metal/watching";
import {computed} from "ember-metal/computed";
import {defineProperty} from "ember-metal/properties";

module("system/binding/sync_test.js");

testBoth("bindings should not sync twice in a single run loop", function(get, set) {
  var a, b, setValue, setCalled=0, getCalled=0;

  run(function() {
    a = {};

    defineProperty(a, 'foo', computed(function(key, value) {
      if (arguments.length === 2) {
        setCalled++;
        setValue = value;
        return value;
      } else {
        getCalled++;
        return setValue;
      }
    }).volatile());

    b = {
      a: a
    };
    bind(b, 'foo', 'a.foo');
  });

  // reset after initial binding synchronization
  getCalled = 0;

  run(function() {
    set(a, 'foo', 'trollface');
  });

  equal(get(b, 'foo'), "trollface", "the binding should sync");
  equal(setCalled, 1, "Set should only be called once");
  equal(getCalled, 1, "Get should only be called once");
});

testBoth("bindings should not infinite loop if computed properties return objects", function(get, set) {
  var a, b, getCalled=0;

  run(function() {
    a = {};

    defineProperty(a, 'foo', computed(function() {
      getCalled++;
      if (getCalled > 1000) {
        throw 'infinite loop detected';
      }
      return ['foo', 'bar'];
    }));

    b = {
      a: a
    };
    bind(b, 'foo', 'a.foo');
  });

  deepEqual(get(b, 'foo'), ['foo', 'bar'], "the binding should sync");
  equal(getCalled, 1, "Get should only be called once");
});

testBoth("bindings should do the right thing when observers trigger bindings in the opposite direction", function(get, set) {
  var a, b, c;

  run(function() {
    a = {
      foo: 'trololol'
    };

    b = {
      a: a
    };
    bind(b, 'foo', 'a.foo');

    c = {
      a: a
    };
    bind(c, 'foo', 'a.foo');
  });

  addObserver(b, 'foo', function() {
    set(c, 'foo', "what is going on");
  });

  run(function() {
    set(a, 'foo', 'trollface');
  });

  equal(get(a, 'foo'), "what is going on");
});

testBoth("bindings should do the right thing when binding is in prototype", function(get, set) {
  var obj, proto, a, b, selectionChanged;
  run(function() {
    obj = {
      selection: null
    };

    selectionChanged = 0;

    addObserver(obj, 'selection', function () {
      selectionChanged++;
    });

    proto = {
      obj: obj,
      changeSelection: function (value) {
        set(this, 'selection', value);
      }
    };
    bind(proto, 'selection', 'obj.selection');

    a = create(proto);
    b = create(proto);
    rewatch(a);
    rewatch(b);
  });

  run(function () {
    set(a, 'selection', 'a');
  });

  run(function () {
    set(b, 'selection', 'b');
  });

  run(function () {
    set(a, 'selection', 'a');
  });

  equal(selectionChanged, 3);
  equal(get(obj, 'selection'), 'a');
});

testBoth("bindings should not try to sync destroyed objects", function(get, set) {
  var a, b;

  run(function() {
    a = {
      foo: 'trololol'
    };

    b = {
      a: a
    };
    bind(b, 'foo', 'a.foo');
  });

  run(function() {
    set(a, 'foo', 'trollface');
    set(b, 'isDestroyed', true);
    ok(true, "should not raise");
  });

  run(function() {
    a = {
      foo: 'trololol'
    };

    b = {
      a: a
    };
    bind(b, 'foo', 'a.foo');
  });

  run(function() {
    set(b, 'foo', 'trollface');
    set(a, 'isDestroyed', true);
    ok(true, "should not raise");
  });
});
