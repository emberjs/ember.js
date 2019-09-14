'use strict';

const path = require('path');
const SilentError = require('silent-error');
const stringUtil = require('ember-cli-string-utils');
const pathUtil = require('ember-cli-path-utils');
const getPathOption = require('ember-cli-get-component-path-option');
const normalizeEntityName = require('ember-cli-normalize-entity-name');
const { isModuleUnificationProject } = require('../module-unification');
const { EOL } = require('os');

const OCTANE = process.env.EMBER_VERSION === 'octane';

// TODO: this should be reading from the @ember/canary-features module
// need to refactor broccoli/features.js to be able to work more similarly
// to https://github.com/emberjs/data/pull/6231
const EMBER_GLIMMER_SET_COMPONENT_TEMPLATE = true;

// intentionally avoiding use-edition-detector
module.exports = {
  description: 'Generates a component class.',

  availableOptions: [
    {
      name: 'path',
      type: String,
      default: 'components',
      aliases: [{ 'no-path': '' }],
    },
    {
      name: 'component-class',
      type: ['@ember/component', '@glimmer/component', ''],
      default: OCTANE ? '@glimmer/component' : '@ember/component',
      aliases: [{ cc: '@ember/component' }, { gc: '@glimmer/component' }],
    },
    {
      name: 'component-structure',
      type: ['flat', 'nested', 'classic'],
      default: OCTANE ? 'flat' : 'classic',
      aliases: [{ fs: 'flat' }, { ns: 'nested' }, { cs: 'classic' }],
    },
  ],

  init() {
    this._super && this._super.init.apply(this, arguments);
    let isOctane = process.env.EMBER_VERSION === 'OCTANE';

    this.availableOptions.forEach(option => {
      if (option.name === 'component-class') {
        if (isOctane) {
          option.default = '@glimmer/component';
        } else {
          option.default = '@ember/component';
        }
      } else if (option.name === 'component-structure') {
        option.default = isOctane ? 'flat' : 'classic';
      }
    });

    this.EMBER_GLIMMER_SET_COMPONENT_TEMPLATE = EMBER_GLIMMER_SET_COMPONENT_TEMPLATE || isOctane;
  },

  install(options) {
    if (!this.EMBER_GLIMMER_SET_COMPONENT_TEMPLATE) {
      if (options.componentStructure !== 'classic') {
        throw new SilentError(
          'Usage of --component-structure argument to `ember generate component` is only available on canary'
        );
      }
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
      };
    } else if (
      !this.EMBER_GLIMMER_SET_COMPONENT_TEMPLATE ||
      commandOptions.componentStructure === 'classic'
    ) {
      return {
        __path__() {
          return 'components';
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
    let contents = '';

    if (!isModuleUnificationProject(this.project)) {
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
        importTemplate = "import layout from '" + templatePath + "';" + EOL;
        contents = EOL + '  layout';
      }
    }

    let componentClass = this.EMBER_GLIMMER_SET_COMPONENT_TEMPLATE
      ? options.componentClass
      : '@ember/component';

    switch (componentClass) {
      case '@ember/component':
        importComponent = `import Component from '@ember/component';`;
        defaultExport = `Component.extend({${contents}\n});`;
        break;
      case '@glimmer/component':
        importComponent = `import Component from '@glimmer/component';`;
        defaultExport = `class ${classifiedModuleName}Component extends Component {\n}`;
        break;
      case '':
      case '@ember/component/template-only':
        importComponent = `import templateOnly from '@ember/component/template-only';`;
        defaultExport = `templateOnly();`;
        break;
    }

    return {
      importTemplate,
      importComponent,
      defaultExport,
      path: getPathOption(options),
      componentClass: options.componentClass,
    };
  },
};
