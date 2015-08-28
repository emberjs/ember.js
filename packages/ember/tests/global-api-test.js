/*globals Ember */
import { isArray } from 'ember-runtime/utils';

QUnit.module('Global API Tests');

function confirmExport(property, internal) {
  QUnit.test('confirm ' + property + ' is exported', function() {
    var theExport = Ember.get(window, property);
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
