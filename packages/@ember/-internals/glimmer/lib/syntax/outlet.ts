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

      let wrapperArgs = dict<Reference>();

      let modelRef = childRefFromParts(outletRef, ['render', 'model']);
      let model = valueForRef(modelRef);

      wrapperArgs['context'] = createComputeRef(() => {
        if (lastState === state) {
          model = valueForRef(modelRef);
        }
        return model;
      });

      if (DEBUG) {
        wrapperArgs['context'] = createDebugAliasRef!('@context', wrapperArgs['context']);
      }

      wrapperArgs['Component'] = createConstRef(state.invokable, '@Component');
      wrapperArgs['bucket'] = createConstRef(state.bucket, '@bucket');
      // plan to remove routeInfo, currently needed by pioneer route
      wrapperArgs['routeInfo'] = createConstRef(state.routeInfo, '@routeInfo');

      // Only curry @controller when the route has one.
      const controller = outletState?.render?.controller;
      if (controller !== undefined) {
        wrapperArgs['controller'] = createConstRef(controller, '@controller');
      }

      // Manager-driven routes provide a stable `wrapper` whose template renders
      // the invokable as `<@Component/>` and forwards `@context`/`@controller`
      // into it. Legacy `setOutletState` callers have no wrapper, so we curry
      // the args straight onto the invokable (a route template, which reads
      // `@controller` as its `self`).
      let target = state.wrapper ?? state.invokable;
      assert(
        'Expected outlet state to have a wrapper or invokable to render',
        target !== undefined
      );

      // If we are crossing an engine mount point, this is how the owner
      // gets switched.
      let outletOwner = outletState?.render?.owner ?? owner;
      let named = dict<Reference>();
      named['Component'] = createConstRef(
        curry(
          0 as CurriedComponent,
          target,
          outletOwner,
          createCapturedArgs(wrapperArgs, EMPTY_POSITIONAL),
          false
        ),
        '@Component'
      );

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
    template: render.invokable,
    controller: render.controller,
    wrapper: render.wrapper,
    invokable: render.invokable,
    bucket: render.bucket,
    routeInfo: render.routeInfo,
  };
}

function isStable(
  state: OutletDefinitionState | null,
  lastState: OutletDefinitionState | null
): boolean {
  if (state === null || lastState === null) {
    return false;
  }

  if (state.wrapper !== undefined || lastState.wrapper !== undefined) {
    return state.wrapper === lastState.wrapper;
  }

  return state.template === lastState.template && state.controller === lastState.controller;
}
