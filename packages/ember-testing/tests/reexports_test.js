import Ember from 'ember';
import { confirmExport } from 'internal-test-helpers';

QUnit.module('ember-testing reexports');

[
  // ember-testing
  ['Test', 'ember-testing'],
  ['Test.Adapter', 'ember-testing', 'Adapter'],
  ['Test.QUnitAdapter', 'ember-testing', 'QUnitAdapter'],
  ['setupForTesting', 'ember-testing']
].forEach(reexport => {
  let [path, moduleId, exportName] = reexport;

  // default path === exportName if none present
  if (!exportName) {
    exportName = path;
  }

  QUnit.test(`Ember.${path} exports correctly`, assert => {
    confirmExport(Ember, assert, path, moduleId, exportName);
  });
});
