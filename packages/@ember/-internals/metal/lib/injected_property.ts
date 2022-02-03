import { getOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { computed } from './computed';
import { DecoratorPropertyDescriptor, isElementDescriptor, ElementDescriptor } from './decorator';
import { defineProperty } from './properties';

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

export default inject;
