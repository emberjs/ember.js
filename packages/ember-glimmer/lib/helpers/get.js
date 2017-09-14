import { set } from 'ember-metal';
import { CachedReference, UPDATE } from '../utils/references';
import {
  CONSTANT_TAG,
  UpdatableTag,
  combine,
  isConst,
  referenceFromParts
} from '@glimmer/reference';

/**
@module ember
@submodule ember-glimmer
*/

/**
  Dynamically look up a property on an object. The second argument to `{{get}}`
  should have a string value, although it can be bound.

  For example, these two usages are equivalent:

  ```handlebars
  {{person.height}}
  {{get person "height"}}
  ```

  If there were several facts about a person, the `{{get}}` helper can dynamically
  pick one:

  ```handlebars
  {{get person factName}}
  ```

  For a more complex example, this template would allow the user to switch
  between showing the user's height and weight with a click:

  ```handlebars
  {{get person factName}}
  <button {{action (action (mut factName)) "height"}}>Show height</button>
  <button {{action (action (mut factName)) "weight"}}>Show weight</button>
  ```

  The `{{get}}` helper can also respect mutable values itself. For example:

  ```handlebars
  {{input value=(mut (get person factName)) type="text"}}
  <button {{action (action (mut factName)) "height"}}>Show height</button>
  <button {{action (action (mut factName)) "weight"}}>Show weight</button>
  ```

  Would allow the user to swap what fact is being displayed, and also edit
  that fact via a two-way mutable binding.

  @public
  @method get
  @for Ember.Templates.helpers
  @since 2.1.0
 */

export default function(vm, args) {
  return GetHelperReference.create(args.positional.at(0), args.positional.at(1));
}

class GetHelperReference extends CachedReference {
  static create(sourceReference, pathReference) {
    if (isConst(pathReference)) {
      let parts = pathReference.value().split('.');
      return referenceFromParts(sourceReference, parts);
    } else {
      return new GetHelperReference(sourceReference, pathReference);
    }
  }

  constructor(sourceReference, pathReference) {
    super();
    this.sourceReference = sourceReference;
    this.pathReference = pathReference;

    this.lastPath = null;
    this.innerReference = null;

    let innerTag = this.innerTag = new UpdatableTag(CONSTANT_TAG);

    this.tag = combine([sourceReference.tag, pathReference.tag, innerTag]);
  }

  compute() {
    let { lastPath, innerReference, innerTag } = this;

    let path = this.lastPath = this.pathReference.value();

    if (path !== lastPath) {
      if (path !== undefined && path !== null) {
        let pathType = typeof path;

        if (pathType === 'string') {
          innerReference = this.innerReference = referenceFromParts(this.sourceReference, path.split('.'));
        } else if (pathType === 'number') {
          innerReference = this.innerReference = this.sourceReference.get('' + path);
        }

        innerTag.update(innerReference.tag);
      } else {
        innerReference = this.innerReference = null;
        innerTag.update(CONSTANT_TAG);
      }
    }

    return innerReference ? innerReference.value() : null;
  }

  [UPDATE](value) {
    set(this.sourceReference.value(), this.pathReference.value(), value);
  }
}
