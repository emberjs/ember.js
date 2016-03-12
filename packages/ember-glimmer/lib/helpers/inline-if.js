/**
@module ember
@submodule ember-templates
*/

import { assert } from 'ember-metal/debug';
import emberToBool from '../utils/to-bool';
import { InternalHelperReference } from '../utils/references';

/**
  The inline `if` helper conditionally renders a single property or string.
  This helper acts like a ternary operator. If the first property is truthy,
  the second argument will be displayed, if not, the third argument will be
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
function inlineIf({ positional }) {
  let condition = positional.at(0).value();

  if (emberToBool(condition)) {
    return positional.at(1).value();
  } else {
    return positional.at(2).value();
  }
}

function simpleInlineIf({ positional }) {
  let condition = positional.at(0).value();

  if (emberToBool(condition)) {
    return positional.at(1).value();
  } else {
    // TODO: this should probably be `undefined`: https://github.com/emberjs/ember.js/pull/12920#discussion_r53213383
    return '';
  }
}

export default {
  isInternalHelper: true,
  toReference(args) {
    switch (args.positional.length) {
      case 2: return new InternalHelperReference(simpleInlineIf, args);
      case 3: return new InternalHelperReference(inlineIf, args);
      default:
        assert(
          'The inline form of the `if` and `unless` helpers expect two or ' +
          'three arguments, e.g. `{{if trialExpired \'Expired\' expiryDate}}`'
        );
    }
  }
};
