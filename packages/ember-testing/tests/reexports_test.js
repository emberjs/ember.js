import Ember from 'ember';
import { confirmExport, testUnless } from 'internal-test-helpers';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import * as emberTesting from 'ember-testing';
import { DEPRECATIONS } from '@ember/-internals/deprecations';

class ReexportsTestCase extends AbstractTestCase {}

[
  // ember-testing
  ['Test', 'ember-testing'],
  ['Test.Adapter', 'ember-testing', 'Adapter'],
  ['Test.QUnitAdapter', 'ember-testing', 'QUnitAdapter'],
  ['setupForTesting', 'ember-testing'],
].forEach((reexport) => {
  let [path, moduleId, exportName] = reexport;

  // default path === exportName if none present
  if (!exportName) {
    exportName = path;
  }

  ReexportsTestCase.prototype[
    `${testUnless(
      DEPRECATIONS.DEPRECATE_IMPORT_EMBER(path).isRemoved
    )} Ember.${path} exports correctly`
  ] = function (assert) {
    expectDeprecation(
      /'ember' barrel file is deprecated/,
      DEPRECATIONS.DEPRECATE_IMPORT_EMBER(path || exportName).isEnabled
    );
    confirmExport(Ember, assert, path, moduleId, exportName, emberTesting);
  };
});

moduleFor('ember-testing reexports', ReexportsTestCase);
