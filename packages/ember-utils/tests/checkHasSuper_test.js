import { environment } from 'ember-environment';
import { checkHasSuper } from '..';

QUnit.module('checkHasSuper');

// Only run this test on browsers that we are certain should have function
// source available.  This allows the test suite to continue to pass on other
// platforms that correctly (for them) fall back to the "always wrap" code.
if (environment.isPhantom || environment.isChrome || environment.isFirefox) {
  QUnit.test('does not super wrap needlessly [GH #12462]', function(assert) {
    assert.notOk(checkHasSuper(function() {}), 'empty function does not have super');
  });
}
