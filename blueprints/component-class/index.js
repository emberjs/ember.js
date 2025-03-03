'use strict';

const stringUtil = require('ember-cli-string-utils');
const getPathOption = require('ember-cli-get-component-path-option');
const normalizeEntityName = require('ember-cli-normalize-entity-name');
const { generateComponentSignature } = require('../-utils');

const typescriptBlueprintPolyfill = require('ember-cli-typescript-blueprint-polyfill');

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
      default: '@glimmer/component',
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

    switch (options.componentClass) {
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
      componentClass: options.componentClass,
    };
  },
};
