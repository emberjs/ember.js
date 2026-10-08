/**
@module @ember/modifier
@public
*/

import { setModifierManager as glimmerSetModifierManager } from '@glimmer/manager/lib/public/api';

import type Owner from '@ember/owner';
import type { ModifierManager } from '@glimmer/interfaces';

export { on, type OnModifier } from './on';

/**
  Sets the modifier manager for an object or function.

  ```js
  import { setModifierManager } from '@ember/modifier';

  export default setModifierManager(
    (owner) => new MyModifierManager(owner),
    class MyModifier {}
  );
  ```

  When a value is used as a modifier in a template, the modifier manager is
  looked up on the object by walking up its prototype chain and finding the
  first modifier manager. This manager then receives the value and can create
  and manage an instance of a modifier from it. This lets addons such as
  `ember-modifier` design their own high-level modifier APIs on top of a small,
  stable primitive.

  Modifier managers were introduced in
  [RFC #373, Element Modifier Managers](https://rfcs.emberjs.com/id/0373-element-modifier-managers),
  which describes the design and motivation in more detail.

  `setModifierManager` receives two arguments:

  1. A factory function, which receives the `owner` and returns an instance of a
    modifier manager.
  2. A modifier definition, which is the object or function to associate the
    factory function with.

  The first time the definition is looked up, the factory function will be
  called to create the modifier manager. It will be cached per `owner`, and in
  subsequent lookups the cached modifier manager will be used instead. Because
  one manager is shared by every usage of the definition, managers should
  generally be stateless, keeping per-modifier state in the value returned from
  `createModifier`.

  Modifier managers must fulfill the following interface (This example uses
  [TypeScript interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html)
  for precision, you do not need to write modifier managers using TypeScript):

  ```ts
  interface ModifierManager<ModifierStateBucket> {
    capabilities: ModifierCapabilities;

    createModifier(definition: ModifierDefinition, args: TemplateArgs): ModifierStateBucket;

    installModifier(bucket: ModifierStateBucket, element: Element, args: TemplateArgs): void;

    updateModifier(bucket: ModifierStateBucket, args: TemplateArgs): void;

    destroyModifier(bucket: ModifierStateBucket, args: TemplateArgs): void;
  }

  interface TemplateArgs {
    positional: unknown[];
    named: Record<string, unknown>;
  }
  ```

  The `capabilities` property _must_ be set to the result of calling the
  `capabilities` function exported from `@ember/modifier`.

  #### `createModifier`

  Receives the modifier definition and the arguments, and returns a state
  bucket that is passed to the other hooks. It is called before the element is
  available, so it should not do any DOM work.

  #### `installModifier`

  Called once the element the modifier is attached to has been inserted into
  the DOM. Any args consumed while this hook runs are tracked, unless the
  `disableAutoTracking` capability is enabled.

  #### `updateModifier`

  Called when any of the tracked args consumed during the previous
  `installModifier` or `updateModifier` call have changed.

  #### `destroyModifier`

  Called when the modifier is torn down, either because the element is being
  removed or because the modifier is no longer applied to it.

  An example manager for a function-based modifier:

  ```js
  import { setModifierManager, capabilities } from '@ember/modifier';

  class FunctionModifierManager {
    capabilities = capabilities('3.22');

    createModifier(fn) {
      return { fn, element: null, teardown: null };
    }

    installModifier(state, element, args) {
      state.element = element;
      state.teardown = state.fn(element, args.positional, args.named);
    }

    updateModifier(state, args) {
      state.teardown?.();
      state.teardown = state.fn(state.element, args.positional, args.named);
    }

    destroyModifier(state) {
      state.teardown?.();
    }
  }

  export function modifier(fn) {
    return setModifierManager(() => new FunctionModifierManager(), fn);
  }
  ```

  @method setModifierManager
  @for @ember/modifier
  @static
  @param {Function} factory A factory function which receives the owner, and returns a modifier manager
  @param {object} definition The definition to associate the manager factory with
  @return {object} The definition passed into setModifierManager
  @since 3.8.0
  @public
*/
// NOTE: this uses assignment to *require* that the `glimmerSetModifierManager`
// is legally assignable to this type, i.e. that variance is properly upheld.
export const setModifierManager: <T extends object>(
  factory: (owner: Owner) => ModifierManager<unknown>,
  modifier: T
) => T = glimmerSetModifierManager;

export type { ModifierManager };

export type { ModifierCapabilities } from '@glimmer/interfaces';
/**
  `capabilities` returns a capabilities configuration which can be used to modify
  the behavior of a modifier manager. Manager capabilities _must_ be provided
  using the `capabilities` function, as the underlying implementation can change
  over time.

  The first argument is a version string, which is the version of Ember that the
  capabilities were defined in. Currently the only supported version is `'3.22'`.

  ```js
  capabilities('3.22');
  ```

  The second argument is an object of capabilities and boolean values indicating
  whether they are enabled or disabled.

  ```js
  capabilities('3.22', { disableAutoTracking: true });
  ```

  ### `3.22` capabilities

  #### `disableAutoTracking`

  - Default value: false

  When enabled, args consumed during `installModifier` and `updateModifier` are
  not tracked, so changes to them will not cause `updateModifier` to be called.

  @method capabilities
  @static
  @for @ember/modifier
  @param {String} managerApiVersion The version of capabilities that are being used
  @param options The capabilities values
  @return {Capabilities} The capabilities object instance
  @since 3.22.0
  @public
*/
export { modifierCapabilities as capabilities } from '@glimmer/manager/lib/public/modifier';
