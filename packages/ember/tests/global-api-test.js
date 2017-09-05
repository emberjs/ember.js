import { get } from 'ember-metal';
import { isArray } from 'ember-runtime';
import { getEngineParent } from 'ember-application';

QUnit.module('Global API Tests');

function confirmExport(property, internal) {
  QUnit.test('confirm ' + property + ' is exported', function() {
    let theExport = get(window, property);
    ok(theExport + ' is exported');
    if (internal !== undefined) {
      equal(theExport, internal, theExport + ' is exported properly');
    }
  });
}

confirmExport('Ember.DefaultResolver');
confirmExport('Ember.generateController');
confirmExport('Ember.Helper');
confirmExport('Ember.Helper.helper');
confirmExport('Ember.isArray', isArray);
confirmExport('Ember.getEngineParent', getEngineParent);
