import { getOwner } from '@ember/-internals/owner';
import { EMBER_MODULE_UNIFICATION } from '@ember/canary-features';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { computed } from './computed';
import { Decorator, DecoratorPropertyDescriptor, isElementDescriptor } from './decorator';
import { defineProperty } from './properties';

export let DEBUG_INJECTION_FUNCTIONS: WeakMap<Function, any>;

if (DEBUG) {
  DEBUG_INJECTION_FUNCTIONS = new WeakMap();
}

export interface InjectedPropertyOptions {
  source: string;
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
export default function inject(
  type: string,
  name: string,
  options?: InjectedPropertyOptions
): Decorator;
export default function inject(
  type: string,
  target: object,
  key: string,
  desc: DecoratorPropertyDescriptor
): DecoratorPropertyDescriptor;
export default function inject(
  type: string,
  ...args: any[]
): Decorator | DecoratorPropertyDescriptor {
  assert('a string type must be provided to inject', typeof type === 'string');

  let calledAsDecorator = isElementDescriptor(args);
  let source: string | undefined, namespace: string | undefined;

  let name = calledAsDecorator ? undefined : args[0];
  let options = calledAsDecorator ? undefined : args[1];

  if (EMBER_MODULE_UNIFICATION) {
    source = options ? options.source : undefined;
    namespace = undefined;

    if (name !== undefined) {
      let namespaceDelimiterOffset = name.indexOf('::');

      if (namespaceDelimiterOffset !== -1) {
        namespace = name.slice(0, namespaceDelimiterOffset);
        name = name.slice(namespaceDelimiterOffset + 2);
      }
    }
  }

  let getInjection = function(this: any, propertyName: string) {
    let owner = getOwner(this) || this.container; // fallback to `container` for backwards compat

    assert(
      `Attempting to lookup an injected property on an object without a container, ensure that the object was instantiated via a container.`,
      Boolean(owner)
    );

    return owner.lookup(`${type}:${name || propertyName}`, { source, namespace });
  };

  if (DEBUG) {
    DEBUG_INJECTION_FUNCTIONS.set(getInjection, {
      namespace,
      source,
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

  if (calledAsDecorator) {
    return decorator(args[0], args[1], args[2]);
  } else {
    return decorator;
  }
}
