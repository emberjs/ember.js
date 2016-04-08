/**
@module ember
@submodule ember-templates
*/

import { VOLATILE_TAG } from 'glimmer-reference';
import { assert } from 'ember-metal/debug';
import emberToBool from '../utils/to-bool';
import { InternalHelperReference } from '../utils/references';

class ConditionalHelperReference extends InternalHelperReference {
  constructor(helper, args) {
    super(helper, args);
    this.tag = VOLATILE_TAG;
  }
}

function makeConditionalHelper(toBool) {
  return {
    isInternalHelper: true,
    toReference(args) {
      switch (args.positional.length) {
        case 2: return new ConditionalHelperReference(conditionalWithoutAlternative, args);
        case 3: return new ConditionalHelperReference(conditionalWithAlternative, args);
        default:
          assert(
            'The inline form of the `if` and `unless` helpers expect two or ' +
            'three arguments, e.g. `{{if trialExpired \'Expired\' expiryDate}}`'
          );
      }
    }
  };

  function conditionalWithoutAlternative({ positional }) {
    let condition = positional.at(0).value();

    if (toBool(condition)) {
      return positional.at(1).value();
    }
  }

  function conditionalWithAlternative({ positional }) {
    let condition = positional.at(0).value();

    if (toBool(condition)) {
      return positional.at(1).value();
    } else {
      return positional.at(2).value();
    }
  }
}

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
export const inlineIf = makeConditionalHelper(emberToBool);

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
export const inlineUnless = makeConditionalHelper(val => !emberToBool(val));
