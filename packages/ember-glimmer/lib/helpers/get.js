import { GetHelperReference } from '../utils/references';
import { isConst } from 'glimmer-reference';

/**
@module ember
@submodule ember-templates
*/

/**
  Dynamically look up a property on an object. The second argument to `{{get}}`
  should have a string value, although it can be bound.

  For example, these two usages are equivilent:

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
  <button {{action (mut factName) "height"}}>Show height</button>
  <button {{action (mut factName) "weight"}}>Show weight</button>
  ```

  The `{{get}}` helper can also respect mutable values itself. For example:

  ```handlebars
  {{input value=(mut (get person factName)) type="text"}}
  <button {{action (mut factName) "height"}}>Show height</button>
  <button {{action (mut factName) "weight"}}>Show weight</button>
  ```

  Would allow the user to swap what fact is being displayed, and also edit
  that fact via a two-way mutable binding.

  @public
  @method get
  @for Ember.Templates.helpers
  @since 2.1.0
 */

export default {
  isInternalHelper: true,

  toReference(args) {
    let sourceReference = args.positional.at(0);
    let propertyPathReference = args.positional.at(1); // bar in (get foo bar)

    if (isConst(propertyPathReference)) {
      return sourceReference.get(propertyPathReference.value());
    } else {
      return new GetHelperReference(sourceReference, propertyPathReference);
    }
  }
};
