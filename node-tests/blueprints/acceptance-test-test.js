'use strict';

var blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
var setupTestHooks = blueprintHelpers.setupTestHooks;
var emberNew = blueprintHelpers.emberNew;
var emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
var modifyPackages = blueprintHelpers.modifyPackages;

var chai = require('ember-cli-blueprint-test-helpers/chai');
var expect = chai.expect;

describe('Acceptance: ember generate and destroy acceptance-test', function() {
  setupTestHooks(this);

  it('acceptance-test foo', function() {
    var args = ['acceptance-test', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/acceptance/foo-test.js'))
          .to.contain("import { test } from 'qunit';")
          .to.contain("moduleForAcceptance('Acceptance | foo');")
          .to.contain("test('visiting /foo', function(assert) {")
          .to.contain("visit('/foo');")
          .to.contain("andThen(function() {")
          .to.contain("assert.equal(currentURL(), '/foo');");
      }));
  });

  it('in-addon acceptance-test foo', function() {
    var args = ['acceptance-test', 'foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/acceptance/foo-test.js'))
          .to.contain("import { test } from 'qunit';")
          .to.contain("moduleForAcceptance('Acceptance | foo');")
          .to.contain("test('visiting /foo', function(assert) {")
          .to.contain("visit('/foo');")
          .to.contain("andThen(function() {")
          .to.contain("assert.equal(currentURL(), '/foo');");

        expect(_file('app/acceptance-tests/foo.js'))
          .to.not.exist;
      }));
  });

  it('in-addon acceptance-test foo/bar', function() {
    var args = ['acceptance-test', 'foo/bar'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/acceptance/foo/bar-test.js'))
          .to.contain("import { test } from 'qunit';")
          .to.contain("moduleForAcceptance('Acceptance | foo/bar');")
          .to.contain("test('visiting /foo/bar', function(assert) {")
          .to.contain("visit('/foo/bar');")
          .to.contain("andThen(function() {")
          .to.contain("assert.equal(currentURL(), '/foo/bar');");

        expect(_file('app/acceptance-tests/foo/bar.js'))
          .to.not.exist;
      }));
  });

  it('acceptance-test foo for mocha', function() {
    var args = ['acceptance-test', 'foo'];

    return emberNew()
      .then(() => modifyPackages([
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ]))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/acceptance/foo-test.js'))
          .to.contain("import { describe, it, beforeEach, afterEach } from 'mocha';")
          .to.contain("import { expect } from 'chai';")
          .to.contain("describe('Acceptance | foo', function() {")
          .to.contain("it('can visit /foo', function() {")
          .to.contain("visit('/foo');")
          .to.contain("andThen(function() {")
          .to.contain("expect(currentURL()).to.equal('/foo');");
      }));
  });
});
