import { testBoth } from 'internal-test-helpers';
import {
  run,
  addObserver,
  bind,
  computed,
  defineProperty,
  propertyWillChange,
  propertyDidChange
} from '../..';

QUnit.module('system/binding/sync_test.js');

testBoth('bindings should not sync twice in a single run loop', function(get, set) {
  let a, b, setValue;
  let setCalled = 0;
  let getCalled = 0;

  run(() => {
    a = {};

    defineProperty(a, 'foo', computed({
      get(key) {
        getCalled++;
        return setValue;
      },
      set(key, value) {
        setCalled++;
        propertyWillChange(this, key);
        setValue = value;
        propertyDidChange(this, key);
        return value;
      }
    }).volatile());

    b = {
      a: a
    };

    expectDeprecation(() => bind(b, 'foo', 'a.foo'), /`Ember.Binding` is deprecated/);
  });

  // reset after initial binding synchronization
  getCalled = 0;

  run(() => {
    set(a, 'foo', 'trollface');
  });

  equal(get(b, 'foo'), 'trollface', 'the binding should sync');
  equal(setCalled, 1, 'Set should only be called once');
  equal(getCalled, 1, 'Get should only be called once');
});

testBoth('bindings should not infinite loop if computed properties return objects', function(get, set) {
  let a, b;
  let getCalled = 0;

  run(() => {
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

    expectDeprecation(() => bind(b, 'foo', 'a.foo'), /`Ember.Binding` is deprecated/);
  });

  deepEqual(get(b, 'foo'), ['foo', 'bar'], 'the binding should sync');
  equal(getCalled, 1, 'Get should only be called once');
});

testBoth('bindings should do the right thing when observers trigger bindings in the opposite direction', function(get, set) {
  let a, b, c;

  run(() => {
    a = {
      foo: 'trololol'
    };

    b = {
      a: a
    };

    let deprecationMessage = /`Ember.Binding` is deprecated/;

    expectDeprecation(() => bind(b, 'foo', 'a.foo'), deprecationMessage);

    c = {
      a: a
    };

    expectDeprecation(() => {
      bind(c, 'foo', 'a.foo');
    }, deprecationMessage);
  });

  addObserver(b, 'foo', () => set(c, 'foo', 'what is going on'));

  run(() => set(a, 'foo', 'trollface'));

  equal(get(a, 'foo'), 'what is going on');
});

testBoth('bindings should not try to sync destroyed objects', function(get, set) {
  let a, b;

  run(() => {
    a = {
      foo: 'trololol'
    };

    b = {
      a: a
    };

    let deprecationMessage = /`Ember.Binding` is deprecated/;

    expectDeprecation(() => bind(b, 'foo', 'a.foo'), deprecationMessage);
  });

  run(() => {
    set(a, 'foo', 'trollface');
    set(b, 'isDestroyed', true);
    ok(true, 'should not raise');
  });

  run(() => {
    a = {
      foo: 'trololol'
    };

    b = {
      a: a
    };

    let deprecationMessage = /`Ember.Binding` is deprecated/;

    expectDeprecation(() => bind(b, 'foo', 'a.foo'), deprecationMessage);
  });

  run(() => {
    set(b, 'foo', 'trollface');
    set(a, 'isDestroyed', true);
    ok(true, 'should not raise');
  });
});
