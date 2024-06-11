'use strict';

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
  description: 'Generates a component class.',

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
      type: ['@ember/component', '@glimmer/component', '@ember/component/template-only'],
      default: OCTANE ? '@glimmer/component' : '@ember/component',
      aliases: [
        { cc: '@ember/component' },
        { gc: '@glimmer/component' },
        { tc: '@ember/component/template-only' },
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
          option.default = '@glimmer/component';
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

    this.EMBER_GLIMMER_SET_COMPONENT_TEMPLATE = EMBER_GLIMMER_SET_COMPONENT_TEMPLATE || isOctane;
  },

  install() {
    if (!this.EMBER_GLIMMER_SET_COMPONENT_TEMPLATE) {
      throw new SilentError(
        'Usage of `ember generate component-class` is only available on canary'
      );
    }

    return this._super.install.apply(this, arguments);
  },

  fileMapTokens(options) {
    let commandOptions = this.options;

    if (commandOptions.pod) {
      return {
        __path__() {
          return path.join(options.podPath, options.locals.path, options.dasherizedModuleName);
        },
        __name__() {
          return 'component';
        },
      };
    } else if (
      commandOptions.componentStructure === 'classic' ||
      commandOptions.componentStructure === 'flat'
    ) {
      return {
        __path__() {
          return 'components';
        },
      };
    } else if (commandOptions.componentStructure === 'nested') {
      return {
        __path__() {
          return `components/${options.dasherizedModuleName}`;
        },
        __name__() {
          return 'index';
        },
      };
    }
  },

  normalizeEntityName(entityName) {
    return normalizeEntityName(
      entityName.replace(/\.js$/, '') //Prevent generation of ".js.js" files
    );
  },

  locals(options) {
    let sanitizedModuleName = options.entity.name.replace(/\//g, '-');
    let classifiedModuleName = stringUtil.classify(sanitizedModuleName);

    let templatePath = '';
    let importComponent = '';
    let importTemplate = '';
    let defaultExport = '';
    let componentSignature = '';

    // if we're in an addon, build import statement
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

    let componentClass = options.componentClass;

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
      componentClass,
    };
  },
};
