import { get, set } from '@ember/-internals/metal';
import { isObject } from '@ember/-internals/utils';
import { VMArguments } from '@glimmer/interfaces';
import {
  childRefFor,
  childRefFromParts,
  createComputeRef,
  isConstRef,
  NULL_REFERENCE,
  valueForRef,
} from '@glimmer/reference';
import { internalHelper } from './internal-helper';

/**
@module ember
*/

/**
  Dynamically look up a property on an object. The second argument to `{{get}}`
  should have a string value, although it can be bound.

  For example, these two usages are equivalent:

  ```app/components/developer-detail.js
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';

  export default class extends Component {
    @tracked developer = {
      name: "Sandi Metz",
      language: "Ruby"
    }
  }
  ```

  ```handlebars
  {{this.developer.name}}
  {{get this.developer "name"}}
  ```

  If there were several facts about a person, the `{{get}}` helper can dynamically
  pick one:

  ```app/templates/application.hbs
  <DeveloperDetail @factName="language" />
  ```

  ```handlebars
  {{get this.developer @factName}}
  ```

  For a more complex example, this template would allow the user to switch
  between showing the user's height and weight with a click:

  ```app/components/developer-detail.js
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';

  export default class extends Component {
    @tracked developer = {
      name: "Sandi Metz",
      language: "Ruby"
    }

    @tracked currentFact = 'name'

    @action
    showFact(fact) {
      this.currentFact = fact;
    }
  }
  ```

  ```app/components/developer-detail.js
  {{get this.developer this.currentFact}}

  <button {{on 'click' (fn this.showFact "name")}}>Show name</button>
  <button {{on 'click' (fn this.showFact "language")}}>Show language</button>
  ```

  The `{{get}}` helper can also respect mutable values itself. For example:

  ```app/components/developer-detail.js
  <Input @value={{mut (get this.person this.currentFact)}} />

  <button {{on 'click' (fn this.showFact "name")}}>Show name</button>
  <button {{on 'click' (fn this.showFact "language")}}>Show language</button>
  ```

  Would allow the user to swap what fact is being displayed, and also edit
  that fact via a two-way mutable binding.

  @public
  @method get
  @for Ember.Templates.helpers
  @since 2.1.0
 */
export default internalHelper((args: VMArguments) => {
  let sourceRef = args.positional.at(0);
  let pathRef = args.positional.at(1);

  if (isConstRef(pathRef)) {
    // Since the path is constant, we can create a normal chain of property
    // references. The source reference will update like normal, and all of the
    // child references will update accordingly.
    let path = valueForRef(pathRef);

    if (path === undefined || path === null || path === '') {
      return NULL_REFERENCE;
    } else if (typeof path === 'string' && path.indexOf('.') > -1) {
      return childRefFromParts(sourceRef, path.split('.'));
    } else {
      return childRefFor(sourceRef, String(path));
    }
  } else {
    return createComputeRef(
      () => {
        let source = valueForRef(sourceRef);

        if (isObject(source)) {
          return get(source, String(valueForRef(pathRef)));
        }
      },
      (value) => {
        let source = valueForRef(sourceRef);

        if (isObject(source)) {
          return set(source, String(valueForRef(pathRef)), value);
        }
      },
      'get'
    );
  }
});
