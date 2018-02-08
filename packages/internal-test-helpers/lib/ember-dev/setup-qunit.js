import { getDebugFunction } from 'ember-debug';
import { assertDeferredChecks } from './assert-deprecations';
import { setupExpectDeprecations, restoreMethod } from './qunit-assertions';

function resetState() {
  let blankState = {
    deprecations: [],
    deferredChecks: [],
    original: {
      deprecate: getDebugFunction('deprecate')
    }
  };

  return blankState;
}

export default function setupQUnit(assertion, _QUnit) {
  let state = resetState();
  let originalModule = _QUnit.module;

  _QUnit.module = function(name, _options) {
    let options = _options || {};
    let originalSetup = options.setup || options.beforeEach || function() { };
    let originalTeardown = options.teardown || options.afterEach || function() { };

    delete options.setup;
    delete options.teardown;

    options.beforeEach = function(assert) {
      state = resetState();

      setupExpectDeprecations(assert, state);

      assertion.reset();
      assertion.inject();

      return originalSetup.apply(this, arguments);
    };

    options.afterEach = function(assert) {
      let result = originalTeardown.apply(this, arguments);

      assertDeferredChecks(assert, state.deferredChecks, state.deprecations);
      restoreMethod('deprecate', state.original.deprecate);

      assertion.assert();
      assertion.restore();

      return result;
    };

    return originalModule(name, options);
  };
}
