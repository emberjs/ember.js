/**
@module ember
@submodule ember-templates
*/

import { assert } from 'ember-metal/debug';
import { UNDEFINED_REFERENCE, CachedReference, ConditionalReference } from '../utils/references';
import { CONSTANT_TAG, UpdatableTag, combine, isConst } from 'glimmer-reference';

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
