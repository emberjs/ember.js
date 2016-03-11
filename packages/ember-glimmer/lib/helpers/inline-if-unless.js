/**
@module ember
@submodule ember-templates
*/

import { toBool as emberToBool } from './if-unless';
import { assert } from 'ember-metal/debug';

/**
  The inline `if` helper conditionally renders a single property or string.
  This helper acts like a ternary operator. If the first property is truthy,
  the second argument will be displayed, otherwise, the third argument will be
  displayed
  ```handlebars
  {{if useLongGreeting "Hello" "Hi"}} Alex
  ```
  You can use the `if` helper inside another helper as a subexpression.
  ```handlebars
  {{some-component height=(if isBig "100" "10")}}
  ```
  @method if
  @for Ember.Templates.helpers
  @public
*/
export function inlineIf(args) {
  return resolveValue(args, true);
}

/**
  The inline `unless` helper conditionally renders a single property or string.
  This helper acts like a ternary operator. If the first property is falsy,
  the second argument will be displayed, otherwise, the third argument will be
  displayed
  ```handlebars
  {{unless useLongGreeting "Hi" "Hello"}} Ben
  ```
  You can use the `unless` helper inside another helper as a subexpression.
  ```handlebars
  {{some-component height=(unless isBig "10" "100")}}
  ```
  @method unless
  @for Ember.Templates.helpers
  @public
*/
export function inlineUnless(args) {
  return resolveValue(args, false);
}

function resolveValue(args, truthy) {
  assert(
    'The inline form of the `if` and `unless` helpers expect two or ' +
    'three arguments, e.g. `{{if trialExpired \'Expired\' expiryDate}}` ',
    args.length === 2 || args.length === 3
  );

  let predicate = emberToBool(args[0]);
  if (!truthy) {
    predicate = !predicate;
  }

  if (predicate) {
    return args[1];
  } else {
    //TODO: always return `args[2]` post glimmer2: https://github.com/emberjs/ember.js/pull/12920#discussion_r53213383
    let falsyArgument = args[2];
    return falsyArgument === undefined ? '' : falsyArgument;
  }
}
