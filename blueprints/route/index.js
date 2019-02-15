'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const stringUtil = require('ember-cli-string-utils');
const EmberRouterGenerator = require('ember-router-generator');
const useEditionDetector = require('../edition-detector');
const isModuleUnificationProject = require('../module-unification').isModuleUnificationProject;

module.exports = useEditionDetector({
  description: 'Generates a route and a template, and registers the route with the router.',

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

  fileMapTokens: function() {
    if (isModuleUnificationProject(this.project)) {
      return {
        __root__(options) {
          if (options.pod) {
            throw new Error("Pods aren't supported within a module unification app");
          }
          if (options.inDummy) {
            return path.join('tests', 'dummy', 'src');
          }
          return 'src';
        },
        __path__(options) {
          return path.join('ui', 'routes', options.dasherizedModuleName);
        },
        __name__() {
          return 'route';
        },
        __templatepath__(options) {
          return path.join('ui', 'routes', options.dasherizedModuleName);
        },
        __templatename__() {
          return 'template';
        },
      };
    } else {
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
    }
  },

  locals: function(options) {
    let moduleName = options.entity.name;

    if (options.resetNamespace) {
      moduleName = moduleName.split('/').pop();
    }

    return {
      moduleName: stringUtil.dasherize(moduleName),
    };
  },

  shouldEntityTouchRouter: function(name) {
    let isIndex = name === 'index';
    let isBasic = name === 'basic';
    let isApplication = name === 'application';

    return !isBasic && !isIndex && !isApplication;
  },

  shouldTouchRouter: function(name, options) {
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

  afterInstall: function(options) {
    updateRouter.call(this, 'add', options);
  },

  afterUninstall: function(options) {
    updateRouter.call(this, 'remove', options);
  },
});

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

function findRouter(options) {
  let routerPathParts = [options.project.root];
  let root = isModuleUnificationProject(options.project) ? 'src' : 'app';

  if (options.dummy && options.project.isEmberCLIAddon()) {
    routerPathParts = routerPathParts.concat(['tests', 'dummy', root, 'router.js']);
  } else {
    routerPathParts = routerPathParts.concat([root, 'router.js']);
  }

  return routerPathParts;
}

function writeRoute(action, name, options) {
  let routerPath = path.join.apply(null, findRouter(options));
  let source = fs.readFileSync(routerPath, 'utf-8');

  let routes = new EmberRouterGenerator(source);
  let newRoutes = routes[action](name, options);

  fs.writeFileSync(routerPath, newRoutes.code());
}
