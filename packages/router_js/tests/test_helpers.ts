import type { Route, Transition } from '../index';
import Router from '../index';
import type { Dict } from '../lib/core';
import type { IModel } from '../lib/route-info';
import RouteInfo, { UnresolvedRouteInfoByParam } from '../lib/route-info';
import type { PublicTransition } from '../lib/transition';
import { logAbort } from '../lib/transition';
import type { TransitionError } from '../lib/transition-state';
import type { UnrecognizedURLError } from '../lib/unrecognized-url-error';
import { isTransitionAborted } from '../lib/transition-aborted-error';

// A useful function to allow you to ignore transition errors in a testing context
export async function ignoreTransitionError(transition: Transition) {
  try {
    await transition;
  } catch {
    // if it errors we don't do anything
  }
}

function assertAbort(assert: Assert) {
  return function _assertAbort(e: Error) {
    assert.ok(isTransitionAborted(e), 'transition was redirected/aborted');
  };
}

function transitionToWithAbort(assert: Assert, router: Router<Route>, path: string) {
  return router.transitionTo(path).then(shouldNotHappen(assert), assertAbort(assert));
}

function replaceWith(router: Router<Route>, path: string) {
  return router.transitionTo.apply(router, [path]).method('replace');
}

function shouldNotHappen(assert: Assert, _message?: string) {
  let message = _message || 'this .then handler should not be called';
  return function _shouldNotHappen(error: any) {
    console.error(error.stack); // eslint-disable-line
    assert.ok(false, message);
    return error;
  };
}

export function isExiting(route: Route | string, routeInfos: RouteInfo<Route>[]) {
  for (let i = 0, len = routeInfos.length; i < len; ++i) {
    let routeInfo = routeInfos[i];
    if (routeInfo!.name === route || routeInfo!.route === route) {
      return false;
    }
  }
  return true;
}

function stubbedHandlerInfoFactory(name: string, props: Dict<unknown>) {
  let obj = Object.create(props);
  obj._handlerInfoType = name;
  return obj;
}

export {
  transitionToWithAbort,
  replaceWith,
  shouldNotHappen,
  stubbedHandlerInfoFactory,
  assertAbort,
};

export function createHandler<T extends IModel>(name: string, options?: Dict<unknown>): Route<T> {
  return Object.assign(
    { name, routeName: name, context: {}, names: [], handler: name, _internalName: name },
    options
  ) as unknown as Route<T>;
}

export class TestRouter<R extends Route = Route> extends Router<R> {
  didTransition() {}
  willTransition() {}
  updateURL(_url: string): void {}
  replaceURL(_url: string): void {}
  triggerEvent(
    _handlerInfos: RouteInfo<R>[],
    _ignoreFailure: boolean,
    _name: string,
    _args: any[]
  ) {}
  routeDidChange() {}
  routeWillChange() {}
  transitionDidError(error: TransitionError, transition: PublicTransition) {
    if (error.wasAborted || transition.isAborted) {
      return logAbort(transition);
    } else {
      transition.trigger(false, 'error', error.error, this, error.route);
      transition.abort();
      return error.error;
    }
  }
  getRoute(_name: string): any {
    return {};
  }
  getSerializer(_name: string): any {
    return () => {};
  }
}

export function createHandlerInfo(name: string, options: Dict<unknown> = {}): RouteInfo<Route> {
  class Stub extends RouteInfo<Route> {
    constructor(name: string, router: Router<Route>, handler?: Route) {
      super(router, name, [], handler);
    }
    getModel(_transition: Transition) {
      return {} as any;
    }
    getUnresolved() {
      return new UnresolvedRouteInfoByParam(this.router, 'empty', [], {});
    }
  }

  let handler = (options['handler'] as Route) || createHandler('foo');
  delete options['handler'];

  Object.assign(Stub.prototype, options);
  let stub = new Stub(name, new TestRouter(), handler);
  return stub;
}

export function trigger(
  handlerInfos: RouteInfo<Route>[],
  ignoreFailure: boolean,
  name: string,
  ...args: any[]
) {
  if (!handlerInfos) {
    if (ignoreFailure) {
      return;
    }
    throw new Error("Could not trigger event '" + name + "'. There are no active handlers");
  }

  let eventWasHandled = false;

  for (let i = handlerInfos.length - 1; i >= 0; i--) {
    let currentHandlerInfo = handlerInfos[i]!,
      currentHandler = currentHandlerInfo.route;

    // If there is no handler, it means the handler hasn't resolved yet which
    // means that we should trigger the event later when the handler is available
    if (!currentHandler) {
      currentHandlerInfo.routePromise!.then(function (resolvedHandler) {
        if (resolvedHandler.events?.[name]) {
          resolvedHandler.events[name].apply(resolvedHandler, args);
        }
      });
      continue;
    }

    if (currentHandler.events && currentHandler.events[name]) {
      if (currentHandler.events[name].apply(currentHandler, args) === true) {
        eventWasHandled = true;
      } else {
        return;
      }
    }
  }

  // In the case that we got an UnrecognizedURLError as an event with no handler,
  // let it bubble up
  if (name === 'error' && (args[0] as UnrecognizedURLError)!.name === 'UnrecognizedURLError') {
    throw args[0];
  } else if (!eventWasHandled && !ignoreFailure) {
    throw new Error("Nothing handled the event '" + name + "'.");
  }
}
