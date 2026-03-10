import Backburner from 'backburner';
import Router, { Route, Transition } from 'router';
import { Dict } from 'router/core';
import RouteInfo, { IModel, UnresolvedRouteInfoByParam } from 'router/route-info';
import { logAbort, PublicTransition } from 'router/transition';
import { TransitionError } from 'router/transition-state';
import { UnrecognizedURLError } from 'router/unrecognized-url-error';
import { configure, resolve } from 'rsvp';
import { isTransitionAborted } from 'router/transition-aborted-error';

QUnit.config.testTimeout = 1000;

let bb = new Backburner(['promises']);
function customAsync(callback: (...args: unknown[]) => unknown, promise: Promise<unknown>) {
  bb.defer('promises', promise, callback, promise);
}

function flushBackburner() {
  bb.end();
  bb.begin();
}

let test = QUnit.test;

function module(name: string, options?: any) {
  options = options || {};
  QUnit.module(name, {
    beforeEach: function (...args: unknown[]) {
      configure('async', customAsync);
      bb.begin();

      if (options.setup) {
        options.setup.apply(this, args);
      }
    },
    afterEach: function (...args: unknown[]) {
      bb.end();

      if (options.teardown) {
        options.teardown.apply(this, args);
      }
    },
  });
}

function assertAbort(assert: Assert) {
  return function _assertAbort(e: Error) {
    assert.ok(isTransitionAborted(e), 'transition was redirected/aborted');
  };
}

// Helper method that performs a transition and flushes
// the backburner queue. Helpful for when you want to write
// tests that avoid .then callbacks.
function transitionTo(
  router: Router<Route>,
  path: string | { queryParams: Dict<unknown> },
  ...context: any[]
) {
  let result = router.transitionTo.apply(router, [path, ...context]);
  flushBackburner();
  return result;
}

function transitionToWithAbort(assert: Assert, router: Router<Route>, path: string) {
  router.transitionTo(path).then(shouldNotHappen(assert), assertAbort(assert));
  flushBackburner();
}

function replaceWith(router: Router<Route>, path: string) {
  let result = router.transitionTo.apply(router, [path]).method('replace');
  flushBackburner();
  return result;
}

function handleURL(router: Router<Route>, url: string) {
  let result = router.handleURL.apply(router, [url]);
  flushBackburner();
  return result;
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
    if (routeInfo.name === route || routeInfo.route === route) {
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

module('backburner sanity test');

test('backburnerized testing works as expected', function (assert) {
  assert.expect(1);
  resolve('hello').then(function (word: string) {
    assert.equal(word, 'hello', 'backburner flush in teardown resolved this promise');
  });
});

export {
  module,
  test,
  flushBackburner,
  handleURL,
  transitionTo,
  transitionToWithAbort,
  replaceWith,
  shouldNotHappen,
  stubbedHandlerInfoFactory,
  assertAbort,
};

export function createHandler<T extends IModel>(name: string, options?: Dict<unknown>): Route<T> {
  return (Object.assign(
    { name, routeName: name, context: {}, names: [], handler: name, _internalName: name },
    options
  ) as unknown) as Route<T>;
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

  let handler = (options.handler as Route) || createHandler('foo');
  delete options.handler;

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
    let currentHandlerInfo = handlerInfos[i],
      currentHandler = currentHandlerInfo.route;

    // If there is no handler, it means the handler hasn't resolved yet which
    // means that we should trigger the event later when the handler is available
    if (!currentHandler) {
      currentHandlerInfo.routePromise!.then(function (resolvedHandler) {
        resolvedHandler.events![name].apply(resolvedHandler, args);
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
