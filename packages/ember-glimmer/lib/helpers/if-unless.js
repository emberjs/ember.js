/**
@module ember
@submodule ember-glimmer
*/

import { assert } from 'ember-metal';
import {
  UNDEFINED_REFERENCE,
  CachedReference,
  ConditionalReference
} from '../utils/references';
import {
  CONSTANT_TAG,
  UpdatableTag,
  combine,
  isConst
} from 'glimmer-reference';


/**
  Use the `if` block helper to conditionally render a block depending on a
  property. If the property is "falsey", for example: `false`, `undefined`,
  `null`, `""`, `0`, `NaN` or an empty array, the block will not be rendered.

  ```handlebars
  {{! will not render if foo is falsey}}
  {{#if foo}}
    Welcome to the {{foo.bar}}
  {{/if}}
  ```

  You can also specify a template to show if the property is falsey by using
  the `else` helper.

  ```handlebars
  {{! is it raining outside?}}
  {{#if isRaining}}
    Yes, grab an umbrella!
  {{else}}
    No, it's lovely outside!
  {{/if}}
  ```

  You are also able to combine `else` and `if` helpers to create more complex
  conditional logic.

  ```handlebars
  {{#if isMorning}}
    Good morning
  {{else if isAfternoon}}
    Good afternoon
  {{else}}
    Good night
  {{/if}}
  ```

  You can use `if` inline to conditionally render a single property or string.
  This helper acts like a ternary operator. If the first property is truthy,
  the second argument will be displayed, if not, the third argument will be
  displayed

  ```handlebars
  {{if useLongGreeting "Hello" "Hi"}} Dave
  ```

  Finally, you can use the `if` helper inside another helper as a subexpression.

  ```handlebars
  {{some-component height=(if isBig "100" "10")}}
  ```

  @method if
  @for Ember.Templates.helpers
  @public
*/

class ConditionalHelperReference extends CachedReference {
  static create(_condRef, _truthyRef, _falsyRef) {
    let condRef = ConditionalReference.create(_condRef);
    let truthyRef = _truthyRef || UNDEFINED_REFERENCE;
    let falsyRef = _falsyRef || UNDEFINED_REFERENCE;

    if (isConst(condRef)) {
      return condRef.value() ? truthyRef : falsyRef;
    } else {
      return new ConditionalHelperReference(condRef, truthyRef, falsyRef);
    }
  }

  constructor(cond, truthy, falsy) {
    super();

    this.branchTag = new UpdatableTag(CONSTANT_TAG);
    this.tag = combine([cond.tag, this.branchTag]);

    this.cond = cond;
    this.truthy = truthy;
    this.falsy = falsy;
  }

  compute() {
    let { cond, truthy, falsy } = this;

    let branch = cond.value() ? truthy : falsy;

    this.branchTag.update(branch.tag);

    return branch.value();
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
export function inlineIf(vm, { positional }) {
  switch (positional.length) {
    case 2: return ConditionalHelperReference.create(positional.at(0), positional.at(1), null);
    case 3: return ConditionalHelperReference.create(positional.at(0), positional.at(1), positional.at(2));
    default:
      assert(
        'The inline form of the `if` helper expects two or three arguments, e.g. ' +
        '`{{if trialExpired "Expired" expiryDate}}`.'
      );
  }
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
export function inlineUnless(vm, { positional }) {
  switch (positional.length) {
    case 2: return ConditionalHelperReference.create(positional.at(0), null, positional.at(1));
    case 3: return ConditionalHelperReference.create(positional.at(0), positional.at(2), positional.at(1));
    default:
      assert(
        'The inline form of the `unless` helper expects two or three arguments, e.g. ' +
        '`{{unless isFirstLogin "Welcome back!"}}`.'
      );
  }
}
