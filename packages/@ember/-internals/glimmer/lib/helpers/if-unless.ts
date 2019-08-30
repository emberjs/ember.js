/**
@module ember
*/

import { assert } from '@ember/debug';
import { combine, createUpdatableTag, isConst, UpdatableTag, update } from '@glimmer/reference';
import { Arguments, PrimitiveReference, VM } from '@glimmer/runtime';
import { CachedReference, ConditionalReference } from '../utils/references';

class ConditionalHelperReference extends CachedReference {
  public branchTag: UpdatableTag;
  public tag: any;
  public cond: any;
  public truthy: any;
  public falsy: any;

  static create(
    _condRef: any,
    truthyRef: PrimitiveReference<boolean>,
    falsyRef: PrimitiveReference<boolean>
  ) {
    let condRef = ConditionalReference.create(_condRef);
    if (isConst(condRef)) {
      return condRef.value() ? truthyRef : falsyRef;
    } else {
      return new ConditionalHelperReference(condRef, truthyRef, falsyRef);
    }
  }

  constructor(cond: any, truthy: any, falsy: any) {
    super();

    this.branchTag = createUpdatableTag();
    this.tag = combine([cond.tag, this.branchTag]);

    this.cond = cond;
    this.truthy = truthy;
    this.falsy = falsy;
  }

  compute() {
    let branch = this.cond.value() ? this.truthy : this.falsy;

    update(this.branchTag, branch.tag);

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

  One detail to keep in mind is that both branches of the `if` helper will be evaluated,
  so if you have `{{if condition "foo" (expensive-operation "bar")`,
  `expensive-operation` will always calculate.

  @method if
  @for Ember.Templates.helpers
  @public
*/
export function inlineIf(_vm: VM, { positional }: Arguments) {
  assert(
    'The inline form of the `if` helper expects two or three arguments, e.g. ' +
      '`{{if trialExpired "Expired" expiryDate}}`.',
    positional.length === 3 || positional.length === 2
  );
  return ConditionalHelperReference.create(positional.at(0), positional.at(1), positional.at(2));
}

/**
  The `unless` helper is the inverse of the `if` helper. It displays if a value
  is falsey ("not true" or "is false"). Example values that will display with
  `unless`: `false`, `undefined`, `null`, `""`, `0`, `NaN` or an empty array.

  ## Inline form

  The inline `unless` helper conditionally renders a single property or string.
  This helper acts like a ternary operator. If the first property is falsy,
  the second argument will be displayed, otherwise, the third argument will be
  displayed

  For example, if `useLongGreeting` is false below:

  ```handlebars
  {{unless useLongGreeting "Hi" "Hello"}} Ben
  ```

  Then it will display:

  ```html
  Hi
  ```

  You can use the `unless` helper inside another helper as a subexpression.
  If isBig is not true, it will set the height to 10:

  ```handlebars
  {{! If isBig is not true, it will set the height to 10.}}
  <SomeComponent @height={{unless isBig "10" "100"}} />
  ```

  or

  ```handlebars
  {{some-component height=(unless isBig "10" "100")}}
  ```

  ## Block form

  Like the `if` helper, `unless` helper also has a block form.

  ```handlebars
  {{! If greetings are found, the text below will not render.}}
  {{#unless greetings}}
    No greetings were found. Why not set one?
  {{/unless}}
  ```

  You can also use an `else` helper with the `unless` block. The
  `else` will display if the value is truthy.

  ```handlebars
  {{! Is the user logged in?}}
  {{#unless userData}}
    Please login.
  {{else}}
    Welcome back!
  {{/unless}}
  ```

  If `userData` is false, undefined, null, or empty in the above example,
  then it will render:

  ```html
  Please login.
  ```

  @method unless
  @for Ember.Templates.helpers
  @public
*/
export function inlineUnless(_vm: VM, { positional }: Arguments) {
  assert(
    'The inline form of the `unless` helper expects two or three arguments, e.g. ' +
      '`{{unless isFirstLogin "Welcome back!"}}`.',
    positional.length === 3 || positional.length === 2
  );
  return ConditionalHelperReference.create(positional.at(0), positional.at(2), positional.at(1));
}
