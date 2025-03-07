import { getOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { computed } from './computed';
import type { DecoratorPropertyDescriptor, ElementDescriptor } from './decorator';
import { isElementDescriptor } from './decorator';
import { defineProperty } from './properties';
import {
  type ClassFieldDecorator,
  identifyModernDecoratorArgs,
  isModernDecoratorArgs,
  type Decorator,
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

  if (isModernDecoratorArgs(args)) {
    return inject2023(type, undefined, args);
  }

  let elementDescriptor;
  let name: string | undefined;

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
    return function (...args: unknown[]) {
      if (isModernDecoratorArgs(args)) {
        return inject2023(type, name, args);
      } else {
        return decorator(...(args as Parameters<typeof decorator>));
      }
    };
  }
}

function inject2023(
  type: string,
  customName: string | undefined,
  args: Parameters<Decorator>
): ReturnType<ClassFieldDecorator> {
  let dec = identifyModernDecoratorArgs(args);
  switch (dec.kind) {
    case 'field':
      return function (this: object) {
        let owner = getOwner(this) || (this as any).container; // fallback to `container` for backwards compat

        assert(
          `Attempting to lookup an injected property on an object without a container, ensure that the object was instantiated via a container.`,
          Boolean(owner)
        );

        return owner.lookup(`${type}:${customName ?? String(dec.context.name)}`);
      };
    default:
      throw new Error(
        `tried to use injection decorator on ${dec.kind} but it only supports fields`
      );
  }
}

export default inject;
