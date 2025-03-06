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
function inject(type: string, name: string): PropertyDecorator;
// Non-decorator
function inject(type: string): PropertyDecorator;
// Decorator (without args)
function inject(type: string, ...args: [ElementDescriptor[0], ElementDescriptor[1]]): void;
function inject(type: string, ...args: ElementDescriptor): DecoratorPropertyDescriptor;
// Catch-all for service and controller injections
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

  if (isModernDecoratorArgs(args)) {
    return inject2023(type, undefined, args);
  }

  if (isElementDescriptor(args)) {
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
  } else {
    return decorator;
  }
}

function inject2023(type: string, name: string | undefined, args: Parameters<Decorator>) {
  const dec = identifyModernDecoratorArgs(args);
  switch (dec.kind) {
    case 'field':
      dec.context.addInitializer(function (this: any) {
        let getInjection = function (this: any) {
          let owner = getOwner(this) || this.container; // fallback to `container` for backwards compat

          assert(
            `Attempting to lookup an injected property on an object without a container, ensure that the object was instantiated via a container.`,
            Boolean(owner)
          );

          return owner.lookup(`${type}:${name || (dec.context.name as string)}`);
        };

        if (DEBUG) {
          DEBUG_INJECTION_FUNCTIONS.set(getInjection, {
            type,
            name,
          });
        }

        Object.defineProperty(this, dec.context.name, {
          get: getInjection,
          set(value) {
            defineProperty(this, dec.context.name as string, null, value);
          },
        });
      });
      return;
    default:
      throw new Error(`unimplemented: injected on ${dec.kind} ${dec.context.name?.toString()}`);
  }
}

export default inject;
