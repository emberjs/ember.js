/**
@module ember
@submodule ember-glimmer
*/

import { assert } from 'ember-debug';
import {
  CachedReference,
  ConditionalReference
} from '../utils/references';
import {
  CONSTANT_TAG,
  UpdatableTag,
  combine,
  isConst
} from '@glimmer/reference';

class ConditionalHelperReference extends CachedReference {
  public branchTag: UpdatableTag;
  public tag: any;
  public cond: any;
  public truthy: any;
  public falsy: any;

  static create(_condRef, truthyRef, falsyRef) {
    let condRef = ConditionalReference.create(_condRef);
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
    let branch = this.cond.value() ? this.truthy : this.falsy;

    this.branchTag.update(branch.tag);

    return branch.value();
  }
}

/**
  The `if` helper allows you to conditionally render one of two branches,
  depending on the "truthiness" of a property.
  For example the following values are all falsey: `false`, `undefined`, `null`, `""`, `0`, `NaN` or an empty array.

  This helper has two forms, block and inline.

  ## Block form

  You can use the block form of `if` to conditionally render a section of the template.

  To use it, pass the conditional value to the `if` helper,
  using the block form to wrap the section of template you want to conditionally render.
  Like so:

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

  ## Inline form

  The inline `if` helper conditionally renders a single property or string.

  In this form, the `if` helper receives three arguments, the conditional value,
  the value to render when truthy, and the value to render when falsey.

  For example, if `useLongGreeting` is truthy, the following:

  ```handlebars
  {{if useLongGreeting "Hello" "Hi"}} Alex
  ```

  Will render:

  ```html
  Hello Alex
  ```

  ### Nested `if`

  You can use the `if` helper inside another helper as a nested helper:

  ```handlebars
  {{some-component height=(if isBig "100" "10")}}
  ```

  One detail to keep in mind is that both branches of the `if` helper will be evaluated,
  so if you have `{{if condition "foo" (expensive-operation "bar")`,
  `expensive-operation` will always calculate.

  @method if
  @for Ember.Templates.helpers
  @public
*/
export function inlineIf(vm, { positional }) {
  assert(
    'The inline form of the `if` helper expects two or three arguments, e.g. ' +
    '`{{if trialExpired "Expired" expiryDate}}`.',
    positional.length === 3 || positional.length === 2
  );
  return ConditionalHelperReference.create(positional.at(0), positional.at(1), positional.at(2));
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
  assert(
    'The inline form of the `unless` helper expects two or three arguments, e.g. ' +
    '`{{unless isFirstLogin "Welcome back!"}}`.',
    positional.length === 3 || positional.length === 2
  );
  return ConditionalHelperReference.create(positional.at(0), positional.at(2), positional.at(1));
}
