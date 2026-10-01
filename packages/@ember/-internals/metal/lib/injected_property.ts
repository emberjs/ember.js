import { getOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { computed } from './computed';
import type { DecoratorPropertyDescriptor, ElementDescriptor } from './decorator';
import { isElementDescriptor } from './decorator';
import { defineProperty } from './properties';
import {
  type Decorator,
  identifyModernDecoratorArgs,
  type InjectionDecorator,
  isModernDecoratorArgs,
} from './decorator-util';

export let DEBUG_INJECTION_FUNCTIONS: WeakMap<Function, any>;

if (DEBUG) {
  DEBUG_INJECTION_FUNCTIONS = new WeakMap();
}

/**
 @module ember
 @private
 */

/**
  Read-only property that returns the result of a container lookup.

  @class InjectedProperty
  @namespace Ember
  @constructor
  @param {String} type The container type the property will lookup
  @param {String} nameOrDesc (optional) The name the property will lookup, defaults
         to the property's name
  @private
*/
// Decorator factory (with args)
// (Also matches non-decorator form, types may be incorrect for this.)
function inject(type: string, name: string): InjectionDecorator;
// Non-decorator
function inject(type: string): InjectionDecorator;
// Decorator (without args)
function inject(type: string, ...args: [ElementDescriptor[0], ElementDescriptor[1]]): void;
function inject(type: string, ...args: ElementDescriptor): DecoratorPropertyDescriptor;
// Catch-all for service and controller injections
function inject(
  type: string,
  ...args: [] | [name: string] | ElementDescriptor | [value: unknown, context: DecoratorContext]
): InjectionDecorator | DecoratorPropertyDescriptor | void;
function inject(
  type: string,
  ...args: [] | [name: string] | ElementDescriptor | [value: unknown, context: DecoratorContext]
): InjectionDecorator | DecoratorPropertyDescriptor | void {
  assert('a string type must be provided to inject', typeof type === 'string');
  let elementDescriptor;
  let modernArgs: Parameters<Decorator> | undefined;
  let name: string | undefined;

  if (isModernDecoratorArgs(args)) {
    let dec = identifyModernDecoratorArgs(args);
    if (dec.kind !== 'field') {
      return inject2023(type, undefined, args);
    }
    modernArgs = args;
  } else if (isElementDescriptor(args)) {
    elementDescriptor = args;
  } else if (typeof args[0] === 'string') {
    name = args[0];
  }

  let getInjection = function (this: any, propertyName: string) {
    let owner = getOwner(this) || this.container; // fallback to `container` for backwards compat

    assert(
      `Attempting to lookup an injected property on an object without a container, ensure that the object was instantiated via a container.`,
      Boolean(owner)
    );

    return owner.lookup(`${type}:${name || propertyName}`);
  };

  if (DEBUG) {
    DEBUG_INJECTION_FUNCTIONS.set(getInjection, {
      type,
      name,
    });
  }

  let decorator = computed({
    get: getInjection,

    set(this: any, keyName: string, value: any) {
      defineProperty(this, keyName, null, value);
    },
  });

  if (elementDescriptor) {
    return decorator(elementDescriptor[0], elementDescriptor[1], elementDescriptor[2]);
  } else if (modernArgs) {
    // TODO: cast is a lie, it keeps the public types unchanged
    return (decorator as unknown as (...args: unknown[]) => undefined)(...modernArgs);
  } else {
    return decorator;
  }
}

// Fields go through the same computed-based path as legacy decorators; this
// handles `@service accessor foo` and errors on unsupported kinds.
function inject2023(type: string, name: string | undefined, args: Parameters<Decorator>) {
  const dec = identifyModernDecoratorArgs(args);

  function getInjection(this: any) {
    let owner = getOwner(this) || this.container; // fallback to `container` for backwards compat

    assert(
      `Attempting to lookup an injected property on an object without a container, ensure that the object was instantiated via a container.`,
      Boolean(owner)
    );

    return owner.lookup(`${type}:${name || (dec.context.name as string)}`);
  }

  if (DEBUG) {
    DEBUG_INJECTION_FUNCTIONS.set(getInjection, {
      type,
      name,
    });
  }

  switch (dec.kind) {
    case 'accessor':
      return {
        get: getInjection,
        set(this: object, value: unknown) {
          Object.defineProperty(this, dec.context.name, { value });
        },
      };
    default:
      throw new Error(
        `The @service decorator does not support ${dec.kind} ${dec.context.name?.toString()}`
      );
  }
}

export default inject;
