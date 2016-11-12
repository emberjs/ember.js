'use strict';

var blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
var setupTestHooks = blueprintHelpers.setupTestHooks;
var emberNew = blueprintHelpers.emberNew;
var emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
var setupPodConfig = blueprintHelpers.setupPodConfig;

var chai = require('ember-cli-blueprint-test-helpers/chai');
var expect = chai.expect;

describe('Acceptance: ember generate and destroy template', function() {
  setupTestHooks(this);

  it('template foo', function() {
    var args = ['template', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/templates/foo.hbs')).to.equal('');
      }));
  });

  it('template foo/bar', function() {
    var args = ['template', 'foo/bar'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/templates/foo/bar.hbs')).to.equal('');
      }));
  });

  it('template foo --pod', function() {
    var args = ['template', 'foo'];

    return emberNew()
      .then(() => setupPodConfig({
        usePods: true
      }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/foo/template.hbs')).to.equal('');
      }));
  });

  it('template foo/bar --pod', function() {
    var args = ['template', 'foo/bar'];

    return emberNew()
      .then(() => setupPodConfig({
        usePods: true
      }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/foo/bar/template.hbs')).to.equal('');
      }));
  });

  it('template foo --pod podModulePrefix', function() {
    var args = ['template', 'foo'];

    return emberNew()
      .then(() => setupPodConfig({
        usePods: true,
        podModulePrefix: true
      }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/pods/foo/template.hbs')).to.equal('');
      }));
  });

  it('template foo/bar --pod podModulePrefix', function() {
    var args = ['template', 'foo/bar'];

    return emberNew()
      .then(() => setupPodConfig({
        usePods: true,
        podModulePrefix: true
      }))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/pods/foo/bar/template.hbs')).to.equal('');
      }));
  });

  it('in-addon template foo', function() {
    var args = ['template', 'foo'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/templates/foo.hbs')).to.equal('');
      }));
  });

  it('in-addon template foo/bar', function() {
    var args = ['template', 'foo/bar'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('addon/templates/foo/bar.hbs')).to.equal('');
      }));
  });

  it('dummy template foo', function() {
    var args = ['template', 'foo', '--dummy'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/dummy/app/templates/foo.hbs')).to.equal('');
      }));
  });

  it('dummy template foo/bar', function() {
    var args = ['template', 'foo/bar', '--dummy'];

    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/dummy/app/templates/foo/bar.hbs')).to.equal('');
      }));
  });

  it('in-repo-addon template foo', function() {
    var args = ['template', 'foo', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('lib/my-addon/addon/templates/foo.hbs')).to.equal('');
      }));
  });

  it('in-repo-addon template foo/bar', function() {
    var args = ['template', 'foo/bar', '--in-repo-addon=my-addon'];

    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('lib/my-addon/addon/templates/foo/bar.hbs')).to.equal('');
      }));
  });
});
