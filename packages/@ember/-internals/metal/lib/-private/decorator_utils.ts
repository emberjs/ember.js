import { assert, warn } from '@ember/debug';

import { defineProperty } from '@ember/-internals/metal';
import { DecoratorDescriptor } from '../computed';
import { isFieldDescriptor } from './class-field-descriptor';
import { decorator } from './decorator';
import { computedDescriptorFor, isComputedDescriptor } from './descriptor';

export const DECORATOR_COMPUTED_FN = new WeakMap();
export const DECORATOR_PARAMS = new WeakMap();
export const DECORATOR_MODIFIERS = new WeakMap();

export function collapseProto(target) {
  // We must collapse the superclass prototype to make sure that the `actions`
  // object will exist. Since collapsing doesn't generally happen until a class is
  // instantiated, we have to do it manually.
  if (typeof target.constructor.proto === 'function') {
    target.constructor.proto();
  }
}

const DEEP_EACH_REGEX = /\.@each\.[^.]+\./; // temp copied from computed

export function buildComputedDesc(dec, desc) {
  let fn = DECORATOR_COMPUTED_FN.get(dec);
  let params = DECORATOR_PARAMS.get(dec);
  let modifiers = DECORATOR_MODIFIERS.get(dec);

  let lastArg = params[params.length - 1];
  let objectConfig = params.slice(0, params.length);
  // if (desc && desc.key && (desc.key === 'aProp')) {
  //   debugger;
  // }

  if ((Object.keys(desc).length === 1) && typeof lastArg !== 'function') {
    objectConfig = lastArg;

    assert(
      'computed expects a function or an object as last argument.',
      typeof objectConfig === 'object' && !Array.isArray(objectConfig)
    );
    assert(
      'Config object passed to computed can only contain `get` and `set` keys.',
      Object.keys(objectConfig).every(key => key === 'get' || key === 'set')
    );
    assert(
      'Computed properties must receive a getter or a setter, you passed none.',
      Boolean(objectConfig.get) || Boolean(objectConfig.set)
    );

    if (typeof objectConfig === 'object') {
      if (objectConfig.set && !objectConfig.get) {
        // classic behavior
        // in new classes, accessing without a getter will raise an exception
        params[0].get = function() {
          return this._super(...arguments);
        };
        // params[0].get = undefined;
      }
    }
  }


  let computedDesc = fn(desc, params);

  assert(`computed decorators must return an instance of an Ember ComputedProperty descriptor, received ${computedDesc}`, isComputedDescriptor(computedDesc));

  if (modifiers) {
    modifiers.forEach(m => {
      if (Array.isArray(m)) {
        computedDesc[m[0]](...m[1]);
      } else {
        computedDesc[m]();
      }
    });
  }

  return computedDesc;
}

export function computedDecoratorWithParams(fn) {
  return function(...params) {
    if (isFieldDescriptor(params)) {
      // Funkiness of application call here is due to `...params` transpiling to
      // use `apply`, which is no longer on the prototype of the computedDecorator
      // since it has had it's prototype changed :upside_down_face:
      return Function.apply.call(computedDecorator(fn), undefined, params);
    } else {
      return computedDecorator(fn, params);
    }
  }
}

export function computedDecoratorWithRequiredParams(fn, name) {
  return function(...params) {
    assert(
      `The @${name || fn.name} decorator requires parameters`,
      !isFieldDescriptor(params) && params.length > 0
    );

    return computedDecorator(fn, params);
  };
}


/**
 * A macro that receives a decorator function which returns a ComputedProperty,
 * and defines that property using `Ember.defineProperty`. Conceptually, CPs
 * are custom property descriptors that require Ember's intervention to apply
 * correctly. In the future, we will use finishers to define the CPs rather than
 * directly defining them in the decorator function.
 *
 * @param {Function} fn - decorator function
 */
export function computedDecorator(fn, params) {
  let dec = decorator((desc) => {

    // All computeds are methods
    desc.kind = 'method';
    desc.placement = 'prototype';

    desc.finisher = function initializeComputedProperty(target) {
      let { prototype } = target;
      let { key } = desc;

      assert(`ES6 property getters/setters only need to be decorated once, '${key}' was decorated on both the getter and the setter`, !computedDescriptorFor(prototype, key));

      let computedDesc = buildComputedDesc(dec, desc);

      // if (!HAS_NATIVE_COMPUTED_GETTERS) {
      //   // Until recent versions of Ember, computed properties would be defined
      //   // by just setting them. We need to blow away any predefined properties
      //   // (getters/setters, etc.) to allow Ember.defineProperty to work correctly.
      //   Object.defineProperty(prototype, key, {
      //     configurable: true,
      //     writable: true,
      //     enumerable: true,
      //     value: undefined
      //   });
      // }

      defineProperty(prototype, key, computedDesc);

      // if (NEEDS_STAGE_1_DECORATORS) {
      //   // There's currently no way to disable redefining the property when decorators
      //   // are run, so return the property descriptor we just assigned
      //   desc.descriptor = Object.getOwnPropertyDescriptor(prototype, key);
      // }

      return target;
    }

    return desc;
  });

  Object.setPrototypeOf(dec, DecoratorDescriptor.prototype);

  DECORATOR_COMPUTED_FN.set(dec, fn);
  DECORATOR_PARAMS.set(dec, params);

  return dec;
}