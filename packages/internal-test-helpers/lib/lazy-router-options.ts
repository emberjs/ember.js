import { Router } from '@ember/-internals/routing';
import { isDestroying } from '@glimmer/destroyable';
import RSVP from 'rsvp';

export default class LazyRouter extends Router {
  location = 'none';
  setupRouter(): boolean {
    const result = super.setupRouter();
    let getRoute = this._routerMicrolib.getRoute;
    this._enginePromises = Object.create(null);
    this._resolvedEngines = Object.create(null);

    let routes = new Map();
    let routePromises = new Map();
    this._routerMicrolib.getRoute = (name) => {
      if (routes.has(name)) {
        return routes.get(name);
      }

      if (routePromises.has(name)) {
        return routePromises.get(name);
      }

      let promise = new RSVP.Promise((resolve) => {
        setTimeout(() => {
          if (isDestroying(this)) {
            return;
          }

          let route = getRoute(name);

          routes.set(name, route);
          resolve(route);
        }, 10);
      });
      routePromises.set(name, promise);

      return promise;
    };
    return result;
  }
}
