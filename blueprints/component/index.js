'use strict';

const chalk = require('chalk');
const stringUtil = require('ember-cli-string-utils');
const getPathOption = require('ember-cli-get-component-path-option');
const normalizeEntityName = require('ember-cli-normalize-entity-name');
const SilentError = require('silent-error');
const { generateComponentSignature } = require('../-utils');

const typescriptBlueprintPolyfill = require('ember-cli-typescript-blueprint-polyfill');

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
      default: '--no-component-class',
      aliases: [
        { cc: '@ember/component' },
        { gc: '@glimmer/component' },
        { tc: '@ember/component/template-only' },
        { nc: '' },
        { 'no-component-class': '' },
        { 'with-component-class': '@glimmer/component' },
      ],
    },
    {
      name: 'component-structure',
      type: ['flat', 'nested'],
      default: 'flat',
      aliases: [{ fs: 'flat' }, { ns: 'nested' }],
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

  init() {
    this._super && this._super.init.apply(this, arguments);
    typescriptBlueprintPolyfill(this);

    this.skippedJsFiles = new Set();
    this.savedLocals = {};
  },

  install(options) {
    // Normalize the `componentClass` option. This is usually handled for us,
    // but we wanted to show '--no-component-class' as the default so that is
    // what's passed to us literally if the user didn't override it.
    if (options.componentClass === '--no-component-class') {
      options.componentClass = '';
    }

    if (options.componentAuthoringFormat === 'strict') {
      if (options.componentClass === '@ember/component') {
        throw new SilentError(
          'The "@ember/component" component class cannot be used in combination with the "--strict" flag'
        );
      }

      if (options.componentClass === '') {
        options.componentClass = '@ember/component/template-only';
      }
    }

    return this._super.install.apply(this, arguments);
  },

  uninstall(options) {
    // Force the `componentClass` option to be non-empty. It doesn't really
    // matter what it is set to. All we want is to delete the optional JS
    // file if the user had created one (when using this generator, created
    // manually, added later with component-class generator...).
    options.componentClass = '@glimmer/component';

    return this._super.uninstall.apply(this, arguments);
  },

  beforeInstall(options, locals) {
    this.savedLocals = locals;
  },

  afterInstall(options) {
    this._super.afterInstall.apply(this, arguments);

    if (options.componentAuthoringFormat === 'loose') {
      this.skippedJsFiles.forEach((file) => {
        let mapped = this.mapFile(file, this.savedLocals);
        this.ui.writeLine(`  ${chalk.yellow('skip')} ${mapped}`);
      });

      if (this.skippedJsFiles.size > 0) {
        let command = `ember generate component-class ${options.entity.name}`;
        this.ui.writeLine(`  ${chalk.cyan('tip')} to add a class, run \`${command}\``);
      }
    }
  },

  fileMapTokens(options) {
    let commandOptions = this.options;

    if (commandOptions.componentStructure === 'flat') {
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
    } else if (commandOptions.componentStructure === 'nested') {
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

    if (this.options.componentClass === '') {
      files = files.filter((file) => {
        if (file.endsWith('.js') || file.endsWith('.ts')) {
          this.skippedJsFiles.add(file);
          return false;
        } else {
          return true;
        }
      });
    }
    if (this.options.componentAuthoringFormat === 'strict') {
      const strictFilesToRemove =
        this.options.isTypeScriptProject || this.options.typescript ? '.gjs' : '.gts';
      files = files.filter(
        (file) =>
          !(
            file.endsWith('.js') ||
            file.endsWith('.ts') ||
            file.endsWith('.hbs') ||
            file.endsWith(strictFilesToRemove)
          )
      );
    } else {
      files = files.filter((file) => !(file.endsWith('.gjs') || file.endsWith('.gts')));
    }

    return files;
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
      classifiedModuleName,
      importTemplate,
      importComponent,
      componentSignature,
      defaultExport,
      path: getPathOption(options),
      componentClass: options.componentClass,
    };
  },
};
