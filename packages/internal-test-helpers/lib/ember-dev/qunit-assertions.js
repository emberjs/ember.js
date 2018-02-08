import { setDebugFunction } from 'ember-debug';
import { assertDeprecations, assertNoDeprecations } from './assert-deprecations';

export function stubMethod(methodName, deprecations) {
  setDebugFunction(methodName, (...args) => {
    let [message] = args;

    // capture the deprecation that went to ember-debug/deprecate
    deprecations.push({ message });
  });
}

export function restoreMethod(methodName, func) {
  setDebugFunction(methodName, func);
}

export function setupExpectDeprecations(assert, state) {
  assert.expectDeprecation = function(cb, matcher) {
    if (typeof cb !== 'function') {
      matcher = cb;
      cb = null;
    }

    stubMethod('deprecate', state.deprecations);

    if (typeof cb === 'function') {
      cb();

      if (state.deferredChecks.length === 0) {
        restoreMethod('deprecate', state.original.deprecate);
      }

      assertDeprecations(this, matcher, state.deprecations);
    } else {
      state.deferredChecks.push(matcher || /.*/);
    }
  };

  assert.expectNoDeprecation = function(cb) {
    stubMethod('deprecate', state.deprecations);

    if (typeof cb === 'function') {
      cb();
    }

    restoreMethod('deprecate', state.original.deprecate);
    assertNoDeprecations(this, state.deprecations);

    if (typeof cb === 'function') {
      state.deprecations = [];
    }
  };

  assert.ignoreDeprecation = function(cb) {
    stubMethod('deprecate', () => {});

    if (typeof cb === 'function') {
      cb();
    }

    restoreMethod('deprecate', state.original.deprecate);
  };
}

