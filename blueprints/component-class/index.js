'use strict';

const SilentError = require('silent-error');
const stringUtil = require('ember-cli-string-utils');
const getPathOption = require('ember-cli-get-component-path-option');
const normalizeEntityName = require('ember-cli-normalize-entity-name');
const { has } = require('@ember/edition-utils');
const { generateComponentSignature } = require('../-utils');

const typescriptBlueprintPolyfill = require('ember-cli-typescript-blueprint-polyfill');

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
      type: ['flat', 'nested'],
      default: 'flat',
      aliases: [{ fs: 'flat' }, { ns: 'nested' }],
    },
  ],

  init() {
    this._super && this._super.init.apply(this, arguments);
    typescriptBlueprintPolyfill(this);

    let isOctane = has('octane');

    this.availableOptions.forEach((option) => {
      if (option.name === 'component-class') {
        if (isOctane) {
          option.default = '@glimmer/component';
        } else {
          option.default = '@ember/component';
        }
      } else if (option.name === 'component-structure') {
        option.type = ['flat', 'nested'];
        option.default = 'flat';
        option.aliases = [{ fs: 'flat' }, { ns: 'nested' }];
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

    if (commandOptions.componentStructure === 'flat') {
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

    let importComponent = '';
    let importTemplate = '';
    let defaultExport = '';
    let componentSignature = '';

    let componentClass = options.componentClass;

    switch (componentClass) {
      case '@ember/component':
        importComponent = `import Component from '@ember/component';`;
        defaultExport = `Component.extend({});`;
        break;
      case '@glimmer/component':
        importComponent = `import Component from '@glimmer/component';`;
        componentSignature = generateComponentSignature(classifiedModuleName);
        defaultExport = `class ${classifiedModuleName} extends Component<${classifiedModuleName}Signature> {}`;
        break;
      case '@ember/component/template-only':
        importComponent = `import templateOnly from '@ember/component/template-only';`;
        componentSignature = generateComponentSignature(classifiedModuleName);
        defaultExport = `templateOnly<${classifiedModuleName}Signature>();`;
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
