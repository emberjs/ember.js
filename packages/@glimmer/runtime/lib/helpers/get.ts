import type { CapturedArguments } from '@glimmer/interfaces';
import { getPath, setPath } from '@glimmer/global-context';
import {
  createComputeRef,
  UNDEFINED_REFERENCE,
  valueForRef,
} from '@glimmer/reference/lib/reference';
import { isDict } from '@glimmer/util/lib/collections';

import { internalHelper } from './internal-helper';

/**
  Dynamically look up a property on an object. The second argument to `{{get}}`
  should have a string value, although it can be bound.

  For example, these two usages are equivalent:

  ```app/components/developer-detail.gjs
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';
  import { get } from '@ember/object';

  export default class extends Component {
    @tracked developer = {
      name: "Sandi Metz",
      language: "Ruby"
    }
    
    <template>
      {{this.developer.name}}
      {{get this.developer "name"}}
    </template>
  }
  ```

  If there were several facts about a person, the `{{get}}` helper can dynamically
  pick one:

  ```app/templates/application.gjs
  <template>
    <DeveloperDetail @factName="language" />
  </template>
  ```

  ```handlebars
  {{get this.developer @factName}}
  ```

  For a more complex example, this template would allow the user to switch
  between showing the user's height and weight with a click:

  ```app/components/developer-detail.gjs
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';
  import { get } from '@ember/object';
    
  export default class extends Component {
    @tracked developer = {
      name: "Sandi Metz",
      language: "Ruby"
    }

    @tracked currentFact = 'name'

    showFact = (fact) => {
      this.currentFact = fact;
    }
    
    <template>
      {{get this.developer this.currentFact}}

      <button {{on 'click' (fn this.showFact "name")}}>Show name</button>
      <button {{on 'click' (fn this.showFact "language")}}>Show language</button>
    </template>
  }
  ```

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
