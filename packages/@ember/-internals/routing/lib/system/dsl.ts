import { Factory } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { assign } from '@ember/polyfills';
import { MatchCallback } from 'route-recognizer';
import { EngineInfo, EngineRouteInfo } from './engines';

let uuid = 0;

interface DSLOptions {
  enableLoadingSubstates: boolean;
  overrideNameAssertion?: boolean;
  engineInfo?: EngineInfo;
  addRouteForEngine(name: string, routeOptions: EngineRouteInfo): void;
  resolveRouteMap(name: string): Factory<any, any>;
  path?: string;
}

interface RouteOptions {
  path?: string;
  resetNamespace?: boolean;
  serialize?: any;
  overrideNameAssertion?: boolean;
}

interface MountOptions {
  path?: string;
  as?: string;
  resetNamespace?: boolean;
}

class DSL {
  parent: string | null;
  matches: any[];
  enableLoadingSubstates: boolean;
  explicitIndex = false;
  options: DSLOptions;

  constructor(name: string | null = null, options: DSLOptions) {
    this.parent = name;
    this.enableLoadingSubstates = !!(options && options.enableLoadingSubstates);
    this.matches = [];
    this.options = options;
  }

  route(name: string, options: any = {}, callback?: MatchCallback) {
    let dummyErrorRoute = `/_unused_dummy_error_path_route_${name}/:error`;
    if (arguments.length === 2 && typeof options === 'function') {
      callback = options;
      options = {};
    }

    assert(
      `'${name}' cannot be used as a route name.`,
      (() => {
        if (options!.overrideNameAssertion === true) {
          return true;
        }

        return ['basic', 'application'].indexOf(name) === -1;
      })()
    );

    assert(
      `'${name}' is not a valid route name. It cannot contain a ':'. You may want to use the 'path' option instead.`,
      name.indexOf(':') === -1
    );

    if (this.enableLoadingSubstates) {
      createRoute(this, `${name}_loading`, {
        resetNamespace: options.resetNamespace,
      });
      createRoute(this, `${name}_error`, {
        resetNamespace: options.resetNamespace,
        path: dummyErrorRoute,
      });
    }

    if (callback) {
      let fullName = getFullName(this, name, options.resetNamespace);
      let dsl = new DSL(fullName, this.options);

      createRoute(dsl, 'loading');
      createRoute(dsl, 'error', { path: dummyErrorRoute });

      callback.call(dsl);

      createRoute(this, name, options, dsl.generate());
    } else {
      createRoute(this, name, options);
    }
  }

  push(url: string, name: string, callback?: MatchCallback, serialize?: any) {
    let parts = name.split('.');

    if (this.options.engineInfo) {
      let localFullName = name.slice(this.options.engineInfo.fullName.length + 1);
      let routeInfo: EngineRouteInfo = assign({ localFullName }, this.options.engineInfo);

      if (serialize) {
        routeInfo.serializeMethod = serialize;
      }

      this.options.addRouteForEngine(name, routeInfo);
    } else if (serialize) {
      throw new Error(
        `Defining a route serializer on route '${name}' outside an Engine is not allowed.`
      );
    }

    if (url === '' || url === '/' || parts[parts.length - 1] === 'index') {
      this.explicitIndex = true;
    }

    this.matches.push(url, name, callback);
  }

  generate(): MatchCallback {
    let dslMatches = this.matches;

    if (!this.explicitIndex) {
      this.route('index', { path: '/' });
    }

    return match => {
      for (let i = 0; i < dslMatches.length; i += 3) {
        match(dslMatches[i]).to(dslMatches[i + 1], dslMatches[i + 2]);
      }
    };
  }

  mount(_name: string, options: MountOptions = {}) {
    let engineRouteMap = this.options.resolveRouteMap(_name);
    let name = _name;

    if (options.as) {
      name = options.as;
    }

    let fullName = getFullName(this, name, options.resetNamespace);

    let engineInfo: EngineInfo = {
      name: _name,
      instanceId: uuid++,
      mountPoint: fullName,
      fullName,
    };

    let path = options.path;

    if (typeof path !== 'string') {
      path = `/${name}`;
    }

    let callback;
    let dummyErrorRoute = `/_unused_dummy_error_path_route_${name}/:error`;
    if (engineRouteMap) {
      let shouldResetEngineInfo = false;
      let oldEngineInfo = this.options.engineInfo;
      if (oldEngineInfo) {
        shouldResetEngineInfo = true;
        this.options.engineInfo = engineInfo;
      }

      let optionsForChild = assign({ engineInfo }, this.options);
      let childDSL = new DSL(fullName, optionsForChild);

      createRoute(childDSL, 'loading');
      createRoute(childDSL, 'error', { path: dummyErrorRoute });

      engineRouteMap.class.call(childDSL);

      callback = childDSL.generate();

      if (shouldResetEngineInfo) {
        this.options.engineInfo = oldEngineInfo;
      }
    }

    let localFullName = 'application';
    let routeInfo = assign({ localFullName }, engineInfo);

    if (this.enableLoadingSubstates) {
      // These values are important to register the loading routes under their
      // proper names for the Router and within the Engine's registry.
      let substateName = `${name}_loading`;
      let localFullName = `application_loading`;
      let routeInfo = assign({ localFullName }, engineInfo);
      createRoute(this, substateName, {
        resetNamespace: options.resetNamespace,
      });
      this.options.addRouteForEngine(substateName, routeInfo);

      substateName = `${name}_error`;
      localFullName = `application_error`;
      routeInfo = assign({ localFullName }, engineInfo);
      createRoute(this, substateName, {
        resetNamespace: options.resetNamespace,
        path: dummyErrorRoute,
      });
      this.options.addRouteForEngine(substateName, routeInfo);
    }

    this.options.addRouteForEngine(fullName, routeInfo);

    this.push(path, fullName, callback);
  }
}

export default DSL;

function canNest(dsl: DSL) {
  return dsl.parent !== 'application';
}

function getFullName(dsl: DSL, name: string, resetNamespace?: boolean) {
  if (canNest(dsl) && resetNamespace !== true) {
    return `${dsl.parent}.${name}`;
  } else {
    return name;
  }
}

function createRoute(dsl: DSL, name: string, options: RouteOptions = {}, callback?: MatchCallback) {
  let fullName = getFullName(dsl, name, options.resetNamespace);

  if (typeof options.path !== 'string') {
    options.path = `/${name}`;
  }

  dsl.push(options.path, fullName, callback, options.serialize);
}
