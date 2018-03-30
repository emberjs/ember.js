import Namespace from '../../../system/namespace';
import Application from '../../../system/application';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Ember.Application',
  class extends AbstractTestCase {
    ['@test Ember.Application should be a subclass of Ember.Namespace'](assert) {
      assert.ok(Namespace.detect(Application), 'Ember.Application subclass of Ember.Namespace');
    }
  }
);
