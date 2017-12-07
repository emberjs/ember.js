'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const generateFakePackageManifest = require('../helpers/generate-fake-package-manifest');

describe('Blueprint: service-test', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew();
    });

    it('service-test foo', function() {
      return emberGenerateDestroy(['service-test', 'foo'], _file => {
        expect(_file('tests/unit/services/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo'");
      });
    });

    describe('with ember-cli-mocha@0.11.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-cli-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true }
        ]);
        generateFakePackageManifest('ember-cli-mocha', '0.11.0');
      });

      it('service-test foo', function() {
        return emberGenerateDestroy(['service-test', 'foo'], _file => {
          expect(_file('tests/unit/services/foo-test.js'))
            .to.contain("import { describeModule, it } from 'ember-mocha';")
            .to.contain("describeModule('service:foo', 'Unit | Service | foo'");
        });
      });

      it('service-test foo --pod', function() {
        return emberGenerateDestroy(['service-test', 'foo', '--pod'], _file => {
          expect(_file('tests/unit/foo/service-test.js'))
            .to.contain("import { describeModule, it } from 'ember-mocha';")
            .to.contain("describeModule('service:foo', 'Unit | Service | foo'");
        });
      });
    });

    describe('with ember-cli-mocha@0.12.0', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-cli-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true }
        ]);
        generateFakePackageManifest('ember-cli-mocha', '0.12.0');
      });

      it('service-test foo', function() {
        return emberGenerateDestroy(['service-test', 'foo'], _file => {
          expect(_file('tests/unit/services/foo-test.js'))
            .to.contain("import { describe, it } from 'mocha';")
            .to.contain("import { setupTest } from 'ember-mocha';")
            .to.contain("describe('Unit | Service | foo', function() {")
            .to.contain("setupTest('service:foo',");
        });
      });

      it('service-test foo --pod', function() {
        return emberGenerateDestroy(['service-test', 'foo', '--pod'], _file => {
          expect(_file('tests/unit/foo/service-test.js'))
            .to.contain("import { describe, it } from 'mocha';")
            .to.contain("import { setupTest } from 'ember-mocha';")
            .to.contain("describe('Unit | Service | foo', function() {")
            .to.contain("setupTest('service:foo',");
        });
      });
    });
  });

  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' });
    });

    it('service-test foo', function() {
      return emberGenerateDestroy(['service-test', 'foo'], _file => {
        expect(_file('tests/unit/services/foo-test.js'))
          .to.contain("import { moduleFor, test } from 'ember-qunit';")
          .to.contain("moduleFor('service:foo'");

        expect(_file('app/service-test/foo.js'))
          .to.not.exist;
      });
    });
  });
});
