/* global self */
import { setTesting } from '@ember/debug';
import { getAdapter, setAdapter } from './test/adapter';
import Adapter from './adapters/adapter';
import QUnitAdapter from './adapters/qunit';
/**
  Sets Ember up for testing. This is useful to perform
  basic setup steps in order to unit test.

  Use `App.setupForTesting` to perform integration tests (full
  application testing).

  @method setupForTesting
  @namespace Ember
  @since 1.5.0
  @private
*/
export default function setupForTesting() {
  setTesting(true);
  let adapter = getAdapter();
  // if adapter is not manually set default to QUnit
  if (!adapter) {
    setAdapter(typeof self.QUnit === 'undefined' ? Adapter.create() : QUnitAdapter.create());
  }
}