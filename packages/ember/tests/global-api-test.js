/*globals Ember */
import 'ember';
import isEnabled from 'ember-metal/features';
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
if (isEnabled('ember-htmlbars-helper')) {
  confirmExport('Ember.Helper');
  confirmExport('Ember.Helper.helper');
}
confirmExport('Ember.isArray', isArray);
