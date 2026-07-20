import type { InternalOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import type { CapturedArguments, CurriedComponent, DynamicScope } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference/lib/reference';
import {
  createComputeRef,
  createConstRef,
  createDebugAliasRef,
  valueForRef,
} from '@glimmer/reference/lib/reference';
import type { CurriedValue } from '@glimmer/runtime/lib/curried-value';
import { createCapturedArgs, EMPTY_POSITIONAL } from '@glimmer/runtime/lib/vm/arguments';
import { curry } from '@glimmer/runtime/lib/curried-value';
import { dict } from '@glimmer/util/lib/collections';
import { precompileTemplate } from '@ember/template-compilation';
import { OutletComponent, type OutletDefinitionState } from './outlet-manager';
import { internalHelper } from '../../../glimmer/lib/helpers/internal-helper';
import type { OutletState } from '../outlet-state';

const OUTLET_COMPONENT_TEMPLATE = precompileTemplate('<@Component @outlet={{(outlet)}} />', {
  strictMode: true,
  scope() {
    return { outlet: outletHelper };
  },
});

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
export const outletHelper = /*@__PURE__*/ internalHelper(
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

      // If we are crossing an engine mount point, this is how the owner
      // gets switched.
      let outletOwner = outletState?.render?.owner ?? owner;

      // `@context` is opaque to the outlet: the route manager builds it.
      let produceContext = outletState?.render?.produceContext;
      let context: Reference = produceContext
        ? produceContext(outletRef, lastState!, state)
        : createConstRef(undefined, '@context');

      if (DEBUG) {
        context = createDebugAliasRef!('@context', context);
      }

      // stateFor guarantees an invokable is present.
      assert('Expected outlet state to have an invokable to render', state.invokable !== undefined);

      // Args are delivered by currying them onto the render target — the
      // outlet's layout is otherwise arg-less. Currying (rather than writing
      // the args into the layout) keeps the target from showing up as an
      // opaque `@Component` frame in the debug render tree and
      // backtracking-assertion messages. Curried refs stay live, so the
      // `@context` compute ref keeps updating across renders of the mount.
      // (`@outlet` — the child `{{outlet}}` — is supplied by the outlet layout
      // itself; see `OUTLET_COMPONENT_TEMPLATE`.)
      let targetArgs = dict<Reference>();
      let target;

      if (state.wrapper !== undefined) {
        // Manager render with a wrapper: the RFC's wrapper args —
        // `@Component` (the per-bucket invokable), `@bucket`, and the live
        // `@context`.
        targetArgs['Component'] = createConstRef(state.invokable, '@Component');
        targetArgs['bucket'] = createConstRef(state.bucket, '@bucket');
        target = state.wrapper;
      } else {
        // Wrapper-less render (a manager that opted out of
        // `getRouteWrapper`): the invokable itself is the target and receives
        // only the live `@context` (plus the layout's `@outlet`).
        target = state.invokable;
      }

      targetArgs['context'] = context;

      let named = dict<Reference>();
      named['Component'] = createConstRef(
        curry(
          0 as CurriedComponent,
          target,
          outletOwner,
          createCapturedArgs(targetArgs, EMPTY_POSITIONAL),
          false
        ),
        '@Component'
      );

      outlet = curry(
        0 as CurriedComponent,
        new OutletComponent(owner, state, OUTLET_COMPONENT_TEMPLATE),
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

  // There is nothing to render until the manager provides an invokable.
  if (render.invokable === undefined) return null;

  return {
    ref,
    name: render.name,
    controller: render.controller,
    wrapper: render.wrapper,
    invokable: render.invokable,
    bucket: render.bucket,
  };
}

function isStable(
  state: OutletDefinitionState | null,
  lastState: OutletDefinitionState | null
): boolean {
  if (state === null || lastState === null) {
    return false;
  }

  // Manager-driven routes with a wrapper: the wrapper is module-stable, so
  // route identity is carried by the per-bucket invokable. `controller` is
  // deliberately excluded here: it can legitimately appear after the first
  // render (setupController runs in didEnter) and must not tear the route
  // down.
  if (state.wrapper !== undefined || lastState.wrapper !== undefined) {
    return state.wrapper === lastState.wrapper && state.invokable === lastState.invokable;
  }

  // Wrapper-less renders key on the invokable and controller.
  return state.invokable === lastState.invokable && state.controller === lastState.controller;
}
