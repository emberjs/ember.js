/**
@module @ember/helper
*/

import { setHelperManager as glimmerSetHelperManager } from '@glimmer/manager/lib/public/api';
import { helperCapabilities } from '@glimmer/manager/lib/public/helper';
import { invokeHelper as glimmerInvokeHelper } from '@glimmer/runtime/lib/helpers/invoke';
import { hash as glimmerHash } from '@glimmer/runtime/lib/helpers/hash';
import { array as glimmerArray } from '@glimmer/runtime/lib/helpers/array';
import { concat as glimmerConcat } from '@glimmer/runtime/lib/helpers/concat';
import { eq as glimmerEq } from '@glimmer/runtime/lib/helpers/eq';
import { get as glimmerGet } from '@glimmer/runtime/lib/helpers/get';
import { fn as glimmerFn } from '@glimmer/runtime/lib/helpers/fn';
import { neq as glimmerNeq } from '@glimmer/runtime/lib/helpers/neq';
import { gt as glimmerGt } from '@glimmer/runtime/lib/helpers/gt';
import { gte as glimmerGte } from '@glimmer/runtime/lib/helpers/gte';
import { lt as glimmerLt } from '@glimmer/runtime/lib/helpers/lt';
import { lte as glimmerLte } from '@glimmer/runtime/lib/helpers/lte';
import { and as glimmerAnd } from '@glimmer/runtime/lib/helpers/and';
import { or as glimmerOr } from '@glimmer/runtime/lib/helpers/or';
import { not as glimmerNot } from '@glimmer/runtime/lib/helpers/not';
import glimmerElement from '@ember/-internals/glimmer/lib/helpers/element';
import { uniqueId as glimmerUniqueId } from '@ember/-internals/glimmer/lib/helpers/unique-id';
import { type Opaque } from '@ember/-internals/utility-types';

/**
  `capabilities` returns a capabilities configuration which can be used to modify
  the behavior of the manager. Manager capabilities _must_ be provided using the
  `capabilities` function, as the underlying implementation can change over time.

  The first argument to capabilities is a version string, which is the version of
  Ember that the capabilities were defined in. Ember can add new versions at any
  time, and these may have entirely different behaviors, but it will not remove
  old versions until the next major version.

  ```js
  capabilities('3.23');
  ```

  The second argument is an object of capabilities and boolean values indicating
  whether they are enabled or disabled.

  ```js
  capabilities('3.23', {
    hasValue: true,
    hasDestructor: true,
  });
  ```

  If no value is specified, then the default value will be used.

  ### `3.23` capabilities

  #### `hasDestroyable`

  - Default value: false

  Determines if the helper has a destroyable to include in the destructor
  hierarchy. If enabled, the `getDestroyable` hook will be called, and its result
  will be associated with the destroyable parent block.

  #### `hasValue`

  - Default value: false

  Determines if the helper has a value which can be used externally. The helper's
  `getValue` hook will be run whenever the value of the helper is accessed if this
  capability is enabled.

  @method capabilities
  @static
  @for @ember/helper
  @param {String} managerApiVersion The version of capabilities that are being used
  @param options The capabilities values
  @return {Capabilities} The capabilities object instance
  @since 3.23.0
  @public
*/
export const capabilities = helperCapabilities;

/**
  Sets the helper manager for an object or function.

  ```js
  setHelperManager((owner) => new ClassHelperManager(owner), Helper)
  ```

  When a value is used as a helper in a template, the helper manager is looked up
  on the object by walking up its prototype chain and finding the first helper
  manager. This manager then receives the value and can create and manage an
  instance of a helper from it. This provides a layer of indirection that allows
  users to design high-level helper APIs, without Ember needing to worry about the
  details. High-level APIs can be experimented with and iterated on while the
  core of Ember helpers remains stable, and new APIs can be introduced gradually
  over time to existing code bases.

  `setHelperManager` receives two arguments:

  1. A factory function, which receives the `owner` and returns an instance of a
    helper manager.
  2. A helper definition, which is the object or function to associate the factory function with.

  The first time the object is looked up, the factory function will be called to
  create the helper manager. It will be cached, and in subsequent lookups the
  cached helper manager will be used instead.

  Only one helper manager is guaranteed to exist per `owner` and per usage of
  `setHelperManager`, so many helpers will end up using the same instance of the
  helper manager. As such, you should only store state that is related to the
  manager itself. If you want to store state specific to a particular helper
  definition, you should assign a unique helper manager to that helper. In
  general, most managers should either be stateless, or only have the `owner` they
  were created with as state.

  Helper managers must fulfill the following interface (This example uses
  [TypeScript interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html)
  for precision, you do not need to write helper managers using TypeScript):

  ```ts
  interface HelperManager<HelperStateBucket> {
    capabilities: HelperCapabilities;

    createHelper(definition: HelperDefinition, args: TemplateArgs): HelperStateBucket;

    getValue?(bucket: HelperStateBucket): unknown;

    runEffect?(bucket: HelperStateBucket): void;

    getDestroyable?(bucket: HelperStateBucket): object;
  }
  ```

  The capabilities property _must_ be provided using the `capabilities()` function
  imported from the same module as `setHelperManager`:

  ```js
  import { capabilities } from '@ember/helper';

  class MyHelperManager {
    capabilities = capabilities('3.21.0', { hasValue: true });

    // ...snip...
  }
  ```

  Below is a description of each of the methods on the interface and their
  functions.

  #### `createHelper`

  `createHelper` is a required hook on the HelperManager interface. The hook is
  passed the definition of the helper that is currently being created, and is
  expected to return a _state bucket_. This state bucket is what represents the
  current state of the helper, and will be passed to the other lifecycle hooks at
  appropriate times. It is not necessarily related to the definition of the
  helper itself - for instance, you could return an object _containing_ an
  instance of the helper:

  ```js
  class MyManager {
    createHelper(Definition, args) {
      return {
        instance: new Definition(args);
      };
    }
  }
  ```

  This allows the manager to store metadata that it doesn't want to expose to the
  user.

  This hook is _not_ autotracked - changes to tracked values used within this hook
  will _not_ result in a call to any of the other lifecycle hooks. This is because
  it is unclear what should happen if it invalidates, and rather than make a
  decision at this point, the initial API is aiming to allow as much expressivity
  as possible. This could change in the future with changes to capabilities and
  their behaviors.

  If users do want to autotrack some values used during construction, they can
  either create the instance of the helper in `runEffect` or `getValue`, or they
  can use the `cache` API to autotrack the `createHelper` hook themselves. This
  provides maximum flexibility and expressiveness to manager authors.

  This hook has the following timing semantics:

  **Always**
  - called as discovered during DOM construction
  - called in definition order in the template

  #### `getValue`

  `getValue` is an optional hook that should return the value of the helper. This
  is the value that is returned from the helper and passed into the template.

  This hook is called when the value is requested from the helper (e.g. when the
  template is rendering and the helper value is needed). The hook is autotracked,
  and will rerun whenever any tracked values used inside of it are updated.
  Otherwise it does not rerun.

  > Note: This means that arguments which are not _consumed_ within the hook will
  > not trigger updates.

  This hook is only called for helpers with the `hasValue` capability enabled.
  This hook has the following timing semantics:

  **Always**
  - called the first time the helper value is requested
  - called after autotracked state has changed

  **Never**
  - called if the `hasValue` capability is disabled

  #### `runEffect`

  `runEffect` is an optional hook that should run the effect that the helper is
  applying, setting it up or updating it.

  This hook is scheduled to be called some time after render and prior to paint.
  There is not a guaranteed, 1-to-1 relationship between a render pass and this
  hook firing. For instance, multiple render passes could occur, and the hook may
  only trigger once. It may also never trigger if it was dirtied in one render
  pass and then destroyed in the next.

  The hook is autotracked, and will rerun whenever any tracked values used inside
  of it are updated. Otherwise it does not rerun.

  The hook is also run during a time period where state mutations are _disabled_
  in Ember. Any tracked state mutation will throw an error during this time,
  including changes to tracked properties, changes made using `set`, updates
  to computed properties, etc. This is meant to prevent infinite rerenders and
  other antipatterns.

  This hook is only called for helpers with the `hasScheduledEffect` capability
  enabled. This hook is also not called in SSR currently, though this could be
  added as a capability in the future. It has the following timing semantics:

  **Always**
  - called after the helper was first created, if the helper has not been
    destroyed since creation
  - called after autotracked state has changed, if the helper has not been
    destroyed during render

  **Never**
  - called if the `hasScheduledEffect` capability is disabled
  - called in SSR

  #### `getDestroyable`

  `getDestroyable` is an optional hook that users can use to register a
  destroyable object for the helper. This destroyable will be registered to the
  containing block or template parent, and will be destroyed when it is destroyed.
  See the [Destroyables RFC](https://github.com/emberjs/rfcs/blob/master/text/0580-destroyables.md)
  for more details.

  `getDestroyable` is only called if the `hasDestroyable` capability is enabled.

  This hook has the following timing semantics:

  **Always**
  - called immediately after the `createHelper` hook is called

  **Never**
  - called if the `hasDestroyable` capability is disabled

  @method setHelperManager
  @for @ember/helper
  @static
  @param {Function} factory A factory function which receives an optional owner, and returns a helper manager
  @param {object} definition The definition to associate the manager factory with
  @return {object} The definition passed into setHelperManager
  @since 3.23.0
  @public
*/
export const setHelperManager = glimmerSetHelperManager;

/**
  The `invokeHelper` function can be used to create a helper instance in
  JavaScript.

  To access a helper's value you have to use `getValue` from
  `@glimmer/tracking/primitives/cache`.

  ```gjs {data-filename="app/components/data-loader.js"}
  import Component from '@glimmer/component';
  import { getValue } from '@glimmer/tracking/primitives/cache';
  import Helper from '@ember/component/helper';
  import { invokeHelper } from '@ember/helper';

  class PlusOne extends Helper {
    compute([number]) {
      return number + 1;
    }
  }

  export default class PlusOneComponent extends Component {
    plusOne = invokeHelper(this, PlusOne, () => {
      return {
        positional: [this.args.number],
      };
    });

    get value() {
      return getValue(this.plusOne);
    }
  }
  
  <template>
    {{this.value}}
  </template>
  ```

  It receives three arguments:

  * `context`: The parent context of the helper. When the parent is torn down and
    removed, the helper will be as well.
  * `definition`: The definition of the helper.
  * `computeArgs`: An optional function that produces the arguments to the helper.
    The function receives the parent context as an argument, and must return an
    object with a `positional` property that is an array and/or a `named`
    property that is an object.

  And it returns a Cache instance that contains the most recent value of the
  helper. You can access the helper using `getValue()` like any other cache. The
  cache is also destroyable, and using the `destroy()` function on it will cause
  the helper to be torn down.

  Note that using `getValue()` on helpers that have scheduled effects will not
  trigger the effect early. Effects will continue to run at their scheduled time.

  @method invokeHelper
  @for @ember/helper
  @static
  @param {object} context The parent context of the helper
  @param {object} definition The helper definition
  @param {Function} computeArgs An optional function that produces args
  @returns
  @since 3.23.0
  @public
*/
export const invokeHelper = glimmerInvokeHelper;

// SAFETY: we need to provide interfaces that Glint can declaration-merge with
// to provide appropriate completions. In each case, the imported item is
// currently typed only as `object`, and we are replacing it with a similarly
// low-information interface type: these are empty objects which are simply able
// to be distinguished so that Glint can provide the relevant extensions.
/* eslint-disable @typescript-eslint/no-empty-object-type */

/**
 * Using the `{{hash}}` helper, you can pass objects directly from the template
 * as an argument to your components.
 *
 * ```gjs
 * <template>
 *   {{#each-in (hash givenName='Jen' familyName='Weber') as |key value|}}
 *     <p>{{key}}: {{value}}</p>
 *   {{/each-in}}
 * </template>
 * ```
 *
 *
 * Note that the hash is an empty object with no prototype chain, therefore
 * common methods like `toString` are not available in the resulting hash.
 * If you need to use such a method, you can use the `call` or `apply`
 * approach:
 *
 * ```js
 * function toString(obj) {
 *   return Object.prototype.toString.apply(obj);
 * }
 * ```
 * The `hash` helper is available as a keyword and does not need to be imported.
 *
 * @method hash
 * @public
 * @static
 * @for Keywords
 * @noimport
 * @param {Object} options
 * @return {Object} Hash
 * @since 2.3.0
 */
export const hash = glimmerHash as HashHelper;
export interface HashHelper extends Opaque<'helper:hash'> {}

/**
 * Using the `{{array}}` helper, you can pass arrays directly from the template
 * as an argument to your components.
 *
 * ```gjs
 * <template>
 *   <ul>
 *   {{#each (array 'Tom Dale' 'Yehuda Katz' @anotherPerson) as |person|}}
 *     <li>{{person}}</li>
 *   {{/each}}
 *   </ul>
 * </template>
 * ```
 *
 * The `array` helper is available as a keyword and does not need to be imported.
 *
 * @method array
 * @public
 * @static
 * @for Keywords
 * @noimport
 * @param {Array} options
 * @return {Array} Array
 * @since 3.8.0
 */
export const array = glimmerArray as ArrayHelper;
export interface ArrayHelper extends Opaque<'helper:array'> {}

/**
 * The `{{concat}}` helper Concatenates the given arguments into a string.
 *
 * Example:
 *
 ```gjs
  import { concat } from '@ember/helper';

  <template>
    {{yield (concat firstName " " lastName)}}

    {{! would yield name="<first name value> <last name value>" to the component}}
  </template>
  ```

  or for angle bracket invocation, you actually don't need concat at all:

  ```handlebars
  <SomeComponent @name="{{firstName}} {{lastName}}" />
  ```
 *
 * @method concat
 * @for @ember/helper
 * @exampleimport import { concat } from '@ember/helper';
 * @public
 * @static
 * @since 1.13.0
 */
export const concat = glimmerConcat as ConcatHelper;
export interface ConcatHelper extends Opaque<'helper:concat'> {}

/**
 * The `{{get}}` helper makes it easy to dynamically look up a property on an
 * object or an element in an array. The second argument to `{{get}}` can be a
 * string or a number, depending on the object being accessed.
 *
 * To access a property on an object with a string key:
 *
 * ```gjs
 * import { get } from '@ember/helper';
 *
 * <template>
 *   {{get @someObject "objectKey"}}
 * </template>
 * ```
 *
 * To access the first element in an array:
 *
 * ```gjs
 * import { get } from '@ember/helper';
 *
 * <template>
 *   {{get @someArray 0}}
 * </template>
 * ```
 *
 * To access a property on an object with a dynamic key:
 *
 * ```gjs
 * import { get } from '@ember/helper';
 *
 * <template>
 *   {{get @address @field}}
 * </template>
 * ```
 *
 * This will display the result of `@foo.item1` when `index` is `1`, and
 * `this.foo.item2` when `index` is `2`, etc.
 *
 * @method get
 * @for @ember/helper
 * @since 2.1.0
 * @exampleimport import { get } from '@ember/helper';
 * @public
 * @static
 */
export const get = glimmerGet as GetHelper;
export interface GetHelper extends Opaque<'helper:get'> {}

/**
 * `{{fn}}` is a helper that receives a function and some arguments, and returns
 * a new function that combines. This allows you to pass parameters along to
 * functions in your templates:
 *
 * ```gjs
 * function showAlert(message) {
 *   alert(`The message is: '${message}'`);
 * }
 *
 * <template>
 *   <button type="button" {{on "click" (fn showAlert "Hello!")}}>
 *     Click me!
 *   </button>
 * </template>
 * ```
 *
 * For example, if you have an `each` helper looping over a number of items, you
 * may need to pass a function that expects to receive the item as an argument
 * to a component invoked within the loop. Here's how you could use the `fn`
 * helper to pass both the function and its arguments together:
 *
 * ```gjs {data-filename="app/components/items-listing.gjs"}
 * <template>
 *   {{#each @items as |item|}}
 *     <DisplayItem @item=item @select={{fn this.handleSelected item}} />
 *   {{/each}}
 * </template>
 * ```
 *
 * ```gjs {data-filename="app/components/items-list.gjs"}
 * import Component from '@glimmer/component';
 * import { action } from '@ember/object';
 *
 * export default class ItemsList extends Component {
 *   @action
 *   handleSelected(item) {
 *     // ...snip...
 *   }
 * }
 * ```
 *
 * In this case the `DisplayItem` component will receive a normal function
 * that it can invoke. When it invokes the function, the `handleSelected`
 * function will receive the `item` and any arguments passed, thanks to the
 * `fn` helper.
 *
 * Let's take a look at what that means in a couple circumstances:
 *
 * - When invoked as `this.args.select()` the `handleSelected` function will
 * receive the `item` from the loop as its first and only argument.
 * - When invoked as `this.args.select('foo')` the `handleSelected` function
 * will receive the `item` from the loop as its first argument and the
 * string `'foo'` as its second argument.
 *
 * See also [partial application](https://en.wikipedia.org/wiki/Partial_application).
 *
 * The `fn` helper is available as a keyword and does not need to be imported.
 *
 * @method fn
 * @for Keywords
 * @noimport
 * @public
 * @since 3.11.0
 * @static
 */
export const fn = glimmerFn as FnHelper;
export interface FnHelper extends Opaque<'helper:fn'> {}

/**
 * The `{{gt}}` helper returns `true` if the first argument is greater than
 * the second argument.
 *
 * ```gjs
 * <template>
 *   {{if (gt @score 100) "High score!" "Keep trying"}}
 * </template>
 * ```
 *
 * The `gt` helper is available as a keyword and does not need to be imported.
 *
 * @method gt
 * @param {number} left
 * @param {number} right
 * @return {boolean}
 * @noimport
 * @for Keywords
 * @since 7.1.0
 * @static
 * @public
 */
export const gt = glimmerGt as unknown as GtHelper;
export interface GtHelper extends Opaque<'helper:gt'> {}

/**
 * The `{{gte}}` helper returns `true` if the first argument is greater than
 * or equal to the second argument.
 *
 * ```gjs
 * <template>
 *   {{if (gte @age 18) "Adult" "Minor"}}
 * </template>
 * ```
 *
 * The `gte` helper is available as a keyword and does not need to be imported.
 *
 * @method gte
 * @param {number} left
 * @param {number} right
 * @return {boolean}
 * @noimport
 * @for Keywords
 * @since 7.1.0
 * @static
 * @public
 */
export const gte = glimmerGte as unknown as GteHelper;
export interface GteHelper extends Opaque<'helper:gte'> {}

/**
 * The `{{lt}}` helper returns `true` if the first argument is less than
 * the second argument.
 *
 * ```gjs
 * <template>
 *   {{if (lt @temperature 0) "Freezing" "Above zero"}}
 * </template>
 * ```
 *
 * The `lt` helper is available as a keyword and does not need to be imported.
 *
 * @method lt
 * @param {number} left
 * @param {number} right
 * @return {boolean}
 * @noimport
 * @for Keywords
 * @since 7.1.0
 * @static
 * @public
 */
export const lt = glimmerLt as unknown as LtHelper;
export interface LtHelper extends Opaque<'helper:lt'> {}

/**
 * The `{{lte}}` helper returns `true` if the first argument is less than
 * or equal to the second argument.
 *
 * ```gjs
 * <template>
 *   {{if (lte @count 0) "Empty" "Has items"}}
 * </template>
 * ```
 *
 * The `lte` helper is available as a keyword and does not need to be imported.
 *
 * @method lte
 * @param {number} left
 * @param {number} right
 * @return {boolean}
 * @noimport
 * @for Keywords
 * @since 7.1.0
 * @static
 * @public
 */
export const lte = glimmerLte as unknown as LteHelper;
export interface LteHelper extends Opaque<'helper:lte'> {}

/**
 * The `element` helper lets you dynamically set the tag name of an element.
 *
 * ```gjs
 * <template>
 *   {{#let (element @tagName) as |Tag|}}
 *     <Tag class="my-element">Hello</Tag>
 *   {{/let}}
 * </template>
 * ```
 *
 * When `@tagName` is `"h1"`, this renders `<h1 class="my-element">Hello</h1>`.
 * When `@tagName` is an empty string, the block content is rendered without a
 * wrapping element. When `@tagName` is `null` or `undefined`, nothing is rendered.
 *
 * The `element` helper is available as a keyword and does not need to be imported.
 *
 * @method element
 * @param {string} tagName
 * @noimport
 * @for Keywords
 * @since 7.1.0
 * @static
 * @public
 */
export const element = glimmerElement as ElementHelper;
export interface ElementHelper extends Opaque<'helper:element'> {}

/**
 * Use the {{uniqueId}} helper to generate a unique ID string suitable for use as
 * an ID attribute in the DOM.
 *
 * Each invocation of {{uniqueId}} will return a new, unique ID string.
 * You can use the `let` helper to create an ID that can be reused within a template.
 *
 * ```gjs
 * import { uniqueId } from '@ember/helper';
 *
 * <template>
 *   {{#let (uniqueId) as |emailId|}}
 *     <label for={{emailId}}>Email address</label>
 *     <input id={{emailId}} type="email" />
 *   {{/let}}
 * </template>
 * ```
 *
 * @method uniqueId
 * @for @ember/helper
 * @public
 * @static
 * @exampleimport import { uniqueId } from '@ember/helper';
 * @since 4.4.0
 */
export const uniqueId = glimmerUniqueId;
export type UniqueIdHelper = typeof uniqueId;

/**
 * The `{{eq}}` helper returns `true` if its two arguments are strictly equal
 * (`===`). Takes exactly two arguments.
 *
 * ```gjs
 * <template>
 *   {{if (eq @status "active") "Active" "Inactive"}}
 * </template>
 * ```
 *
 * The `eq` helper is available as a keyword and does not need to be imported.
 *
 * @method eq
 * @param {unknown} left
 * @param {unknown} right
 * @return {boolean}
 * @noimport
 * @for Keywords
 * @static
 * @since 7.1.0
 * @public
 */
export const eq = glimmerEq as unknown as EqHelper;
export interface EqHelper extends Opaque<'helper:eq'> {}

/**
 * The `{{neq}}` helper returns `true` if its two arguments are strictly
 * not equal (`!==`). Takes exactly two arguments.
 *
 * ```gjs
 * <template>
 *   {{if (neq @status "active") "Not active" "Active"}}
 * </template>
 * ```
 *
 * The `neq` helper is available as a keyword and does not need to be imported.
 *
 * @method neq
 * @param {unknown} left
 * @param {unknown} right
 * @return {boolean}
 * @for Keywords
 * @noimport
 * @static
 * @since 7.1.0
 * @public
 */
export const neq = glimmerNeq as unknown as NeqHelper;
export interface NeqHelper extends Opaque<'helper:neq'> {}

/**
 * The `{{and}}` helper evaluates arguments left to right, returning the first
 * falsy value (using Handlebars truthiness) or the right-most value if all
 * are truthy. Requires at least two arguments.
 *
 * ```gjs
 * <template>
 *   {{if (and @isAdmin @isLoggedIn) "Welcome, admin!" "Access denied"}}
 * </template>
 * ```
 *
 * The `and` helper is available as a keyword and does not need to be imported.
 *
 * @method and
 * @param {unknown} args Two or more values to evaluate
 * @return {unknown} The first falsy value or the last value
 * @noimport
 * @for Keywords
 * @static
 * @since 7.1.0
 * @public
 */
export const and = glimmerAnd as unknown as AndHelper;
export interface AndHelper extends Opaque<'helper:and'> {}

/**
 * The `{{or}}` helper evaluates arguments left to right, returning the first
 * truthy value (using Handlebars truthiness) or the right-most value if all
 * are falsy. Requires at least two arguments.
 *
 * ```gjs
 * <template>
 *   {{if (or @hasAccess @isAdmin) "Welcome!" "No access"}}
 * </template>
 * ```
 *
 * In strict-mode (gjs/gts) templates, `or` is available as a keyword and
 * does not need to be imported.
 *
 * @method or
 * @param {unknown} args Two or more values to evaluate
 * @return {unknown} The first truthy value or the last value
 * @noimport
 * @for Keywords
 * @static
 * @since 7.1.0
 * @public
 */
export const or = glimmerOr as unknown as OrHelper;
export interface OrHelper extends Opaque<'helper:or'> {}

/**
 * The `{{not}}` helper returns the logical negation of its argument using
 * Handlebars truthiness. Takes exactly one argument.
 *
 * ```gjs
 * <template>
 *   {{if (not @isDisabled) "Enabled" "Disabled"}}
 * </template>
 * ```
 *
 * In strict-mode (gjs/gts) templates, `not` is available as a keyword and
 * does not need to be imported.
 *
 * @method not
 * @param {unknown} value The value to negate
 * @return {boolean}
 * @for Keywords
 * @noimport
 * @static
 * @since 7.1.0
 * @public
 */
export const not = glimmerNot as unknown as NotHelper;
export interface NotHelper extends Opaque<'helper:not'> {}

/**
  `{{yield}}` denotes an area of a template that will be rendered inside
  of another template.

  ### Use with `Component`

  When designing components, `{{yield}}` is used to denote where, inside the component's
  template, an optional block passed to the component should render:

  ```gjs {data-filename="app/templates/application.gjs"}
  import LabeledTextField from '../components/labeled-textfield';
    
  <template>
    <LabeledTextField @value={{@model.name}}>
      First name:
    </LabeledTextField>
  </template>
  ```

  ```gjs {data-filename="app/components/labeled-textfield.gjs"}
  import { Input } from '@ember/component';
    
  <template>
    <label>
      {{yield}} <Input @value={{@value}} />
    </label>
  </template>
  ```

  Result:

  ```html
  <label>
    First name: <input type="text" />
  </label>
  ```

  Additionally, you can `yield` properties into the context for use by the consumer:

  ```gjs {data-filename="app/templates/application.gjs"}
  import Component from '@glimmer/component';
  import LabeledTextField from '../components/labeled-textfield';
    
  export default class Application extends Component {
    firstNameValidator = (value) => {
      // validates
    }
    
    <template>
      <LabeledTextField @value={{@model.validation}} @validator={{this.firstNameValidator}} as |validationError|>
        {{#if validationError}}
          <p class="error">{{validationError}}</p>
        {{/if}}
        First name:
      </LabeledTextField>
    </template>
  }
  ```

  ```gjs {data-filename="app/components/labeled-textfield.gjs"}
  import { Input } from '@ember/component';
    
  <template>
    <label>
      {{yield this.validationError}} <Input @value={{@value}} />
    </label>
  </template>
  ```

  Result:

  ```html
  <label>
    <p class="error">First Name must be at least 3 characters long.</p>
    First name: <input type="text" />
  </label>
  ```

  `yield` can also be used with the `hash` helper:

  ```gjs {data-filename="app/templates/application.gjs"}
  import DateRanges from '../components/date-ranges';
    
  <template>
    <DateRanges @value={{@model.date}} as |range|>
      Start date: {{range.start}}
      End date: {{range.end}}
    </DateRanges>
  </template>
  ```

  ```gjs {data-filename="app/components/date-ranges.gjs"}
  <template>
    <div>
      {{yield (hash start=@value.start end=@value.end)}}
    </div>
  </template>
  ```

  Result:

  ```html
  <div>
    Start date: July 1st
    End date: July 30th
  </div>
  ```

  Multiple values can be yielded as block params:
    
  ```gjs {data-filename="app/templates/application.gjs"}
  import Banner from '../components/banner';
    
  <template>
    <Banner @value={{@model}} as |title subtitle body|>
      <h1>{{title}}</h1>
      <h2>{{subtitle}}</h2>
      {{body}}
    </Banner>
  </template>
  ```

  ```gjs {data-filename="app/components/banner.gjs"}
  <template>
    <div>
      {{yield "Hello title" "hello subtitle" "body text"}}
    </div>
  </template>
  ```

  Result:

  ```html
  <div>
    <h1>Hello title</h1>
    <h2>hello subtitle</h2>
    body text
  </div>
  ```

  However, it is preferred to use the hash helper, as this can prevent breaking changes to your component and also simplify the api for the component.

  Multiple components can be yielded with the `hash` and `component` helper:

  ```gjs {data-filename="app/templates/application.gjs"}
  import Banner from '../components/banner';

  <template>
    <Banner @value={{@model}} as |banner|>
      <banner.Title>Banner title</banner.Title>
      <banner.Subtitle>Banner subtitle</banner.Subtitle>
      <banner.Body>A load of body text</banner.Body>
    </Banner>
  </template>
  ```

  ```gjs {data-filename="app/components/banner.gjs"}
  import Title from './banner/title';
  import Subtitle from './banner/subtitle';
  import Body from './banner/body';

  export default class Banner extends Component {
    Title = Title;
    Subtitle = Subtitle;
    Body = Body;
    
    <template>
      <div>
        {{yield (hash
          Title=this.Title
          Subtitle=this.Subtitle
          Body=(component this.Body defaultArg="some value")
        )}}
      </div>
    </template>
  }
  ```

  Result:

  ```html
  <div>
    <h1>Banner title</h1>
    <h2>Banner subtitle</h2>
    A load of body text
  </div>
  ```

  A benefit of using this pattern is that the user of the component can change the order the components are displayed.

  ```gjs {data-filename="app/templates/application.gjs"}
  import Banner from '../components/banner';

  <template>
    <Banner @value={{@model}} as |banner|>
      <banner.Subtitle>Banner subtitle</banner.Subtitle>
      <banner.Title>Banner title</banner.Title>
      <banner.Body>A load of body text</banner.Body>
    </Banner>
  </template>
  ```

  Result:

  ```html
  <div>
    <h2>Banner subtitle</h2>
    <h1>Banner title</h1>
    A load of body text
  </div>
  ```

  Another benefit to using `yield` with the `hash` and `component` helper
  is you can pass attributes and arguments to these components:

  ```gjs {data-filename="app/templates/application.gjs"}
  import Banner from '../components/banner';

  <template>
    <Banner @value={{@model}} as |banner|>
      <banner.Subtitle class="mb-1">Banner subtitle</banner.Subtitle>
      <banner.Title @variant="loud">Banner title</banner.Title>
      <banner.Body>A load of body text</banner.Body>
    </Banner>
  </template>
  ```

  ```gjs {data-filename="app/components/banner/subtitle.gjs"}
  {{!-- note the use of ..attributes --}}
  <h2 ...attributes>
    {{yield}}
  </h2>
  ```

  ```gjs {data-filename="app/components/banner/title.gjs"}
  <template>
    {{#if (eq @variant "loud")}}
      <h1 class="loud">{{yield}}</h1>
    {{else}}
      <h1 class="quiet">{{yield}}</h1>
    {{/if}}
  </template>
  ```

  Result:

  ```html
  <div>
    <h2 class="mb-1">Banner subtitle</h2>
    <h1 class="loud">Banner title</h1>
    A load of body text
  </div>
  ```

  `yield` is available as a keyword and does not need to be imported.

  @method yield
  @param {Hash} options
  @return {String} HTML string
  @static
  @for Keywords
  @noimport
  @public
 */

/**
  `{{(has-block)}}` indicates if the component was invoked with a block.

  This component is invoked with a block:

  ```handlebars
  <MyComponent>
    Hi Jen!
  </MyComponent>
  ```

  This component is invoked without a block:

  ```handlebars
  <MyComponent />
  ```

  This is useful when you want to create a component that can optionally take a block
  and then render a default template when it is not invoked with a block.

  ```gjs {data-filename="app/components/my-component.gjs"}
  <template>
    {{#if (has-block)}}
      Welcome {{yield}}, we are happy you're here!
    {{else}}
      Hey you! You're great!
    {{/if}}
  </template>
  ```

  `has-block` is available as a keyword and does not need to be imported.

  @method has-block
  @param {String} blockName the name of the block. The name is either "main" or "inverse" (though only curly components support inverse) or the name given to a named block.
  @return {Boolean} `true` if the component was invoked with a block
  @static
  @for Keywords
  @noimport
  @public
 */

/**
  `{{(has-block-params)}}` indicates if the component was invoked with block params.

  This component is invoked with block params:
    
  ```handlebars
  <MyComponent as |favoriteFlavor|>
    Hi Jen!
  </MyComponent>
  ```

  And without block params:

  ```handlebars
  <MyComponent>
    Hi Jen!
  </MyComponent>
  ```

  This is useful when you want to create a component that can render itself
  differently when it is not invoked with block params.

  ```gjs {data-filename="app/components/my-component.gjs"}
  <template>
    {{#if (has-block-params)}}
      Welcome {{yield this.favoriteFlavor}}, we're happy you're here and hope you
      enjoy your favorite ice cream flavor.
    {{else}}
      Welcome {{yield}}, we're happy you're here, but we're unsure what
      flavor ice cream you would enjoy.
    {{/if}}
  </template>
  ```

  @method has-block-params
  @static
  @for Keywords
  @noimport
  @param {String} blockName the name of the block. The name is either "main" or "inverse" (though only curly components support inverse) or the name given to a named block.
  @return {Boolean} `true` if the component was invoked with block params
  @public
 */

/**
  Execute the `debugger` statement in the current template's context.

  ```handlebars
  {{debugger}}
  ```

  When using the debugger helper you will have access to a `get` function. This
  function retrieves values available in the context of the template.
  For example, if you're wondering why a value `{{foo}}` isn't rendering as
  expected within a template, you could place a `{{debugger}}` statement and,
  when the `debugger;` breakpoint is hit, you can attempt to retrieve this value:

  ```
  > get('foo')
  ```

  `get` is also aware of keywords. So in this situation

  ```handlebars
  {{#each this.items as |item|}}
    {{debugger}}
  {{/each}}
  ```

  You'll be able to get values from the current item:

  ```
  > get('item.name')
  ```

  You can also access the context of the view to make sure it is the object that
  you expect:

  ```
  > context
  ```

  @method debugger
  @static
  @for Keywords
  @noimport
  @public
 */

/**
  The `component` helper is used to package a Component with initial arguments.
  The included arguments can then be merged during the final invocation.

  See [Component](/ember/release/modules/@glimmer%2Fcomponent/) for
  additional information on how a `Component` functions.

  This is similar to the concept of Partial Application.
    
  For example, given a `FullName` component:
  
  ```gjs {data-filename="app/components/full-name.gjs"}
  import MyInputComponent from './my-input-component';
  
  <template>
    {{yield (component MyInputComponent value=@model.name placeholder="Username")}}
  </template>
  ```
  
  The yielded component can be invoked by the calling component.
  See the following snippet:
  
  ```gjs {data-filename="app/components/person-form.gjs"}
  import FullName from './full-name';
    
  <template>
    <FullName @model={{@model}} as |Field|>
      <Field />
    </FullName>
  </template>
  ```
  
  Which will output an input whose value is already bound to `@model.name` and `placeholder`
  is "Username".
    
  Any arguments passed at the invocation site of the component will override those applied via
  the `component` helper. For example, if the invocation site of the component is:

  ```gjs {data-filename="app/components/person-form.gjs"}
  import FullName from './full-name';

  <template>
    <FullName @model={{@model}} as |Field|>
      <Field @placeholder="Your name" />
    </FullName>
  </template>
  ```

  The output will be an input whose value is bound to `@model.name` and `placeholder`
  is "Your name".
    
  The `component` helper is built-in and does not need to be imported. 
    
  Prior to Strict Mode aka "Template Tag" or gjs, the component helper was also used to invoke
  components dynamically. This is no longer necessary, and they can be directly invoked, as above.

  ### Dynamic Component Invocation

  ```gjs {data-filename="app/templates/application.gjs"}
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';
  import { component } from '@ember/helper';
  import LiveUpdatingChart from '../components/live-updating-chart';
  import MarketCloseSummary from '../components/market-close-summary';

  export default class Application extends Component {
    @tracked isMarketOpen = false;

    get infographicComponent() {
      return this.isMarketOpen ? LiveUpdatingChart : MarketCloseSummary;
    }

    <template>
      {{!-- The component can be invoked directly --}}
      <this.infographicComponent />
    
      {{!-- The component helper here is no longer necessary --}}
      {{component this.infographicComponentName}}
    </template>
  }
  ```

  @method component
  @since 1.11.0
  @static
  @for Keywords
  @noimport
  @public
*/

/**
 Use the `{{helper}}` helper to create contextual helper so
 that it can be passed around as first-class values in templates.

 ```handlebars
 {{#let (helper "join-words" "foo" "bar" separator=" ") as |foo-bar|}}

   {{!-- this is equivalent to invoking `{{join-words "foo" "bar" separator=" "}}` --}}
   {{foo-bar}}

   {{!-- this will pass the helper itself into the component, instead of invoking it now --}}
   <MyComponent @helper={{helper foo-bar "baz"}} />

   {{!-- this will yield the helper itself ("contextual helper"), instead of invoking it now --}}
   {{yield foo-bar}}
 {{/let}}
 ```

 ### Arguments

 The `{{helper}}` helper works similarly to the [`{{component}}`](./component?anchor=component) and
 [`{{modifier}}`](./modifier?anchor=modifier) helper:

 * When passed a string (e.g. `(helper "foo")`) as the first argument,
   it will produce an opaque, internal "helper definition" object
   that can be passed around and invoked elsewhere.

 * Any additional positional and/or named arguments (a.k.a. params and hash)
   will be stored ("curried") inside the definition object, such that, when invoked,
   these arguments will be passed along to the referenced helper.


 @method helper
 @static
 @for Keywords
 @noimport
 @public
 @since 3.27.0
 */

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

  ```gjs {data-filename="app/templates/application.gjs"}
  import Weather from '../components/weather';
    
  <template>
    <Weather />
  </template>
  ```

  ```gjs {data-filename="app/components/weather.gjs"}
  <template>
    {{! will not render because greeting is undefined}}
    {{#if @isRaining}}
      Yes, grab an umbrella!
    {{/if}}
  </template>
  ```

  You can also define what to show if the property is falsey by using
  the `else` helper.

  ```gjs {data-filename="app/components/weather.gjs"}
  <template>
    {{#if @isRaining}}
      Yes, grab an umbrella!
    {{else}}
      No, it's lovely outside!
    {{/if}}
  </template>
  ```

  You are also able to combine `else` and `if` helpers to create more complex
  conditional logic.

  For the following template:

   ```gjs {data-filename="app/components/weather.gjs"}
  <template>
    {{#if @isRaining}}
      Yes, grab an umbrella!
    {{else if @isCold}}
      Grab a coat, it's chilly!
    {{else}}
      No, it's lovely outside!
    {{/if}}
  </template>  
  ```

  If you call it by saying `isCold` is true:

  ```gjs {data-filename="app/templates/application.gjs"}
  import Weather from '../components/weather';
    
  <template>
    <Weather @isCold={{true}} />
  </template>
  ```

  Then `Grab a coat, it's chilly!` will be rendered.

  ## Inline form

  The inline `if` helper conditionally renders a single property or string.

  In this form, the `if` helper receives three arguments, the conditional value,
  the value to render when truthy, and the value to render when falsey.

  For example, if `useLongGreeting` is truthy, the following:

  ```gjs {data-filename="app/templates/application.gjs"}
  import Greeting from '../components/greeting';
  
  <template>
    <Greeting @useLongGreeting={{true}} />
  <template>
  ```

  ```gjs {data-filename="app/components/greeting.gjs"}
  <template>
    {{if @useLongGreeting "Hello" "Hi"}} Alex
  <template>
  ```

  Will render:

  ```html
  Hello Alex
  ```

  One detail to keep in mind is that both branches of the `if` helper will be evaluated,
  so if you have `{{if condition "foo" (expensive-operation "bar")`,
  `expensive-operation` will always calculate.
 
  `if` is built-in and does not need to be imported.
 
  @method if
  @static
  @for Keywords
  @noimport
  @public
*/

/**
  The `unless` helper is the inverse of the `if` helper. It displays if a value
  is falsey ("not true" or "is false"). Example values that will display with
  `unless`: `false`, `undefined`, `null`, `""`, `0`, `NaN` or an empty array.

  ## Inline form

  The inline `unless` helper conditionally renders a single property or string.
  This helper acts like a ternary operator. If the first property is falsy,
  the second argument will be displayed, otherwise, the third argument will be
  displayed

  For example, if you pass a falsey `useLongGreeting` to the `Greeting` component:

  ```gjs {data-filename="app/templates/application.gjs"}
  import Greeting from '../components/greeting';
    
  <template>
    <Greeting @useLongGreeting={{false}} />
  </template>
  ```

  ```gjs {data-filename="app/components/greeting.gjs"}
  <template>
    {{unless @useLongGreeting "Hi" "Hello"}} Ben
  </template>
  ```

  Then it will display:

  ```html
  Hi Ben
  ```

  ## Block form

  Like the `if` helper, the `unless` helper also has a block form.

  The following will not render anything:

  ```gjs {data-filename="app/templates/application.gjs"}
  import Greeting from '../components/greeting';
    
  <template>
    <Greeting />
  </template>
  ```

  ```gjs {data-filename="app/components/greeting.gjs"}
  <template>
    {{#unless @greeting}}
      No greeting was found. Why not set one?
    {{/unless}}
  </template>
  ```

  You can also use an `else` helper with the `unless` block. The
  `else` will display if the value is truthy.

  If you have the following component:

  ```gjs {data-filename="app/components/logged-in.gjs"}
  <template>
    {{#unless @userData}}
      Please login.
    {{else}}
      Welcome back!
    {{/unless}}
  </template>
  ```

  Calling it with a truthy `userData`:

  ```gjs {data-filename="app/templates/application.gjs"}
  import LoggedIn from '../components/logged-in';
    
  <template>
    <LoggedIn @userData={{hash username="Zoey"}} />
  </template>
  ```

  Will render:

  ```html
  Welcome back!
  ```

  and calling it with a falsey `userData`:

  ```gjs {data-filename="app/templates/application.gjs"}
  import LoggedIn from '../components/logged-in';

  <template>
    <LoggedIn @userData={{false}} />
  </template>
  ```

  Will render:

  ```html
  Please login.
  ```
 
  `unless` is built-in and does not need to be imported.
 
  @method unless
  @for Keywords
  @noimport
  @static
  @public
*/

/**
  `log` allows you to output the value of variables in the current rendering
  context. `log` also accepts primitive types such as strings or numbers.

  ```handlebars
  {{log "myVariable:" myVariable }}
  ```
 
  `log` is built-in as a template keyword and does not need to be imported.

  @method log
  @for Keywords
  @noimport
  @static
  @param {Array} params
  @public
*/

/**
 Use the `{{modifier}}` helper to create contextual modifier so
 that it can be passed around as first-class values in templates.

 ```handlebars
 {{#let (modifier "click-outside" click=this.submit) as |on-click-outside|}}

   {{!-- this is equivalent to `<MyComponent {{click-outside click=this.submit}} />` --}}
   <MyComponent {{on-click-outside}} />

   {{!-- this will pass the modifier itself into the component, instead of invoking it now --}}
   <MyComponent @modifier={{modifier on-click-outside "extra" "args"}} />

   {{!-- this will yield the modifier itself ("contextual modifier"), instead of invoking it now --}}
   {{yield on-click-outside}}
 {{/let}}
 ```

 ### Arguments

 The `{{modifier}}` helper works similarly to the [`{{component}}`](./component?anchor=component) and
 [`{{helper}}`](./helper?anchor=helper) helper:

 * When passed a string (e.g. `(modifier "foo")`) as the first argument,
   it will produce an opaque, internal "modifier definition" object
   that can be passed around and invoked elsewhere.

 * Any additional positional and/or named arguments (a.k.a. params and hash)
   will be stored ("curried") inside the definition object, such that, when invoked,
   these arguments will be passed along to the referenced modifier.

 `modifier` is built-in as a template keyword and does not need to be imported.
 
 @method modifier
 @for Keywords
 @static
 @public
 @since 3.27.0
 */

/* eslint-enable @typescript-eslint/no-empty-object-type */
