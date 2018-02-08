import { deprecate } from 'ember-debug';
import { moduleFor } from 'internal-test-helpers';

class AssertionTestCase {
  beforeEach(assert) {
    let originalPushResult = assert.pushResult;

    this.pushedResults = [];

    assert.pushResult = result => {
      this.pushedResults.push(result);
    };

    this.restoreAsserts = () => {
      if (originalPushResult) {
        assert.pushResult = originalPushResult;
        originalPushResult = null;
      }
    };
  }

  afterEach() {
    this.restoreAsserts();
  }
}

moduleFor('assert.expectDeprecation', class extends AssertionTestCase {
  ['@test expectDeprecation called with callback and with deprecation'](assert) {
    assert.expectDeprecation(() => {
      deprecate('Something deprecated', false, { id: 'deprecation-test', until: '3.0.0' });
    });

    this.restoreAsserts();

    assert.ok(
      this.pushedResults[0].result,
      '`expectDeprecation` captured deprecation call'
    );
  }

  ['@test expectDeprecation called with callback and without deprecation'](assert) {
    assert.expectDeprecation(() => { });

    this.restoreAsserts();

    assert.notOk(this.pushedResults[0].result, '`expectDeprecation` logged failed result');
  }

  ['@test expectDeprecation called with callback, matcher and matched deprecation'](assert) {
    assert.expectDeprecation(() => {
      deprecate('Something deprecated', false, { id: 'deprecation-test', until: '3.0.0' });
    }, /Something deprecated/);

    this.restoreAsserts();

    assert.ok(this.pushedResults[0].result, '`expectDeprecation` captured deprecation call');
  }

  ['@test expectDeprecation called with callback, matcher and unmatched deprecation'](assert) {
    assert.expectDeprecation(() => {
      deprecate('Something deprecated', false, { id: 'deprecation-test', until: '3.0.0' });
    }, /different deprecation/);

    this.restoreAsserts();

    assert.notOk(this.pushedResults[0].result, '`expectDeprecation` logged failed result');
  }

  ['@test expectDeprecation with regex matcher'](assert) {
    assert.expectDeprecation(() => {
      deprecate('Something deprecated', false, { id: 'deprecation-test', until: '3.0.0' });
    }, /Somethi[a-z ]*ecated/);

    assert.expectDeprecation(() => {
      deprecate('Something that will not match', false, { id: 'deprecation-test', until: '3.0.0' });
    }, /^will not match/);

    this.restoreAsserts();

    assert.ok(this.pushedResults[0].result, '`expectDeprecation` matched RegExp');
    assert.notOk(this.pushedResults[1].result, '`expectDeprecation` didn\'t RegExp as String match');
  }

  ['@test expectDeprecation with string matcher'](assert) {
    assert.expectDeprecation(() => {
      deprecate('Something deprecated', false, { id: 'deprecation-test', until: '3.0.0' });
    }, 'Something');

    assert.expectDeprecation(() => {
      deprecate('Something deprecated', false, { id: 'deprecation-test', until: '3.0.0' });
    }, 'Something.*');

    this.restoreAsserts();

    assert.ok(this.pushedResults[0].result, '`expectDeprecation` captured deprecation for partial String match');
    assert.notOk(this.pushedResults[1].result, '`expectDeprecation` didn\'t test a String match as RegExp');
  }
});

moduleFor('assert.expectDeprecation', class extends AssertionTestCase {
  ['@test expectNoDeprecation called after test and without deprecation'](assert) {
    assert.expectNoDeprecation();

    this.restoreAsserts();

    assert.ok(this.pushedResults[0].result, '`expectNoDeprecation` caught no deprecation');
  }

  ['@test expectNoDeprecation called with callback and with deprecation'](assert) {
    assert.expectNoDeprecation(() => {
      deprecate('Something deprecated', false, { id: 'deprecation-test', until: '3.0.0' });
    });

    this.restoreAsserts();

    assert.notOk(this.pushedResults[0].result, '`expectNoDeprecation` caught logged failed result');
  }

  ['@test expectNoDeprecation called with callback and without deprecation'](assert) {
    assert.expectNoDeprecation(() => { });

    this.restoreAsserts();

    assert.ok(this.pushedResults[0].result, '`expectNoDeprecation` caught no deprecation');
  }

  ['@test expectNoDeprecation called with callback and after test'](assert) {
    assert.expectNoDeprecation(() => {
      deprecate('Something deprecated', false, { id: 'deprecation-test', until: '3.0.0' });
    });

    assert.expectNoDeprecation();

    this.restoreAsserts();

    assert.notOk(this.pushedResults[0].result, 'first `expectNoDeprecation` caught logged failed result');
    assert.ok(this.pushedResults[1].result, 'second `expectNoDeprecation` caught no deprecation');
  }
});
