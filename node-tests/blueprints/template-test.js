'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const setupPodConfig = blueprintHelpers.setupPodConfig;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

describe('Blueprint: template', function() {
  setupTestHooks(this);

  it('template foo', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['template', 'foo'], _file => {
        expect(_file('app/templates/foo.hbs')).to.equal('');
      }));
  });

  it('template foo/bar', function() {
    return emberNew()
      .then(() => emberGenerateDestroy(['template', 'foo/bar'], _file => {
        expect(_file('app/templates/foo/bar.hbs')).to.equal('');
      }));
  });

  it('template foo --pod', function() {
    return emberNew()
      .then(() => setupPodConfig({
        usePods: true
      }))
      .then(() => emberGenerateDestroy(['template', 'foo'], _file => {
        expect(_file('app/foo/template.hbs')).to.equal('');
      }));
  });

  it('template foo/bar --pod', function() {
    return emberNew()
      .then(() => setupPodConfig({
        usePods: true
      }))
      .then(() => emberGenerateDestroy(['template', 'foo/bar'], _file => {
        expect(_file('app/foo/bar/template.hbs')).to.equal('');
      }));
  });

  it('template foo --pod podModulePrefix', function() {
    return emberNew()
      .then(() => setupPodConfig({
        usePods: true,
        podModulePrefix: true
      }))
      .then(() => emberGenerateDestroy(['template', 'foo'], _file => {
        expect(_file('app/pods/foo/template.hbs')).to.equal('');
      }));
  });

  it('template foo/bar --pod podModulePrefix', function() {
    return emberNew()
      .then(() => setupPodConfig({
        usePods: true,
        podModulePrefix: true
      }))
      .then(() => emberGenerateDestroy(['template', 'foo/bar'], _file => {
        expect(_file('app/pods/foo/bar/template.hbs')).to.equal('');
      }));
  });

  it('in-addon template foo', function() {
    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(['template', 'foo'], _file => {
        expect(_file('addon/templates/foo.hbs')).to.equal('');
      }));
  });

  it('in-addon template foo/bar', function() {
    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(['template', 'foo/bar'], _file => {
        expect(_file('addon/templates/foo/bar.hbs')).to.equal('');
      }));
  });

  it('dummy template foo', function() {
    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(['template', 'foo', '--dummy'], _file => {
        expect(_file('tests/dummy/app/templates/foo.hbs')).to.equal('');
      }));
  });

  it('dummy template foo/bar', function() {
    return emberNew({ target: 'addon' })
      .then(() => emberGenerateDestroy(['template', 'foo/bar', '--dummy'], _file => {
        expect(_file('tests/dummy/app/templates/foo/bar.hbs')).to.equal('');
      }));
  });

  it('in-repo-addon template foo', function() {
    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(['template', 'foo', '--in-repo-addon=my-addon'], _file => {
        expect(_file('lib/my-addon/addon/templates/foo.hbs')).to.equal('');
      }));
  });

  it('in-repo-addon template foo/bar', function() {
    return emberNew({ target: 'in-repo-addon' })
      .then(() => emberGenerateDestroy(['template', 'foo/bar', '--in-repo-addon=my-addon'], _file => {
        expect(_file('lib/my-addon/addon/templates/foo/bar.hbs')).to.equal('');
      }));
  });
});
