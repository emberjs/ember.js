import { getOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import type { DecoratorPropertyDescriptor, ElementDescriptor } from './decorator';
import { isElementDescriptor } from './decorator';

export let DEBUG_INJECTION_FUNCTIONS: WeakMap<Function, any>;

if (DEBUG) {
  DEBUG_INJECTION_FUNCTIONS = new WeakMap();
}

/**
  The computed-free implementation of `@service` (and `@controller`) used by
  builds without the classic object model. The decorator produces a plain
  accessor descriptor: on first read it looks the injection up on the owner
  and caches it as an own, non-enumerable data property. Assignment (before or
  after first read) installs an override the same way, preserving the classic
  behavior of injections being settable for tests.

  Native-class usage only: unlike the classic implementation this decorator is
  not registered with the classic decorator system, so it cannot appear in
  `EmberObject.extend({ ... })` bodies.

  @private
*/
function inject(type: string, name: string): PropertyDecorator;
function inject(type: string): PropertyDecorator;
function inject(type: string, ...args: [ElementDescriptor[0], ElementDescriptor[1]]): void;
function inject(type: string, ...args: ElementDescriptor): DecoratorPropertyDescriptor;
function inject(
  type: string,
  ...args: [] | [name: string] | ElementDescriptor
): PropertyDecorator | DecoratorPropertyDescriptor | void;
function inject(
  type: string,
  ...args: [] | [name: string] | ElementDescriptor
): PropertyDecorator | DecoratorPropertyDescriptor | void {
  assert('a string type must be provided to inject', typeof type === 'string');

  let elementDescriptor;
  let name: string | undefined;

  if (isElementDescriptor(args)) {
    elementDescriptor = args;
  } else if (typeof args[0] === 'string') {
    name = args[0];
  }

  let decorator = (
    _target: object,
    propertyName: string,
    _desc?: DecoratorPropertyDescriptor
  ): DecoratorPropertyDescriptor => {
    let getInjection = function (this: object): unknown {
      let owner = getOwner(this);

      assert(
        `Attempting to lookup an injected property on an object without a container, ensure that the object was instantiated via a container.`,
        owner !== undefined
      );

      let injection = owner.lookup(`${type}:${name || propertyName}`);
      cacheInjection(this, propertyName, injection);
      return injection;
    };

    if (DEBUG) {
      DEBUG_INJECTION_FUNCTIONS.set(getInjection, { type, name });
    }

    return {
      enumerable: false,
      configurable: true,
      get: getInjection,
      set(this: object, value: unknown) {
        cacheInjection(this, propertyName, value);
      },
    };
  };

  if (elementDescriptor) {
    return decorator(elementDescriptor[0], elementDescriptor[1], elementDescriptor[2]);
  } else {
    return decorator as PropertyDecorator;
  }
}

function cacheInjection(obj: object, propertyName: string, value: unknown): void {
  Object.defineProperty(obj, propertyName, {
    value,
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

export default inject;
