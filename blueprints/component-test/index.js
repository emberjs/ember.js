'use strict';

const path = require('path');
const stringUtil = require('ember-cli-string-utils');
const isPackageMissing = require('ember-cli-is-package-missing');
const getPathOption = require('ember-cli-get-component-path-option');
const semver = require('semver');

const typescriptBlueprintPolyfill = require('ember-cli-typescript-blueprint-polyfill');
const { modulePrefixForProject } = require('../-utils');

function invocationFor(options) {
  let parts = options.entity.name.split('/');
  return parts.map((p) => stringUtil.classify(p)).join('::');
}

function invocationForStrictComponentAuthoringFormat(options) {
  let parts = options.entity.name.split('/');
  let componentName = parts[parts.length - 1];
  return stringUtil.classify(componentName);
}

module.exports = {
  description: 'Generates a component integration or unit test.',

  shouldTransformTypeScript: true,

  init() {
    this._super && this._super.init.apply(this, arguments);
    typescriptBlueprintPolyfill(this);
  },

  availableOptions: [
    {
      name: 'test-type',
      type: ['integration', 'unit'],
      default: 'integration',
      aliases: [
        { i: 'integration' },
        { u: 'unit' },
        { integration: 'integration' },
        { unit: 'unit' },
      ],
    },
    {
      name: 'component-authoring-format',
      type: ['loose', 'strict'],
      default: 'loose',
      aliases: [
        { loose: 'loose' },
        { strict: 'strict' },
        { 'template-tag': 'strict' },
        { tt: 'strict' },
      ],
    },
  ],

  fileMapTokens: function () {
    return {
      __root__() {
        return 'tests';
      },
      __testType__(options) {
        return options.locals.testType || 'integration';
      },
      __path__(options) {
        if (options.pod) {
          return path.join(options.podPath, options.locals.path, options.dasherizedModuleName);
        }
        return 'components';
      },
    };
  },

  files() {
    let files = this._super.files.apply(this, arguments);

    if (this.options.componentAuthoringFormat === 'strict') {
      const strictFilesToRemove =
        this.options.isTypeScriptProject || this.options.typescript ? '.gjs' : '.gts';
      files = files.filter(
        (file) =>
          !(file.endsWith('.js') || file.endsWith('.ts') || file.endsWith(strictFilesToRemove))
      );
    } else {
      files = files.filter((file) => !(file.endsWith('.gjs') || file.endsWith('.gts')));
    }

    return files;
  },

  locals: function (options) {
    let dasherizedModuleName = stringUtil.dasherize(options.entity.name);
    let componentPathName = dasherizedModuleName;
    let testType = options.testType || 'integration';

    let friendlyTestDescription = [
      testType === 'unit' ? 'Unit' : 'Integration',
      'Component',
      dasherizedModuleName,
    ].join(' | ');

    if (options.pod && options.path !== 'components' && options.path !== '') {
      componentPathName = [options.path, dasherizedModuleName].filter(Boolean).join('/');
    }

    let hbsImportStatement = this._useNamedHbsImport()
      ? "import { hbs } from 'ember-cli-htmlbars';"
      : "import hbs from 'htmlbars-inline-precompile';";

    let templateInvocation =
      this.options.componentAuthoringFormat === 'strict'
        ? invocationForStrictComponentAuthoringFormat(options)
        : invocationFor(options);
    let componentName = templateInvocation;
    let openComponent = (descriptor) => `<${descriptor}>`;
    let closeComponent = (descriptor) => `</${descriptor}>`;
    let selfCloseComponent = (descriptor) => `<${descriptor} />`;

    return {
      modulePrefix: modulePrefixForProject(options.project),
      path: getPathOption(options),
      testType: testType,
      componentName,
      componentPathName,
      templateInvocation,
      openComponent,
      closeComponent,
      selfCloseComponent,
      friendlyTestDescription,
      hbsImportStatement,
      pkgName: options.project.pkg.name,
    };
  },

  _useNamedHbsImport() {
    let htmlbarsAddon = this.project.addons.find((a) => a.name === 'ember-cli-htmlbars');

    if (htmlbarsAddon && semver.gte(htmlbarsAddon.pkg.version, '4.0.0-alpha.1')) {
      return true;
    }

    return false;
  },

  afterInstall: function (options) {
    if (
      !options.dryRun &&
      options.testType === 'integration' &&
      !this._useNamedHbsImport() &&
      isPackageMissing(this, 'ember-cli-htmlbars-inline-precompile')
    ) {
      return this.addPackagesToProject([
        { name: 'ember-cli-htmlbars-inline-precompile', target: '^0.3.1' },
      ]);
    }
  },
};
