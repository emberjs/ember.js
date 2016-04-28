/**
@module ember
@submodule ember-templates
*/

import { assert } from 'ember-metal/debug';
import { ConditionalHelperReference } from '../utils/references';

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
export const inlineIf = {
  isInternalHelper: true,
  toReference({ positional: pargs }) {
    switch (pargs.length) {
      case 2: return ConditionalHelperReference.create(pargs.at(0), pargs.at(1), null);
      case 3: return ConditionalHelperReference.create(pargs.at(0), pargs.at(1), pargs.at(2));
      default:
        assert(
          'The inline form of the `if` helper expects two or three arguments, e.g. ' +
          '`{{if trialExpired "Expired" expiryDate}}`.'
        );
    }
  }
};

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
export const inlineUnless = {
  isInternalHelper: true,
  toReference({ positional: pargs }) {
    switch (pargs.length) {
      case 2: return ConditionalHelperReference.create(pargs.at(0), null, pargs.at(1));
      case 3: return ConditionalHelperReference.create(pargs.at(0), pargs.at(2), pargs.at(1));
      default:
        assert(
          'The inline form of the `unless` helper expects two or three arguments, e.g. ' +
          '`{{unless isFirstLogin "Welcome back!"}}`.'
        );
    }
  }
};
