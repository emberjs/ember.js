import type { InternalOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import type {
  CapturedArguments,
  CurriedComponent,
  DynamicScope,
  Template,
} from '@glimmer/interfaces';
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
import { hasInternalComponentManager } from '@glimmer/manager/lib/internal/api';
import { OutletComponent, type OutletDefinitionState } from '../component-managers/outlet';
import { makeRouteTemplate } from '../component-managers/route-template';
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
      if (!isStable(state, lastState)) {
        lastState = state;

        if (state !== null) {
          // If we are crossing an engine mount point, this is how the owner
          // gets switched.
          let outletOwner = outletState?.render?.owner ?? owner;
          let component: object;

          let wrapperArgs = dict<Reference>();
          // Only curry @controller when the route has one.
          const controller = outletState?.render?.controller;
          if (controller !== undefined) {
            wrapperArgs['controller'] = createConstRef(controller, '@controller');
          }

          let modelRef = childRefFromParts(outletRef, ['render', 'model']);
          let model = valueForRef(modelRef);

          wrapperArgs['context'] = createComputeRef(() => {
            if (lastState === state) {
              let currentOutlet = valueForRef(outletRef);
              if (currentOutlet?.render?.controller === controller) {
                model = valueForRef(modelRef);
              }
            }
            return model;
          });

          if (DEBUG) {
            wrapperArgs['context'] = createDebugAliasRef!('@context', wrapperArgs['context']);
          }

          if (state.wrapper !== undefined && state.invokable !== undefined) {
            wrapperArgs['Component'] = createConstRef(state.invokable, '@Component');

            if (state.routeInfo !== undefined) {
              wrapperArgs['routeInfo'] = createConstRef(state.routeInfo, '@routeInfo');
            }

            component = curry(
              0 as CurriedComponent,
              state.wrapper,
              outletOwner,
              createCapturedArgs(wrapperArgs, EMPTY_POSITIONAL),
              false
            );
          } else {
            // Legacy `setOutletState` path: a raw template or a pre-built
            // component definition. Older test-helpers and liquid-fire-style
            // addons call `setOutletState` with a `template` and a
            // `controller`. We curry `@controller` and `@model` directly onto
            // the makeRouteTemplate-wrapped component so the RouteTemplate
            // manager can read them when computing `self`.
            let template = state.template;

            if (hasInternalComponentManager(template)) {
              component = template;
            } else {
              if (DEBUG) {
                let isTemplate = (template: unknown): template is Template => {
                  if (template === null || typeof template !== 'object') {
                    return false;
                  } else {
                    let t = template as Partial<Template>;
                    return t.result === 'ok' || t.result === 'error';
                  }
                };

                if (!isTemplate(template)) {
                  let label: string;
                  try {
                    label = `\`${String(template)}\``;
                  } catch {
                    label = 'an unknown object';
                  }

                  assert(
                    `Failed to render the \`${state.name}\` route: expected ` +
                      `a component or Template object, but got ${label}.`
                  );
                }
              }

              let routeTemplate = makeRouteTemplate(outletOwner, state.name, template as Template);

              component = curry(
                0 as CurriedComponent,
                routeTemplate,
                outletOwner,
                createCapturedArgs(wrapperArgs, EMPTY_POSITIONAL),
                false
              );
            }
          }

          let named = dict<Reference>();
          named['Component'] = createConstRef(component, '@Component');
          let args = createCapturedArgs(named, EMPTY_POSITIONAL);

          outlet = curry(
            0 as CurriedComponent,
            new OutletComponent(owner, state),
            outletOwner,
            args,
            true
          );
        } else {
          outlet = null;
        }
      }

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

  // Manager-driven path: prefer wrapper + invokable when present.
  if (render.wrapper !== undefined && render.invokable !== undefined) {
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

  // Legacy path: raw template from setOutletState callers.
  const template = render.template;

  // The type doesn't actually allow for `null`, but if we make it past this
  // point it is really important that we have _something_ to render. We could
  // assert, but that is probably overly strict for very little to gain.
  if (template === undefined || template === null) return null;

  return {
    ref,
    name: render.name,
    template,
    controller: render.controller,
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
