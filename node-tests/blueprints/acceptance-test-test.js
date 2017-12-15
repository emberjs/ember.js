'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

describe('Blueprint: acceptance-test', function() {
  setupTestHooks(this);

  describe('in app', function() {
    beforeEach(function() {
      return emberNew();
    });

    it('acceptance-test foo', function() {
      return emberGenerateDestroy(['acceptance-test', 'foo'], _file => {
        expect(_file('tests/acceptance/foo-test.js'))
          .to.contain("import { test } from 'qunit';")
          .to.contain("moduleForAcceptance('Acceptance | foo');")
          .to.contain("test('visiting /foo', function(assert) {")
          .to.contain("visit('/foo');")
          .to.contain("andThen(function() {")
          .to.contain("assert.equal(currentURL(), '/foo');");
      });
    });

    describe('with ember-cli-mocha', function() {
      beforeEach(function() {
        return modifyPackages([
          { name: 'ember-cli-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true }
        ]);
      });

      it('acceptance-test foo', function() {
        return emberGenerateDestroy(['acceptance-test', 'foo'], _file => {
          expect(_file('tests/acceptance/foo-test.js'))
            .to.contain("import { describe, it, beforeEach, afterEach } from 'mocha';")
            .to.contain("import { expect } from 'chai';")
            .to.contain("describe('Acceptance | foo', function() {")
            .to.contain("it('can visit /foo', function() {")
            .to.contain("visit('/foo');")
            .to.contain("return andThen(() => {")
            .to.contain("expect(currentURL()).to.equal('/foo');");
        });
      });
    });
  });


  describe('in addon', function() {
    beforeEach(function() {
      return emberNew({ target: 'addon' });
    });

    it('acceptance-test foo', function() {
      return emberGenerateDestroy(['acceptance-test', 'foo'], _file => {
        expect(_file('tests/acceptance/foo-test.js'))
          .to.contain("import { test } from 'qunit';")
          .to.contain("moduleForAcceptance('Acceptance | foo');")
          .to.contain("test('visiting /foo', function(assert) {")
          .to.contain("visit('/foo');")
          .to.contain("andThen(function() {")
          .to.contain("assert.equal(currentURL(), '/foo');");

        expect(_file('app/acceptance-tests/foo.js'))
          .to.not.exist;
      });
    });

    it('acceptance-test foo/bar', function() {
      return emberGenerateDestroy(['acceptance-test', 'foo/bar'], _file => {
        expect(_file('tests/acceptance/foo/bar-test.js'))
          .to.contain("import { test } from 'qunit';")
          .to.contain("moduleForAcceptance('Acceptance | foo/bar');")
          .to.contain("test('visiting /foo/bar', function(assert) {")
          .to.contain("visit('/foo/bar');")
          .to.contain("andThen(function() {")
          .to.contain("assert.equal(currentURL(), '/foo/bar');");

        expect(_file('app/acceptance-tests/foo/bar.js'))
          .to.not.exist;
      });
    });
  });
});
