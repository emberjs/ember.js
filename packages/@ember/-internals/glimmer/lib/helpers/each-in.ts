/**
@module @ember/helper
*/
import { tagForObject } from '@ember/-internals/metal/lib/tags';
import { contentFor as _contentFor } from '@ember/-internals/runtime/lib/mixins/-proxy';
import { isProxy } from '@ember/-internals/utils/lib/is_proxy';
import { assert } from '@ember/debug';
import type { CapturedArguments } from '@glimmer/interfaces';
import { createComputeRef, valueForRef } from '@glimmer/reference/lib/reference';
import { consumeTag } from '@glimmer/validator/lib/tracking';
import { internalHelper } from './internal-helper';
import type { Nullable } from '@ember/-internals/utility-types';
import type { IteratorDelegate } from '@glimmer/reference/lib/iterable';
import { toEachInIterator } from '../utils/each-in-iterator';
import { CUSTOM_ITERATE, type CustomIterable } from '../utils/iterator';

/**
  The `{{#each}}` keyword loops over elements in a collection. It is an extension
  of the base Handlebars `{{#each}}` helper.

  The default behavior of `{{#each}}` is to yield its inner block once for every
  item in an array passing the item as the first block parameter.

  ```gjs {data-filename="app/components/developer-list.gjs"}
  import Component from '@glimmer/component';

  export default class DeveloperList extends Component {
    developers = [
      { name: 'Yehuda' },
      { name: 'Tom' },
      { name: 'Paul' },
    ];

    <template>
      <ul>
        {{#each this.developers as |person|}}
          <li>Hello, {{person.name}}!</li>
        {{/each}}
      </ul>
    </template>
  }
  ```

  The same rules apply to arrays of primitives:

  ```gjs {data-filename="app/components/developer-names.gjs"}
  import Component from '@glimmer/component';

  export default class DeveloperNames extends Component {
    developerNames = ['Yehuda', 'Tom', 'Paul'];

    <template>
      <ul>
        {{#each this.developerNames as |name|}}
          <li>Hello, {{name}}!</li>
        {{/each}}
      </ul>
    </template>
  }
  ```

  `{{#each}}` also supports native JavaScript [`Set`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)
  values and other iterables:

  ```gjs {data-filename="app/components/developer-set.gjs"}
  import Component from '@glimmer/component';

  export default class DeveloperSet extends Component {
    developers = new Set([
      { name: 'Yehuda' },
      { name: 'Tom' },
      { name: 'Paul' },
    ]);

    <template>
      <ul>
        {{#each this.developers as |person|}}
          <li>Hello, {{person.name}}!</li>
        {{/each}}
      </ul>
    </template>
  }
  ```

  During iteration, the index of each item in the array is provided as a second
  block parameter:

  ```gjs {data-filename="app/components/developer-list-with-index.gjs"}
  import Component from '@glimmer/component';

  export default class DeveloperListWithIndex extends Component {
    developers = [
      { name: 'Yehuda' },
      { name: 'Tom' },
      { name: 'Paul' },
    ];

    <template>
      <ul>
        {{#each this.developers as |person index|}}
          <li>Hello, {{person.name}}! You're number {{index}} in line</li>
        {{/each}}
      </ul>
    </template>
  }
  ```

  `#each` is a keyword and does not need to be imported.

  ### Specifying Keys

  In order to improve rendering speed, Ember will try to reuse the DOM elements
  where possible. Specifically, if the same item is present in the array both
  before and after the change, its DOM output will be reused.

  The `key` option is used to tell Ember how to determine if the items in the
  array being iterated over with `{{#each}}` has changed between renders. By
  default the item's object identity is used.

  This is usually sufficient, so in most cases, the `key` option is simply not
  needed. However, in some rare cases, the objects' identities may change even
  though they represent the same underlying data.

  For example, mapping over `people` produces a new array of new objects on each
  render. Use `key` so Ember can match items across those renders:

  ```gjs {data-filename="app/components/mapped-developers.gjs"}
  import Component from '@glimmer/component';

  export default class MappedDevelopers extends Component {
    people = [
      { name: 'Yehuda' },
      { name: 'Tom' },
      { name: 'Paul' },
    ];

    get developers() {
      return this.people.map((person) => {
        return { ...person, type: 'developer' };
      });
    }

    <template>
      <ul>
        {{#each this.developers key="name" as |person|}}
          <li>Hello, {{person.name}}!</li>
        {{/each}}
      </ul>
    </template>
  }
  ```

  By doing so, Ember will use the value of the property specified (`person.name`
  in the example) to find a "match" from the previous render. That is, if Ember
  has previously seen an object from the `developers` array with a matching
  name, its DOM elements will be re-used.

  There are two special values for `key`:

    * `@identity` - The item in the array itself. This is the default.
    * `@index` - The index of the item in the array.

  ### {{else}} condition

  `{{#each}}` can have a matching `{{else}}`. The contents of this block will render
  if the collection is empty.

  ```gjs {data-filename="app/components/available-developers.gjs"}
  import Component from '@glimmer/component';

  export default class AvailableDevelopers extends Component {
    developers = [];

    <template>
      <ul>
        {{#each this.developers as |person|}}
          <li>{{person.name}} is available!</li>
        {{else}}
          <li>Sorry, nobody is available for this task.</li>
        {{/each}}
      </ul>
    </template>
  }
  ```

  @method each
  @for Keywords
  @static
  @noimport
  @public
 */

/**
  The `{{#each-in}}` keyword loops over properties on an object, or entries in a
  native JavaScript [`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map).

  For example, given this component definition:

  ```gjs {data-filename="app/components/developer-details.gjs"}
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';

  export default class DeveloperDetails extends Component {
    @tracked developer = {
      name: 'Shelly Sails',
      age: 42,
    };

    <template>
      <ul>
        {{#each-in this.developer as |key value|}}
          <li>{{key}}: {{value}}</li>
        {{/each-in}}
      </ul>
    </template>
  }
  ```

  This template would display all properties on the `developer`
  object in a list, outputting their name and age:

  ```html
  <ul>
    <li>name: Shelly Sails</li>
    <li>age: 42</li>
  </ul>
  ```

  The same pattern works with a `Map`:

  ```gjs {data-filename="app/components/developer-map.gjs"}
  import Component from '@glimmer/component';

  export default class DeveloperMap extends Component {
    map = new Map([
      ['name', 'Shelly Sails'],
      ['age', 42],
    ]);

    <template>
      <ul>
        {{#each-in this.map as |key value|}}
          <li>{{key}}: {{value}}</li>
        {{/each-in}}
      </ul>
    </template>
  }
  ```

  When a `Map` uses object keys, you can pass `key="@identity"` to explicitly
  track entries across re-renders using the JavaScript identity of each key:

  ```gjs {data-filename="app/components/object-keyed-map.gjs"}
  import Component from '@glimmer/component';

  export default class ObjectKeyedMap extends Component {
    map = new Map([
      [{ name: 'one' }, 'foo'],
      [{ name: 'two' }, 'bar'],
    ]);

    <template>
      <ul>
        {{#each-in this.map key="@identity" as |key value|}}
          <li>{{key.name}}: {{value}}</li>
        {{/each-in}}
      </ul>
    </template>
  }
  ```

  `#each-in` is a keyword and does not need to be imported.

  ### Specifying Keys

  Like `{{#each}}`, `{{#each-in}}` accepts a `key` option to decide which DOM
  elements can be reused between renders. Since `{{#each-in}}` yields two block
  params, the special values pick which one is used:

    * `@identity` - The second block param: the property's value. This is the
      default. Changing a value replaces that entry's DOM instead of updating it
      in place.
    * `@key` - The first block param: the property name, or for a `Map`, its key.

  Any other string is a path, looked up on the value: `key="id"` keys each entry
  by its `value.id`.

  For example, `@key` keeps each entry's DOM as its score changes, so anything
  stateful inside it — focus, a running transition, a component instance — survives
  the update:

  ```handlebars
  {{#each-in this.scores key="@key" as |player score|}}
    <PlayerScore @name={{player}} @score={{score}} />
  {{/each-in}}
  ```

  @method each-in
  @static
  @noimport
  @for Keywords
  @public
  @since 2.1.0
*/
/** Marks a value so the iterator yields keys and values. */
export class EachInWrapper implements CustomIterable {
  constructor(public inner: unknown) {}

  [CUSTOM_ITERATE](): Nullable<IteratorDelegate> {
    return toEachInIterator(this.inner);
  }
}

export default internalHelper(({ positional }: CapturedArguments) => {
  const inner = positional[0];
  assert('expected at least one positional arg', inner);

  return createComputeRef(() => {
    let iterable = valueForRef(inner);

    consumeTag(tagForObject(iterable));

    if (isProxy(iterable)) {
      // this is because the each-in doesn't actually get(proxy, 'key') but bypasses it
      // and the proxy's tag is lazy updated on access
      iterable = _contentFor(iterable);
    }

    return new EachInWrapper(iterable);
  });
});
