import type { InternalOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import type { CapturedArguments, CurriedComponent, DynamicScope } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference/lib/reference';
import {
  childRefFromParts,
  createComputeRef,
  createConstRef,
  createDebugAliasRef,
  valueForRef,
} from '@glimmer/reference/lib/reference';
import type { CurriedValue } from '@glimmer/runtime/lib/curried-value';
import { createCapturedArgs, EMPTY_POSITIONAL } from '@glimmer/runtime/lib/vm/arguments';
import { curry } from '@glimmer/runtime/lib/curried-value';
import { dict } from '@glimmer/util/lib/collections';
import { OutletComponent, type OutletDefinitionState } from '../component-managers/outlet';
import { internalHelper } from '../helpers/internal-helper';
import type { OutletState } from '../utils/outlet';

/**
  The `{{outlet}}` helper lets you specify where a child route will render in
  your template. An important use of the `{{outlet}}` helper is in your
  application's `application.gjs` file:

  ```app/templates/application.gjs
  import MyHeader from '../components/my-header';
  import MyFooter from '../components/my-footer';

  <template>
    <MyHeader />

    <div class="my-dynamic-content">
      <!-- this content will change based on the current route, which depends on the current URL -->
      {{outlet}}
    </div>

    <MyFooter />
  </template>
  ```

  See the [routing guide](https://guides.emberjs.com/release/routing/rendering-a-template/) for more
  information on how your `route` interacts with the `{{outlet}}` helper.
  Note: Your content __will not render__ if there isn't an `{{outlet}}` for it.

  `outlet` is built-in and does not need to be imported.

  @method outlet
  @for Ember.Templates.helpers
  @public
*/
export const outletHelper = internalHelper(
  (_args: CapturedArguments, owner?: InternalOwner, scope?: DynamicScope) => {
    assert('Expected owner to be present, {{outlet}} requires an owner', owner);
    assert(
      'Expected dynamic scope to be present. You may have attempted to use the {{outlet}} keyword dynamically. This keyword cannot be used dynamically.',
      scope
    );

    let outletRef = createComputeRef(() => {
      let state = valueForRef(scope.get('outletState') as Reference<OutletState | undefined>);
      return state?.outlets?.main;
    });

    let lastState: OutletDefinitionState | null = null;
    let outlet: CurriedValue | null = null;

    return createComputeRef(() => {
      let outletState = valueForRef(outletRef);
      let state = stateFor(outletRef, outletState);

      // This code is deliberately using the behavior in glimmer-vm where in
      // <@Component />, the component is considered stabled via `===`, and
      // will continue to re-render in-place as long as the `===` holds, but
      // when it changes to a different object, it teardown the old component
      // (running destructors, etc), and render the component in its place (or
      // nothing if the new value is nullish. Here we are carefully exploiting
      // that fact, and returns the same stable object so long as it is the
      // same route, but return a different one when the route changes. On the
      // other hand, changing the model only intentionally do not teardown the
      // component and instead re-render in-place.
      if (isStable(state, lastState)) {
        return outlet;
      }

      lastState = state;

      if (state === null) {
        return null;
      }

      // Manager-driven routes provide a `wrapper` that already has its static
      // args applied; legacy `setOutletState` callers provide only a self-baked
      // `invokable`. Either way we apply `@context` and render the result.
      let target = state.wrapper ?? state.invokable;
      assert(
        'Expected outlet state to have a wrapper or invokable to render',
        target !== undefined
      );

      // If we are crossing an engine mount point, this is how the owner
      // gets switched.
      let outletOwner = outletState?.render?.owner ?? owner;

      let modelRef = childRefFromParts(outletRef, ['render', 'model']);
      let model = valueForRef(modelRef);

      let context: Reference = createComputeRef(() => {
        if (lastState === state) {
          model = valueForRef(modelRef);
        }
        return model;
      });

      if (DEBUG) {
        context = createDebugAliasRef!('@context', context);
      }

      // A single curry: the outlet component's template forwards `@context`
      // onto `@Component` (`<@Component @context={{@context}} />`), so the
      // target receives the live context without an inner curried layer.
      let named = dict<Reference>();
      named['Component'] = createConstRef(target, '@Component');
      named['context'] = context;

      outlet = curry(
        0 as CurriedComponent,
        new OutletComponent(owner, state),
        outletOwner,
        createCapturedArgs(named, EMPTY_POSITIONAL),
        true
      );

      return outlet;
    });
  }
);

function stateFor(
  ref: Reference<OutletState | undefined>,
  outlet: OutletState | undefined
): OutletDefinitionState | null {
  if (outlet === undefined) return null;
  let render = outlet.render;
  if (render === undefined) return null;

  // There is nothing to render until we have an invokable. This is either the
  // manager-driven invokable or a route template that `OutletView` upgraded
  // from a legacy raw `template`.
  if (render.invokable === undefined) return null;

  return {
    ref,
    name: render.name,
    controller: render.controller,
    wrapper: render.wrapper,
    invokable: render.invokable,
  };
}

function isStable(
  state: OutletDefinitionState | null,
  lastState: OutletDefinitionState | null
): boolean {
  if (state === null || lastState === null) {
    return false;
  }

  // Manager-driven routes: the curried wrapper is cached on the bucket, so it
  // is a stable identity (same per route, distinct per route change). Model
  // changes keep the same wrapper and re-render in place.
  if (state.wrapper !== undefined || lastState.wrapper !== undefined) {
    return state.wrapper === lastState.wrapper;
  }

  // Legacy `setOutletState` callers have no wrapper; key on the upgraded
  // invokable and controller.
  return state.invokable === lastState.invokable && state.controller === lastState.controller;
}
