import DebugPort from './debug-port';
import classify from '@ember/debug/ember-inspector-support/utils/classify';
import dasherize from '@ember/debug/ember-inspector-support/utils/dasherize';
import { _backburner, later } from '@ember/runloop';
import bound from '@ember/debug/ember-inspector-support/utils/bound-method';

const { hasOwnProperty } = Object.prototype;

export default class RouteDebug extends DebugPort {
  _cachedRouteTree = null;
  private __currentURL: any;
  private __currentRouter: any;
  init() {
    super.init();
    this.__currentURL = this.currentURL;
    this.__currentRouter = this.router;
    _backburner.on('end', bound(this, this.checkForUpdate));
  }

  checkForUpdate() {
    if (this.__currentURL !== this.currentURL) {
      this.sendCurrentRoute();
      this.__currentURL = this.currentURL;
    }
    if (this.__currentRouter !== this.router) {
      this._cachedRouteTree = null;
      this.__currentRouter = this.router;
    }
  }

  willDestroy() {
    _backburner.off('end', bound(this, this.checkForUpdate));
    super.willDestroy();
  }

  get router() {
    if (this.namespace?.owner.isDestroyed || this.namespace?.owner.isDestroying) {
      return null;
    }
    return this.namespace?.owner.lookup('router:main');
  }

  get currentPath() {
    return this.namespace?.owner.router.currentPath;
  }
  get currentURL() {
    return this.namespace?.owner.router.currentURL;
  }

  get emberCliConfig() {
    return this.namespace?.generalDebug.emberCliConfig;
  }

  static {
    this.prototype.portNamespace = 'route';
    this.prototype.messages = {
      getTree(this: RouteDebug) {
        this.sendTree();
      },
      getCurrentRoute(this: RouteDebug) {
        this.sendCurrentRoute();
      },
    };
  }

  sendCurrentRoute() {
    const { currentPath: name, currentURL: url } = this;
    later(() => {
      this.sendMessage('currentRoute', { name, url });
    }, 50);
  }

  get routeTree() {
    if (this.namespace?.owner.isDestroyed || this.namespace?.owner.isDestroying) {
      return null;
    }
    if (!this._cachedRouteTree && this.router) {
      const router = this.router;
      const routerLib = router._routerMicrolib || router.router;
      let routeNames = routerLib.recognizer.names;
      let routeTree: Record<any, any> = {};
      for (let routeName in routeNames) {
        if (!hasOwnProperty.call(routeNames, routeName)) {
          continue;
        }
        let route = routeNames[routeName];
        this.buildSubTree(routeTree, route);
      }
      this._cachedRouteTree = arrayizeChildren({ children: routeTree });
    }
    return this._cachedRouteTree;
  }

  sendTree() {
    let routeTree;
    let error;
    try {
      routeTree = this.routeTree;
    } catch (e: any) {
      error = e.message;
    }
    this.sendMessage('routeTree', { tree: routeTree, error });
  }

  getClassName(name: string, type: string) {
    let container = this.namespace.owner;
    let resolver = container.application.__registry__.resolver;
    let prefix = this.emberCliConfig?.modulePrefix;
    let podPrefix = this.emberCliConfig?.podModulePrefix;
    let usePodsByDefault = this.emberCliConfig?.usePodsByDefault;
    let className;
    if (prefix || podPrefix) {
      // Uses modules
      name = dasherize(name);
      let fullName = `${type}:${name}`;
      if (resolver.lookupDescription) {
        className = resolver.lookupDescription(fullName);
      } else if (resolver.describe) {
        className = resolver.describe(fullName);
      }
      if (className === fullName) {
        // full name returned as is - this resolver does not look for the module.
        className = className.replace(new RegExp(`^${type}:`), '');
      } else if (className) {
        // Module exists and found
        className = className.replace(new RegExp(`^/?(${prefix}|${podPrefix})/${type}s/`), '');
      } else {
        // Module does not exist
        if (usePodsByDefault) {
          // we don't include the prefix since it's redundant
          // and not part of the file path.
          // (podPrefix - prefix) is part of the file path.
          let currentPrefix = '';
          if (podPrefix) {
            currentPrefix = podPrefix.replace(new RegExp(`^/?${prefix}/?`), '');
          }
          className = `${currentPrefix}/${name}/${type}`;
        } else {
          className = name.replace(/\./g, '/');
        }
      }
      className = className.replace(/\./g, '/');
    } else {
      // No modules
      if (type !== 'template') {
        className = classify(`${name.replace(/\./g, '_')}_${type}`);
      } else {
        className = name.replace(/\./g, '/');
      }
    }
    return className;
  }

  buildSubTree(routeTree: Record<any, any>, route: { handlers: any; segments: string[] }) {
    let handlers = route.handlers;
    let owner = this.namespace.owner;
    let subTree = routeTree;
    let item;
    let routeClassName;
    let routeHandler;
    let controllerName;
    let controllerClassName;
    let templateName;
    let controllerFactory;

    for (let i = 0; i < handlers.length; i++) {
      item = handlers[i];
      let handler = item.handler;
      if (handler.match(/(loading|error)$/)) {
        // make sure it has been defined before calling `getHandler` because
        // we don't want to generate sub routes as this has side-effects.
        if (!routeHasBeenDefined(owner, handler)) {
          continue;
        }
      }

      if (subTree[handler] === undefined) {
        routeClassName = this.getClassName(handler, 'route');

        const router = this.router;
        const routerLib = router._routerMicrolib || router.router;
        // 3.9.0 removed intimate APIs from router
        // https://github.com/emberjs/ember.js/pull/17843
        // https://deprecations.emberjs.com/v3.x/#toc_remove-handler-infos
        routeHandler = routerLib.getRoute(handler);

        // Skip when route is an unresolved promise
        if (typeof routeHandler?.then === 'function') {
          // ensure we rebuild the route tree when this route is resolved
          routeHandler.then(() => (this._cachedRouteTree = null));
          controllerName = '(unresolved)';
          controllerClassName = '(unresolved)';
          templateName = '(unresolved)';
        } else {
          const get =
            routeHandler.get ||
            function (this: any, prop: any) {
              return this[prop];
            };
          controllerName = get.call(routeHandler, 'controllerName') || routeHandler.routeName;
          controllerFactory = owner.factoryFor
            ? owner.factoryFor(`controller:${controllerName}`)
            : owner._lookupFactory(`controller:${controllerName}`);
          controllerClassName = this.getClassName(controllerName, 'controller');
          templateName = this.getClassName(handler, 'template');
        }

        subTree[handler] = {
          value: {
            name: handler,
            routeHandler: {
              className: routeClassName,
              name: handler,
            },
            controller: {
              className: controllerClassName,
              name: controllerName,
              exists: Boolean(controllerFactory),
            },
            template: {
              name: templateName,
            },
          },
        };

        if (i === handlers.length - 1) {
          // it is a route, get url
          subTree[handler].value.url = getURL(owner, route.segments);
          subTree[handler].value.type = 'route';
        } else {
          // it is a resource, set children object
          subTree[handler].children = {};
          subTree[handler].value.type = 'resource';
        }
      }
      subTree = subTree[handler].children;
    }
  }
}

function arrayizeChildren(routeTree: { value?: any; children: Record<any, any> }) {
  let obj: any = {};
  // Top node doesn't have a value
  if (routeTree.value) {
    obj.value = routeTree.value;
  }

  if (routeTree.children) {
    let childrenArray = [];
    for (let i in routeTree.children) {
      let route = routeTree.children[i];
      childrenArray.push(arrayizeChildren(route));
    }
    obj.children = childrenArray;
  }

  return obj;
}

/**
 *
 * @param {*} container
 * @param {*} segments
 * @return {String}
 */
function getURL(container: any, segments: any) {
  const locationImplementation = container.lookup('router:main').location;
  let url: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    let name = null;

    if (typeof segments[i].generate !== 'function') {
      let { type, value } = segments[i];
      if (type === 1) {
        // dynamic
        name = `:${value}`;
      } else if (type === 2) {
        // star
        name = `*${value}`;
      } else {
        name = value;
      }
    }

    if (name) {
      url.push(name);
    }
  }

  let fullUrl = url.join('/');

  if (fullUrl.match(/_unused_dummy_/)) {
    fullUrl = '';
  } else {
    fullUrl = `/${fullUrl}`;
    fullUrl = locationImplementation.formatURL(fullUrl);
  }

  return fullUrl;
}

/**
 *
 * @param {String} owner
 * @param {String} name
 * @return {Void}
 */
function routeHasBeenDefined(owner: any, name: string) {
  return owner.hasRegistration(`template:${name}`) || owner.hasRegistration(`route:${name}`);
}
