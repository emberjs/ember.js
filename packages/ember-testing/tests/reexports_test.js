import Ember from 'ember';
import { confirmExport } from 'internal-test-helpers';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

class ReexportsTestCase extends AbstractTestCase {}

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

  ReexportsTestCase.prototype[
    `@test Ember.${path} exports correctly`
  ] = function(assert) {
    confirmExport(Ember, assert, path, moduleId, exportName);
  };
});

moduleFor('ember-testing reexports', ReexportsTestCase);
