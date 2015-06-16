import 'ember';
import isEnabled from 'ember-metal/features';

QUnit.module('Global API Tests');

function confirmExport(property) {
  QUnit.test('confirm ' + property + ' is exported', function() {
    ok(Ember.get(window, property) + ' is exported propertly');
  });
}

confirmExport('Ember.DefaultResolver');
confirmExport('Ember.generateController');
if (isEnabled('ember-htmlbars-helper')) {
  confirmExport('Ember.Helper');
  confirmExport('Ember.Helper.helper');
}
