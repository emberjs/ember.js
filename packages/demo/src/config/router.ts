import EmberRouter from '@ember/routing/router';
import config from './env';
import type Controller from '@ember/controller';
import Route from '@ember/routing/route';
import { PrecompiledTemplate } from '@ember/template-compilation';
import { getOwner } from '@ember/application';

/*
  Here we use part of lazy-loading logic from https://github.com/embroider-build/embroider/blob/main/packages/router/src/index.ts
*/

export type HashReturnType = {
  route?: typeof Route | Promise<typeof Route>;
  controller?: typeof Controller | Promise<typeof Controller>;
  template?: PrecompiledTemplate | Promise<PrecompiledTemplate>;
};

class Router extends EmberRouter {
  static lazyRoutes: Record<string, () => HashReturnType> = {};
  location = config.locationType as 'history';
  rootURL = config.rootURL;
  loadedRoutes = new Set();

  // This is necessary in order to prevent the premature loading of lazy routes
  // when we are merely trying to render a link-to that points at them.
  // Unfortunately the stock query parameter behavior pulls on routes just to
  // check what their previous QP values were.
  _getQPMeta(handlerInfo: { name: string }, ...rest: unknown[]) {
    if (
      handlerInfo.name in Router.lazyRoutes &&
      !this.loadedRoutes.has(handlerInfo.name)
    ) {
      return undefined;
    }
    // @ts-expect-error extending private method
    return super._getQPMeta(handlerInfo, ...rest);
  }

  // This is the framework method that we're overriding to provide our own
  // handlerResolver.
  setupRouter(...args: unknown[]) {
    // @ts-expect-error extending private method
    const isSetup = super.setupRouter(...args);
    const microLib = (
      this as unknown as {
        // TODO: is there a way don't use the private route?
        /* eslint-disable ember/no-private-routing-service */
        _routerMicrolib: { getRoute: (name: string) => unknown };
      }
    )._routerMicrolib;
    microLib.getRoute = this._handlerResolver(microLib.getRoute.bind(microLib));
    return isSetup;
  }

  lazyBundle(name: string) {
    if (this.loadedRoutes.has(name)) {
      return null;
    }
    const routeResolver = Router.lazyRoutes[name];
    const owner = getOwner(this);
    if (routeResolver) {
      return {
        load: async () => {
          const hash = routeResolver();
          const keys = Object.keys(hash);
          const values = await Promise.all(keys.map((key) => hash[key]));
          keys.forEach((key, index) => {
            // owner.unregister(`${key}:${name}`);
            try {
              owner.register(`${key}:${name}`, values[index]);
            } catch (e) {
              // ignore
            }
          });
          this.loadedRoutes.add(name);
        },
        loaded: false,
      };
    }
    return null;
  }

  private _handlerResolver(original: (name: string) => unknown) {
    return (name: string) => {
      const bundle = this.lazyBundle(name);

      if (!bundle || bundle.loaded) {
        return original(name);
      }

      return bundle.load().then(
        () => {
          bundle.loaded = true;
          return original(name);
        },
        (err: Error) => {
          throw err;
        }
      );
    };
  }
}

export default Router;
