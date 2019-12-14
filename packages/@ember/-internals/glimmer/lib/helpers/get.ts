import { set } from '@ember/-internals/metal';
import { Opaque } from '@glimmer/interfaces';
import {
  combine,
  createUpdatableTag,
  isConst,
  PathReference,
  Tag,
  UpdatableTag,
  update,
  VersionedPathReference,
} from '@glimmer/reference';
import { Arguments, NULL_REFERENCE, VM } from '@glimmer/runtime';
import { CachedReference, referenceFromParts, UPDATE } from '../utils/references';

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

export default function(_vm: VM, args: Arguments) {
  return GetHelperReference.create(args.positional.at(0), args.positional.at(1));
}

function referenceFromPath(
  source: VersionedPathReference<Opaque>,
  path: string
): VersionedPathReference<Opaque> {
  let innerReference;
  if (path === undefined || path === null || path === '') {
    innerReference = NULL_REFERENCE;
  } else if (typeof path === 'string' && path.indexOf('.') > -1) {
    innerReference = referenceFromParts(source, path.split('.'));
  } else {
    innerReference = source.get(path);
  }
  return innerReference;
}

class GetHelperReference extends CachedReference {
  public sourceReference: VersionedPathReference<Opaque>;
  public pathReference: PathReference<string>;
  public lastPath: string | null;
  public innerReference: VersionedPathReference<Opaque>;
  public innerTag: UpdatableTag;
  public tag: Tag;

  static create(
    sourceReference: VersionedPathReference<Opaque>,
    pathReference: PathReference<string>
  ) {
    if (isConst(pathReference)) {
      let path = pathReference.value();
      return referenceFromPath(sourceReference, path);
    } else {
      return new GetHelperReference(sourceReference, pathReference);
    }
  }

  constructor(
    sourceReference: VersionedPathReference<Opaque>,
    pathReference: PathReference<string>
  ) {
    super();
    this.sourceReference = sourceReference;
    this.pathReference = pathReference;

    this.lastPath = null;
    this.innerReference = NULL_REFERENCE;

    let innerTag = (this.innerTag = createUpdatableTag());

    this.tag = combine([sourceReference.tag, pathReference.tag, innerTag]);
  }

  compute() {
    let { lastPath, innerReference, innerTag } = this;
    let path = this.pathReference.value();

    if (path !== lastPath) {
      innerReference = referenceFromPath(this.sourceReference, path);
      update(innerTag, innerReference.tag);
      this.innerReference = innerReference;
      this.lastPath = path;
    }

    return innerReference.value();
  }

  [UPDATE](value: any) {
    set(this.sourceReference.value() as any, this.pathReference.value(), value);
  }
}
