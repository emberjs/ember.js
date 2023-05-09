import { getPath, setPath } from '@glimmer/global-context';
import { type CapturedArguments } from '@glimmer/interfaces';
import { createComputeRef, UNDEFINED_REFERENCE, valueForRef } from '@glimmer/reference';
import { isDict } from '@glimmer/util';

import { internalHelper } from './internal-helper';

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

    showFact = (fact) => {
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
 */
export const get = internalHelper(({ positional }: CapturedArguments) => {
  let sourceRef = positional[0] ?? UNDEFINED_REFERENCE;
  let pathRef = positional[1] ?? UNDEFINED_REFERENCE;

  return createComputeRef(
    () => {
      let source = valueForRef(sourceRef);

      if (isDict(source)) {
        return getPath(source, String(valueForRef(pathRef)));
      }
    },
    (value) => {
      let source = valueForRef(sourceRef);

      if (isDict(source)) {
        return setPath(source, String(valueForRef(pathRef)), value);
      }
    },
    'get'
  );
});
