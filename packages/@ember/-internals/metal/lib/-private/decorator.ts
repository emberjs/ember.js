import { assert } from '@ember/debug';

// import { NEEDS_STAGE_1_DECORATORS } from 'ember-decorators-flags';
// import { deprecate } from '@ember/application/deprecations';

import { isFieldDescriptor, isStage2FieldDescriptor } from './class-field-descriptor';

function kindForDesc(desc) {
  if ('value' in desc && desc.enumerable === true) {
    return 'field';
  } else {
    return 'method';
  }
}

function placementForKind(kind) {
  return kind === 'method' ? 'prototype' : 'own';
}

function convertStage1ToStage2(desc) {
  if (desc.length === 3) {
    // Class element decorator
    let [, key, descriptor] = desc;

    let kind = kindForDesc(desc);
    let placement = placementForKind(kind);

    let initializer = descriptor !== undefined ? descriptor.initializer : undefined;

    return {
      descriptor,
      key,
      kind,
      placement,
      initializer,
      toString: () => '[object Descriptor]',
    };
  } else {
    // Class decorator
    return {
      kind: 'class',
      elements: [],
    };
  }
}

export function decorator(fn) {
  // if (NEEDS_STAGE_1_DECORATORS) {
  //   return function(...params) {
  //     if (isStage2FieldDescriptor(params)) {
  //       let desc = params[0];

  //       return deprecateDirectDescriptorMutation(fn, desc);
  //     } else {
  //       let desc = convertStage1ToStage2(params);

  //       desc = deprecateDirectDescriptorMutation(fn, desc);

  //       if (typeof desc.finisher === 'function') {
  //         // Finishers are supposed to run at the end of class finalization,
  //         // but we don't get that with stage 1 transforms. We have to be careful
  //         // to make sure that we aren't doing any operations which would change
  //         // due to timing.
  //         let [target] = params;

  //         desc.finisher(target.prototype ? target : target.constructor);
  //       }

  //       if (typeof desc.initializer === 'function') {
  //         // Babel 6 / the legacy decorator transform needs the initializer back
  //         // on the property descriptor/ In case the user has set a new
  //         // initializer on the member descriptor, we transfer it back to
  //         // original descriptor.
  //         desc.descriptor.initializer = desc.initializer;
  //       }

  //       return desc.descriptor;
  //     }
  //   };
  // } else {
    return fn;
  // }
}

/**
 * A macro that takes a decorator function and allows it to optionally
 * receive parameters
 *
 * ```js
 * let foo = decoratorWithParams((target, desc, key, params) => {
 *   console.log(params);
 * });
 *
 * class {
 *   @foo bar; // undefined
 *   @foo('bar') baz; // ['bar']
 * }
 * ```
 *
 * @param {Function} fn - decorator function
 */
export function decoratorWithParams(fn) {
  return function(...params) {
    // determine if user called as @computed('blah', 'blah') or @computed
    if (isFieldDescriptor(params)) {
      return decorator(fn)(...params);
    } else {
      return decorator(desc => fn(desc, params));
    }
  };
}

/**
 * A macro that takes a decorator function and requires it to receive
 * parameters:
 *
 * ```js
 * let foo = decoratorWithRequiredParams((target, desc, key, params) => {
 *   console.log(params);
 * });
 *
 * class {
 *   @foo('bar') baz; // ['bar']
 *   @foo bar; // Error
 * }
 * ```
 *
 * @param {Function} fn - decorator function
 */
export function decoratorWithRequiredParams(fn, name) {
  return function(...params) {
    assert(
      `The @${name || fn.name} decorator requires parameters`,
      !isFieldDescriptor(params) && params.length > 0
    );

    return decorator(desc => {
      return fn(desc, params);
    });
  };
}
