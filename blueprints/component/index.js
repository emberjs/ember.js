'use strict';

const chalk = require('chalk');
const path = require('path');
const SilentError = require('silent-error');
const stringUtil = require('ember-cli-string-utils');
const pathUtil = require('ember-cli-path-utils');
const getPathOption = require('ember-cli-get-component-path-option');
const normalizeEntityName = require('ember-cli-normalize-entity-name');
const { EOL } = require('os');
const { has } = require('@ember/edition-utils');
const { generateComponentSignature } = require('../-utils');

const maybePolyfillTypeScriptBlueprints = require('../-maybe-polyfill-typescript-blueprints');

const OCTANE = has('octane');

// TODO: this should be reading from the @ember/canary-features module
// need to refactor broccoli/features.js to be able to work more similarly
// to https://github.com/emberjs/data/pull/6231
const EMBER_GLIMMER_SET_COMPONENT_TEMPLATE = true;

// intentionally avoiding use-edition-detector
module.exports = {
  description: 'Generates a component.',

  shouldTransformTypeScript: true,

  availableOptions: [
    {
      name: 'path',
      type: String,
      default: 'components',
      aliases: [{ 'no-path': '' }],
    },
    {
      name: 'component-class',
      type: ['@ember/component', '@glimmer/component', '@ember/component/template-only', ''],
      default: OCTANE ? '--no-component-class' : '@ember/component',
      aliases: [
        { cc: '@ember/component' },
        { gc: '@glimmer/component' },
        { tc: '@ember/component/template-only' },
        { nc: '' },
        { 'no-component-class': '' },
        { 'with-component-class': OCTANE ? '@glimmer/component' : '@ember/component' },
      ],
    },
    {
      name: 'component-structure',
      type: OCTANE ? ['flat', 'nested', 'classic'] : ['classic'],
      default: OCTANE ? 'flat' : 'classic',
      aliases: OCTANE ? [{ fs: 'flat' }, { ns: 'nested' }, { cs: 'classic' }] : [{ cs: 'classic' }],
    },
  ],

  /**
    Flag to let us correctly handle the case where we are running against a
    version of Ember CLI which does not support TS-based emit, and where we
    therefore *must* not emit a `defaultExport` local which includes a type
    parameter in the exported function call or class definition.
   */
  _isUsingTS: false,

  init() {
    this._super && this._super.init.apply(this, arguments);
    this._isUsingTS = maybePolyfillTypeScriptBlueprints(this);
    let isOctane = has('octane');

    this.availableOptions.forEach((option) => {
      if (option.name === 'component-class') {
        if (isOctane) {
          option.default = '--no-component-class';
        } else {
          option.default = '@ember/component';
        }
      } else if (option.name === 'component-structure') {
        if (isOctane) {
          option.type = ['flat', 'nested', 'classic'];
          option.default = 'flat';
          option.aliases = [{ fs: 'flat' }, { ns: 'nested' }, { cs: 'classic' }];
        } else {
          option.type = ['classic'];
          option.default = 'classic';
          option.aliases = [{ cs: 'classic' }];
        }
      }
    });

    this.skippedJsFiles = new Set();
    this.savedLocals = {};

    this.EMBER_GLIMMER_SET_COMPONENT_TEMPLATE = EMBER_GLIMMER_SET_COMPONENT_TEMPLATE || isOctane;
  },

  install(options) {
    // Normalize the `componentClass` option. This is usually handled for us,
    // but we wanted to show '--no-component-class' as the default so that is
    // what's passed to us literally if the user didn't override it.
    if (options.componentClass === '--no-component-class') {
      options.componentClass = '';
    }

    if (!this.EMBER_GLIMMER_SET_COMPONENT_TEMPLATE) {
      if (options.componentClass !== '@ember/component') {
        throw new SilentError(
          'Usage of --component-class argument to `ember generate component` is only available on canary'
        );
      }

      if (options.componentStructure !== 'classic') {
        throw new SilentError(
          'Usage of --component-structure argument to `ember generate component` is only available on canary'
        );
      }
    }

    return this._super.install.apply(this, arguments);
  },

  uninstall(options) {
    // Force the `componentClass` option to be non-empty. It doesn't really
    // matter what it is set to. All we want is to delete the optional JS
    // file if the user had created one (when using this generator, created
    // manually, added later with component-class generator...).
    options.componentClass = '@ember/component';

    return this._super.uninstall.apply(this, arguments);
  },

  beforeInstall(options, locals) {
    this.savedLocals = locals;
  },

  afterInstall(options) {
    this._super.afterInstall.apply(this, arguments);

    this.skippedJsFiles.forEach((file) => {
      let mapped = this.mapFile(file, this.savedLocals);
      this.ui.writeLine(`  ${chalk.yellow('skip')} ${mapped}`);
    });

    if (this.skippedJsFiles.size > 0) {
      let command = `ember generate component-class ${options.entity.name}`;
      this.ui.writeLine(`  ${chalk.cyan('tip')} to add a class, run \`${command}\``);
    }
  },

  fileMapTokens(options) {
    let commandOptions = this.options;

    if (commandOptions.pod) {
      return {
        __path__() {
          return path.join(options.podPath, options.locals.path, options.dasherizedModuleName);
        },
        __templatepath__() {
          return path.join(options.podPath, options.locals.path, options.dasherizedModuleName);
        },
        __templatename__() {
          return 'template';
        },
      };
    } else if (
      !this.EMBER_GLIMMER_SET_COMPONENT_TEMPLATE ||
      commandOptions.componentStructure === 'classic'
    ) {
      return {
        __path__() {
          return 'components';
        },
        __templatepath__() {
          return 'templates/components';
        },
        __templatename__() {
          return options.dasherizedModuleName;
        },
      };
    } else if (
      this.EMBER_GLIMMER_SET_COMPONENT_TEMPLATE &&
      commandOptions.componentStructure === 'flat'
    ) {
      return {
        __path__() {
          return 'components';
        },
        __templatepath__() {
          return 'components';
        },
        __templatename__() {
          return options.dasherizedModuleName;
        },
      };
    } else if (
      this.EMBER_GLIMMER_SET_COMPONENT_TEMPLATE &&
      commandOptions.componentStructure === 'nested'
    ) {
      return {
        __path__() {
          return `components/${options.dasherizedModuleName}`;
        },
        __name__() {
          return 'index';
        },
        __templatepath__() {
          return `components/${options.dasherizedModuleName}`;
        },
        __templatename__() {
          return `index`;
        },
      };
    }
  },

  files() {
    let files = this._super.files.apply(this, arguments);

    if (this.EMBER_GLIMMER_SET_COMPONENT_TEMPLATE && this.options.componentClass === '') {
      files = files.filter((file) => {
        if (file.endsWith('.js') || file.endsWith('.ts')) {
          this.skippedJsFiles.add(file);
          return false;
        } else {
          return true;
        }
      });
    }

    return files;
  },

  normalizeEntityName(entityName) {
    return normalizeEntityName(
      entityName.replace(/\.js$/, '') //Prevent generation of ".js.js" files
    );
  },

  locals(options) {
    // if we're in an addon, build import statement
    let templatePath = '';
    if (options.project.isEmberCLIAddon() || (options.inRepoAddon && !options.inDummy)) {
      if (options.pod) {
        templatePath = './template';
      } else {
        templatePath =
          pathUtil.getRelativeParentPath(options.entity.name) +
          'templates/components/' +
          stringUtil.dasherize(options.entity.name);
      }
    }

    let componentClass = this.EMBER_GLIMMER_SET_COMPONENT_TEMPLATE
      ? options.componentClass
      : '@ember/component';

    let sanitizedModuleName = options.entity.name.replace(/\//g, '-');
    let classifiedModuleName = stringUtil.classify(sanitizedModuleName);

    let importComponent = '';
    let importTemplate = '';
    let defaultExport = '';
    let componentSignature = '';

    switch (componentClass) {
      case '@ember/component':
        importComponent = `import Component from '@ember/component';`;
        if (templatePath) {
          importTemplate = `import layout from '${templatePath}';${EOL}`;
          defaultExport = `Component.extend({${EOL}  layout${EOL}});`;
        } else {
          defaultExport = `Component.extend({});`;
        }
        break;
      case '@glimmer/component':
        importComponent = `import Component from '@glimmer/component';`;
        if (this._isUsingTS) {
          componentSignature = generateComponentSignature(classifiedModuleName);
          defaultExport = `class ${classifiedModuleName} extends Component<${classifiedModuleName}Signature> {}`;
        } else {
          defaultExport = `class ${classifiedModuleName} extends Component {}`;
        }
        break;
      case '@ember/component/template-only':
        importComponent = `import templateOnly from '@ember/component/template-only';`;
        if (this._isUsingTS) {
          componentSignature = generateComponentSignature(classifiedModuleName);
          defaultExport = `templateOnly<${classifiedModuleName}Signature>();`;
        } else {
          defaultExport = `templateOnly();`;
        }
        break;
    }

    return {
      importTemplate,
      importComponent,
      componentSignature,
      defaultExport,
      path: getPathOption(options),
      componentClass: options.componentClass,
    };
  },
};
