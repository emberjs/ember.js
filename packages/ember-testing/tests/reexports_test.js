import Ember from 'ember';
import { confirmExport } from 'internal-test-helpers';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

class ReexportsTestCase extends AbstractTestCase {}

[
  // ember-testing
  ['Test', import('ember-testing')],
  ['Test.Adapter', import('ember-testing'), 'Adapter'],
  ['Test.QUnitAdapter', import('ember-testing'), 'QUnitAdapter'],
  ['setupForTesting', import('ember-testing')],
].forEach((reexport) => {
  let [path, modulePromise, exportName] = reexport;

  // default path === exportName if none present
  if (!exportName) {
    exportName = path;
  }

  ReexportsTestCase.prototype[`@test Ember.${path} exports correctly`] = async function (assert) {
    let module = await modulePromise;
    confirmExport(Ember, assert, path, module, exportName);
  };
});

moduleFor('ember-testing reexports', ReexportsTestCase);
