import { get } from 'ember-metal';
import { isArray } from 'ember-runtime';
import {
  moduleFor,
  AbstractTestCase
} from 'internal-test-helpers';


moduleFor('Global API Tests', class extends AbstractTestCase {
  ['@test confirm Ember.DefaultResolver is exported'](assert) {
    let internal = undefined;
    let theExport = get(window, 'Ember.DefaultResolver');
    assert.ok(`${theExport} is exported`);

    if (internal !== undefined) {
      assert.equal(theExport, internal, `${theExport} is exported properly`);
    }
  }

  ['@test confirm Ember.generateController is exported'](assert) {
    let internal = undefined;
    let theExport = get(window, 'Ember.generateController');
    assert.ok(`${theExport} is exported`);

    if (internal !== undefined) {
      assert.equal(theExport, internal, `${theExport} is exported properly`);
    }
  }

  ['@test confirm Ember.Helper is exported'](assert) {
    let internal = undefined;
    let theExport = get(window, 'Ember.Helper');
    assert.ok(`${theExport} is exported`);

    if (internal !== undefined) {
      assert.equal(theExport, internal, `${theExport} is exported properly`);
    }
  }

  ['@test confirm Ember.Helper.helper is exported'](assert) {
    let internal = undefined;
    let theExport = get(window, 'Ember.Helper.helper');
    assert.ok(`${theExport} is exported`);

    if (internal !== undefined) {
      assert.equal(theExport, internal, `${theExport} is exported properly`);
    }
  }

  ['@test confirm Ember.isArray is exported'](assert) {
    let internal = isArray;
    let theExport = get(window, 'Ember.isArray');
    assert.ok(`${theExport} is exported`);

    if (internal !== undefined) {
      assert.equal(theExport, internal, `${theExport} is exported properly`);
    }
  }
});
