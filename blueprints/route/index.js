'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const stringUtil = require('ember-cli-string-utils');
const EmberRouterGenerator = require('ember-router-generator');
const SilentError = require('silent-error');

const typescriptBlueprintPolyfill = require('ember-cli-typescript-blueprint-polyfill');

module.exports = {
  description: 'Generates a route and a template, and registers the route with the router.',

  shouldTransformTypeScript: true,

  availableOptions: [
    {
      name: 'path',
      type: String,
      default: '',
    },
    {
      name: 'skip-router',
      type: Boolean,
      default: false,
    },
    {
      name: 'reset-namespace',
      type: Boolean,
    },
  ],

  init() {
    this._super && this._super.init.apply(this, arguments);
    typescriptBlueprintPolyfill(this);
  },

  fileMapTokens: function () {
    return {
      __name__(options) {
        if (options.pod) {
          return 'route';
        }
        return options.locals.moduleName;
      },
      __path__(options) {
        if (options.pod) {
          return path.join(options.podPath, options.locals.moduleName);
        }
        return 'routes';
      },
      __templatepath__(options) {
        if (options.pod) {
          return path.join(options.podPath, options.locals.moduleName);
        }
        return 'templates';
      },
      __templatename__(options) {
        if (options.pod) {
          return 'template';
        }
        return options.locals.moduleName;
      },
      __root__(options) {
        if (options.inRepoAddon) {
          return path.join('lib', options.inRepoAddon, 'addon');
        }

        if (options.inDummy) {
          return path.join('tests', 'dummy', 'app');
        }

        if (options.inAddon) {
          return 'addon';
        }

        return 'app';
      },
    };
  },

  locals: function (options) {
    let moduleName = options.entity.name;
    let rawRouteName = moduleName.split('/').pop();
    let emberPageTitleExists = 'ember-page-title' in options.project.dependencies();
    let hasDynamicSegment = options.path && options.path.includes(':');

    if (options.resetNamespace) {
      moduleName = rawRouteName;
    }

    return {
      moduleName: stringUtil.dasherize(moduleName),
      routeName: stringUtil.classify(rawRouteName),
      addTitle: emberPageTitleExists,
      hasDynamicSegment,
    };
  },

  shouldEntityTouchRouter: function (name) {
    let isIndex = name === 'index';
    let isBasic = name === 'basic';
    let isApplication = name === 'application';

    return !isBasic && !isIndex && !isApplication;
  },

  shouldTouchRouter: function (name, options) {
    let entityTouchesRouter = this.shouldEntityTouchRouter(name);
    let isDummy = Boolean(options.dummy);
    let isAddon = Boolean(options.project.isEmberCLIAddon());
    let isAddonDummyOrApp = isDummy === isAddon;

    return (
      entityTouchesRouter &&
      isAddonDummyOrApp &&
      !options.dryRun &&
      !options.inRepoAddon &&
      !options.skipRouter
    );
  },

  afterInstall: function (options) {
    updateRouter.call(this, 'add', options);
  },

  afterUninstall: function (options) {
    updateRouter.call(this, 'remove', options);
  },
  normalizeEntityName: function (entityName) {
    return entityName.replace(/\.js$/, ''); //Prevent generation of ".js.js" files
  },
};

function updateRouter(action, options) {
  let entity = options.entity;
  let actionColorMap = {
    add: 'green',
    remove: 'red',
  };
  let color = actionColorMap[action] || 'gray';

  if (this.shouldTouchRouter(entity.name, options)) {
    writeRoute(action, entity.name, options);

    this.ui.writeLine('updating router');
    this._writeStatusToUI(chalk[color], action + ' route', entity.name);
  }
}

function findRouterPath(options) {
  let routerPathParts = [options.project.root];

  if (options.dummy && options.project.isEmberCLIAddon()) {
    routerPathParts.push('tests', 'dummy', 'app');
  } else {
    routerPathParts.push('app');
  }

  let jsRouterPath = path.join(...routerPathParts, 'router.js');
  let tsRouterPath = path.join(...routerPathParts, 'router.ts');

  let jsRouterPathExists = fs.existsSync(jsRouterPath);
  let tsRouterPathExists = fs.existsSync(tsRouterPath);

  if (jsRouterPathExists && tsRouterPathExists) {
    throw new SilentError(
      'Found both a `router.js` and `router.ts` file. Please make sure your project only has one or the other.'
    );
  }

  if (jsRouterPathExists) {
    return jsRouterPath;
  }

  if (tsRouterPathExists) {
    return tsRouterPath;
  }

  throw new SilentError(
    'Could not find a router file. Please make sure your project has a `router.js` or `router.ts` file.'
  );
}

function writeRoute(action, name, options) {
  let routerPath = findRouterPath(options);
  let source = fs.readFileSync(routerPath, 'utf-8');

  let routes = new EmberRouterGenerator(source);
  let newRoutes = routes[action](name, options);

  fs.writeFileSync(routerPath, newRoutes.code());
}
