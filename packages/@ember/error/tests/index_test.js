import { moduleFor, AbstractTestCase as TestCase } from 'internal-test-helpers';
import EmberError from '@ember/error';

moduleFor(
  'Ember Error Throwing',
  class extends TestCase {
    ['@test new EmberError displays provided message'](assert) {
      assert.throws(
        () => {
          expectDeprecation(() => {
            throw new EmberError('A Message');
          }, 'The @ember/error package merely re-exported the native Error and is deprecated. Please use a native Error directly instead.');
        },
        function (e) {
          return e.message === 'A Message';
        },
        'the assigned message was displayed'
      );
    }
    ['@test new EmberError is instanceof EmberError'](assert) {
      expectDeprecation(() => {
        assert.ok(
          new EmberError('A Message') instanceof EmberError,
          'new EmberError is instanceof EmberError'
        );
      }, 'The @ember/error package merely re-exported the native Error and is deprecated. Please use a native Error directly instead.');
    }
    ['@test EmberError(...) displays provided message'](assert) {
      assert.throws(
        () => {
          expectDeprecation(() => {
            throw EmberError('A Message');
          }, 'The @ember/error package merely re-exported the native Error and is deprecated. Please use a native Error directly instead.');
        },
        function (e) {
          return e.message === 'A Message';
        },
        'the assigned message was displayed'
      );
    }
    ['@test EmberError(...) is instanceof EmberError'](assert) {
      expectDeprecation(() => {
        assert.ok(
          EmberError('A Message') instanceof EmberError,
          'new EmberError is instanceof EmberError'
        );
      }, 'The @ember/error package merely re-exported the native Error and is deprecated. Please use a native Error directly instead.');
    }
  }
);
