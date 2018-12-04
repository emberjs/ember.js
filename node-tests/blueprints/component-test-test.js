'use strict';

const fs = require('fs-extra');

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerate = blueprintHelpers.emberGenerate;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;
const expectError = require('../helpers/expect-error');
const enableModuleUnification = require('../helpers/module-unification').enableModuleUnification;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const generateFakePackageManifest = require('../helpers/generate-fake-package-manifest');
const fixture = require('../helpers/fixture');

describe('Blueprint: component-test', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew();
    });

    describe('with ember-cli-qunit@4.1.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-qunit', dev: true },
        ]);
        generateFakePackageManifest('ember-cli-qunit', '4.1.0');
      });

      it('component-test x-foo', function() {
        return emberGenerateDestroy(['component-test', 'x-foo'], _file => {
          expect(_file('tests/integration/components/x-foo-test.js')).to.equal(
            fixture('component-test/default.js')
          );
        });
      });

      it('component-test x-foo --unit', function() {
        return emberGenerateDestroy(['component-test', 'x-foo', '--unit'], _file => {
          expect(_file('tests/unit/components/x-foo-test.js')).to.equal(
            fixture('component-test/unit.js')
          );
        });
      });

      describe('with usePods=true', function() {
        beforeEach(function() {
          fs.writeFileSync(
            '.ember-cli',
            `{
          "disableAnalytics": false,
          "usePods": true
        }`
          );
        });

        it('component-test x-foo', function() {
          return emberGenerateDestroy(['component-test', 'x-foo'], _file => {
            expect(_file('tests/integration/components/x-foo/component-test.js')).to.equal(
              fixture('component-test/default.js')
            );
          });
        });
      });
    });

    describe('with ember-cli-qunit@4.2.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-qunit', dev: true },
        ]);
        generateFakePackageManifest('ember-cli-qunit', '4.2.0');
      });

      it('component-test x-foo', function() {
        return emberGenerateDestroy(['component-test', 'x-foo'], _file => {
          expect(_file('tests/integration/components/x-foo-test.js')).to.equal(
            fixture('component-test/rfc232.js')
          );
        });
      });

      it('component-test x-foo --unit', function() {
        return emberGenerateDestroy(['component-test', 'x-foo', '--unit'], _file => {
          expect(_file('tests/unit/components/x-foo-test.js')).to.equal(
            fixture('component-test/rfc232-unit.js')
          );
        });
      });
    });

    describe('with ember-cli-mocha@0.11.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true },
        ]);
        generateFakePackageManifest('ember-cli-mocha', '0.11.0');
      });

      it('component-test x-foo', function() {
        return emberGenerateDestroy(['component-test', 'x-foo'], _file => {
          expect(_file('tests/integration/components/x-foo-test.js')).to.equal(
            fixture('component-test/mocha.js')
          );
        });
      });

      it('component-test x-foo --unit', function() {
        return emberGenerateDestroy(['component-test', 'x-foo', '--unit'], _file => {
          expect(_file('tests/unit/components/x-foo-test.js')).to.equal(
            fixture('component-test/mocha-unit.js')
          );
        });
      });
    });

    describe('with ember-cli-mocha@0.12.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true },
        ]);
        generateFakePackageManifest('ember-cli-mocha', '0.12.0');
      });

      it('component-test x-foo', function() {
        return emberGenerateDestroy(['component-test', 'x-foo'], _file => {
          expect(_file('tests/integration/components/x-foo-test.js')).to.equal(
            fixture('component-test/mocha-0.12.js')
          );
        });
      });

      it('component-test x-foo --unit', function() {
        return emberGenerateDestroy(['component-test', 'x-foo', '--unit'], _file => {
          expect(_file('tests/unit/components/x-foo-test.js')).to.equal(
            fixture('component-test/mocha-0.12-unit.js')
          );
        });
      });
    });

    describe('with ember-mocha@0.14.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-mocha', dev: true },
        ]);
        generateFakePackageManifest('ember-mocha', '0.14.0');
      });

      it('component-test x-foo', function() {
        return emberGenerateDestroy(['component-test', 'x-foo'], _file => {
          expect(_file('tests/integration/components/x-foo-test.js')).to.equal(
            fixture('component-test/mocha-rfc232.js')
          );
        });
      });

      it('component-test x-foo --unit', function() {
        return emberGenerateDestroy(['component-test', 'x-foo', '--unit'], _file => {
          expect(_file('tests/unit/components/x-foo-test.js')).to.equal(
            fixture('component-test/mocha-rfc232-unit.js')
          );
        });
      });
    });
  });

  describe('in app - module unification', function() {
    enableModuleUnification();

    beforeEach(function() {
      return emberNew().then(() => fs.ensureDirSync('src'));
    });

    describe('with ember-cli-qunit@4.1.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-qunit', dev: true },
        ]);
        generateFakePackageManifest('ember-cli-qunit', '4.1.0');
      });

      it('component-test x-foo', function() {
        return emberGenerateDestroy(['component-test', 'x-foo'], _file => {
          expect(_file('src/ui/components/x-foo/component-test.js')).to.equal(
            fixture('component-test/default.js')
          );
        });
      });

      it('component-test x-foo --unit', function() {
        return expectError(
          emberGenerate(['component-test', 'x-foo', '--unit']),
          "The --unit flag isn't supported within a module unification app"
        );
      });

      describe('with usePods=true', function() {
        beforeEach(function() {
          fs.writeFileSync(
            '.ember-cli',
            `{
          "disableAnalytics": false,
          "usePods": true
        }`
          );
        });

        it('component-test x-foo', function() {
          return expectError(
            emberGenerate(['component-test', 'x-foo']),
            "Pods aren't supported within a module unification app"
          );
        });
      });
    });

    describe('with ember-cli-qunit@4.2.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-qunit', dev: true },
        ]);
        generateFakePackageManifest('ember-cli-qunit', '4.2.0');
      });

      it('component-test x-foo', function() {
        return emberGenerateDestroy(['component-test', 'x-foo'], _file => {
          expect(_file('src/ui/components/x-foo/component-test.js')).to.equal(
            fixture('component-test/rfc232.js')
          );
        });
      });

      it('component-test x-foo --unit', function() {
        return expectError(
          emberGenerate(['component-test', 'x-foo', '--unit']),
          "The --unit flag isn't supported within a module unification app"
        );
      });
    });

    describe('with ember-cli-mocha@0.11.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true },
        ]);
        generateFakePackageManifest('ember-cli-mocha', '0.11.0');
      });

      it('component-test x-foo', function() {
        return emberGenerateDestroy(['component-test', 'x-foo'], _file => {
          expect(_file('src/ui/components/x-foo/component-test.js')).to.equal(
            fixture('component-test/mocha.js')
          );
        });
      });

      it('component-test x-foo --unit', function() {
        return expectError(
          emberGenerate(['component-test', 'x-foo', '--unit']),
          "The --unit flag isn't supported within a module unification app"
        );
      });
    });

    describe('with ember-cli-mocha@0.12.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true },
        ]);
        generateFakePackageManifest('ember-cli-mocha', '0.12.0');
      });

      it('component-test x-foo', function() {
        return emberGenerateDestroy(['component-test', 'x-foo'], _file => {
          expect(_file('src/ui/components/x-foo/component-test.js')).to.equal(
            fixture('component-test/mocha-0.12.js')
          );
        });
      });

      it('component-test x-foo --unit', function() {
        return expectError(
          emberGenerate(['component-test', 'x-foo', '--unit']),
          "The --unit flag isn't supported within a module unification app"
        );
      });
    });

    describe('with ember-mocha@0.14.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-mocha', dev: true },
        ]);
        generateFakePackageManifest('ember-mocha', '0.14.0');
      });

      it('component-test x-foo', function() {
        return emberGenerateDestroy(['component-test', 'x-foo'], _file => {
          expect(_file('src/ui/components/x-foo/component-test.js')).to.equal(
            fixture('component-test/mocha-rfc232.js')
          );
        });
      });

      it('component-test x-foo --unit', function() {
        return expectError(
          emberGenerate(['component-test', 'x-foo', '--unit']),
          "The --unit flag isn't supported within a module unification app"
        );
      });
    });
  });

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' })
        .then(() => modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-qunit', dev: true },
        ]))
        .then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.0'));
    });

    it('component-test x-foo', function() {
      return emberGenerateDestroy(['component-test', 'x-foo'], _file => {
        expect(_file('tests/integration/components/x-foo-test.js')).to.equal(
          fixture('component-test/default.js')
        );

        expect(_file('app/component-test/x-foo.js')).to.not.exist;
      });
    });

    it('component-test x-foo --unit', function() {
      return emberGenerateDestroy(['component-test', 'x-foo', '--unit'], _file => {
        expect(_file('tests/unit/components/x-foo-test.js')).to.equal(
          fixture('component-test/unit.js')
        );

        expect(_file('app/component-test/x-foo.js')).to.not.exist;
      });
    });

    it('component-test x-foo --dummy', function() {
      return emberGenerateDestroy(['component-test', 'x-foo', '--dummy'], _file => {
        expect(_file('tests/integration/components/x-foo-test.js')).to.equal(
          fixture('component-test/default.js')
        );

        expect(_file('app/component-test/x-foo.js')).to.not.exist;
      });
    });
  });

  describe('in in-repo-addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'in-repo-addon' })
        .then(() => modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-qunit', dev: true },
        ]))
        .then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.0'));
    });

    it('component-test x-foo --in-repo-addon=my-addon', function() {
      return emberGenerateDestroy(
        ['component-test', 'x-foo', '--in-repo-addon=my-addon'],
        _file => {
          expect(_file('tests/integration/components/x-foo-test.js')).to.equal(
            fixture('component-test/default.js')
          );
        }
      );
    });

    it('component-test x-foo --in-repo-addon=my-addon --unit', function() {
      return emberGenerateDestroy(
        ['component-test', 'x-foo', '--in-repo-addon=my-addon', '--unit'],
        _file => {
          expect(_file('tests/unit/components/x-foo-test.js')).to.equal(
            fixture('component-test/unit.js')
          );
        }
      );
    });
  });
});
