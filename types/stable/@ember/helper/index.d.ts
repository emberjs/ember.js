declare module '@ember/helper' {
  /**
    @module @ember/helper
    */
  import {
    setHelperManager as glimmerSetHelperManager,
    helperCapabilities,
  } from '@glimmer/manager';
  import { invokeHelper as glimmerInvokeHelper } from '@glimmer/runtime';
  import { uniqueId as glimmerUniqueId } from '@ember/-internals/glimmer';
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
      @for @ember/helper
      @static
      @param {String} managerApiVersion The version of capabilities that are being used
      @param options The capabilities values
      @return {Capabilities} The capabilities object instance
      @public
    */
  export const capabilities: typeof helperCapabilities;
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
      including changes to tracked properties, changes made using `Ember.set`, updates
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
      @public
    */
  export const setHelperManager: typeof glimmerSetHelperManager;
  /**
      The `invokeHelper` function can be used to create a helper instance in
      JavaScript.

      To access a helper's value you have to use `getValue` from
      `@glimmer/tracking/primitives/cache`.

      ```js
      // app/components/data-loader.js
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
      ```
      ```js
      {{this.value}}
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
      @public
    */
  export const invokeHelper: typeof glimmerInvokeHelper;
  /**
   * Using the `{{hash}}` helper, you can pass objects directly from the template
   * as an argument to your components.
   *
   * ```
   * import { hash } from '@ember/helper';
   *
   * <template>
   *   {{#each-in (hash givenName='Jen' familyName='Weber') as |key value|}}
   *     <p>{{key}}: {{value}}</p>
   *   {{/each-in}}
   * </template>
   * ```
   *
   * **NOTE:** this example uses the experimental `<template>` feature, which is
   * the only place you need to import `hash` to use it (it is a built-in when
   * writing standalone `.hbs` files).
   */
  export const hash: HashHelper;
  export interface HashHelper extends Opaque<'helper:hash'> {}
  /**
   * Using the `{{array}}` helper, you can pass arrays directly from the template
   * as an argument to your components.
   *
   * ```js
   * import { array } from '@ember/helper';
   *
   * <template>
   *   <ul>
   *   {{#each (array 'Tom Dale' 'Yehuda Katz' @anotherPerson) as |person|}}
   *     <li>{{person}}</li>
   *   {{/each}}
   *   </ul>
   * </template>
   *
   * **NOTE:** this example uses the experimental `<template>` feature, which is
   * the only place you need to import `array` to use it (it is a built-in when
   * writing standalone `.hbs` files).
   * ```
   */
  export const array: ArrayHelper;
  export interface ArrayHelper extends Opaque<'helper:array'> {}
  /**
   * The `{{concat}}` helper makes it easy to dynamically send a number of
   * parameters to a component or helper as a single parameter in the format of a
   * concatenated string.
   *
   * For example:
   *
   * ```js
   * import { concat } from '@ember/helper';
   *
   * <template>
   *   {{get @foo (concat "item" @index)}}
   * </template>
   * ```
   *
   * This will display the result of `@foo.item1` when `index` is `1`, and
   * `this.foo.item2` when `index` is `2`, etc.
   *
   * **NOTE:** this example uses the experimental `<template>` feature, which is
   * the only place you need to import `concat` to use it (it is a built-in when
   * writing standalone `.hbs` files).
   */
  export const concat: ConcatHelper;
  export interface ConcatHelper extends Opaque<'helper:concat'> {}
  /**
   * The `{{get}}` helper makes it easy to dynamically look up a property on an
   * object or an element in an array. The second argument to `{{get}}` can be a
   * string or a number, depending on the object being accessed.
   *
   * To access a property on an object with a string key:
   *
   * ```js
   * import { get } from '@ember/helper';
   *
   * <template>
   *   {{get @someObject "objectKey"}}
   * </template>
   * ```
   *
   * To access the first element in an array:
   *
   * ```js
   * import { get } from '@ember/helper';
   *
   * <template>
   *   {{get @someArray 0}}
   * </template>
   * ```
   *
   * To access a property on an object with a dynamic key:
   *
   * ```js
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
   * **NOTE:** this example uses the experimental `<template>` feature, which is
   * the only place you need to import `concat` to use it (it is a built-in when
   * writing standalone `.hbs` files).
   */
  export const get: GetHelper;
  export interface GetHelper extends Opaque<'helper:get'> {}
  /**
   * `{{fn}}` is a helper that receives a function and some arguments, and returns
   * a new function that combines. This allows you to pass parameters along to
   * functions in your templates:
   *
   * ```js
   * import { fn } from '@ember/helper';
   *
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
   */
  export const fn: FnHelper;
  export interface FnHelper extends Opaque<'helper:fn'> {}
  /**
   * Use the {{uniqueId}} helper to generate a unique ID string suitable for use as
   * an ID attribute in the DOM.
   *
   * Each invocation of {{uniqueId}} will return a new, unique ID string.
   * You can use the `let` helper to create an ID that can be reused within a template.
   *
   * ```js
   * import { uniqueId } from '@ember/helper';
   *
   * <template>
   *   {{#let (uniqueId) as |emailId|}}
   *     <label for={{emailId}}>Email address</label>
   *     <input id={{emailId}} type="email" />
   *   {{/let}}
   * </template>
   * ```
   */
  export const uniqueId: typeof glimmerUniqueId;
  export type UniqueIdHelper = typeof uniqueId;
}
