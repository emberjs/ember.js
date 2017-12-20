import { Map } from 'ember-metal';

const privateRouteInfos = new WeakMap();

export function privateAccess(routeInfo) {
  return privateRouteInfos.get(routeInfo);
}

class PrivateRouteInfo {
  constructor(routeName, childRoute, params, queryParams, data) {
    this.name = routeName;
    this.child = childRoute;
    this.params = params;
    this.queryParams = queryParams;
    this.data = data;
    this.parent = null;
    this.outlets = null;
    this.controller = null,
    this.template = null;
    this.templateName = null;
    this.orphanCheck = null;
  }

  // the public constructor can set `child`, which is the child route
  // that goes into the "main" outlet. But this (private) method can
  // set any other outlet name too.
  getChild(name) {
    if (name === 'main') {
      return this.child;
    } else {
      let outlets = this.outlets;
      if (outlets) {
        return outlets[name];
      }
    }
  }

  setChild(thisPublic, name, routeInfo) {
    privateAccess(routeInfo).parent = thisPublic;
    if (name === 'main') {
      this.child = routeInfo;
    } else {
      let outlets = this.outlets;
      if (!outlets) {
        outlets = this.outlets = Object.create(null);
      }
      outlets[name] = routeInfo;
    }
  }

  // this is for legacy {{render}} helper support
  checkIfUsed(checker) {
    this.orphanCheck = checker;
  }

  // this is for legacy {{render}} helper support
  markAsUsed() {
    if (this.orphanCheck) {
      this.orphanCheck.wasUsed = true;
    }
  }
}

export default class RouteInfo {
  // routeName: string, childRoute?: RouteInfo, params?: Map, queryParams?: Map, data?: object
  constructor(routeName, childRoute, params, queryParams, data) {
    privateRouteInfos.set(
      this,
      new PrivateRouteInfo(routeName,
                           childRoute,
                           params || new Map(),
                           queryParams || new Map(),
                           data)
    );
  }

  get name() {
    return privateAccess(this).name;
  }

  get localName() {
    let parts = this.name.split('.');
    return parts[parts.length - 1];
  }

  get params() {
    return privateAccess(this).params;
  }

  get queryParams() {
    return privateAccess(this).queryParams;
  }

  get child() {
    return privateAccess(this).child;
  }

  get parent() {
    return privateAccess(this).parent;
  }

  get data() {
    return privateAccess(this).data;
  }
}
