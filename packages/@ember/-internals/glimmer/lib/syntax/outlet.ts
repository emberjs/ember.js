import type { InternalOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';

import type {
  CapturedArguments,
  CurriedComponent,
  DynamicScope,
  Template,
} from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import {
  childRefFromParts,
  createComputeRef,
  createConstRef,
  createDebugAliasRef,
  valueForRef,
} from '@glimmer/reference';
import type { CurriedValue } from '@glimmer/runtime';
import { createCapturedArgs, curry, EMPTY_POSITIONAL } from '@glimmer/runtime';
import { dict } from '@glimmer/util';
import { hasInternalComponentManager } from '@glimmer/manager';
import { OutletComponent, type OutletDefinitionState } from '../component-managers/outlet';
import { makeRouteTemplate } from '../component-managers/route-template';
import { internalHelper } from '../helpers/internal-helper';
import type { OutletState } from '../utils/outlet';

/**
  The `{{outlet}}` helper lets you specify where a child route will render in
  your template. An important use of the `{{outlet}}` helper is in your
  application's `application.hbs` file:

  ```app/templates/application.hbs
  <MyHeader />

  <div class="my-dynamic-content">
    <!-- this content will change based on the current route, which depends on the current URL -->
    {{outlet}}
  </div>

  <MyFooter />
  ```

  See the [routing guide](https://guides.emberjs.com/release/routing/rendering-a-template/) for more
  information on how your `route` interacts with the `{{outlet}}` helper.
  Note: Your content __will not render__ if there isn't an `{{outlet}}` for it.

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

          let named = dict<Reference>();

          // Here we either have a raw template that needs to be normalized,
          // or a component that we can render as-is. `RouteTemplate` upgrades
          // the template into a component so we can have a unified code path.
          // We still store the original `template` value, because we rely on
          // its identity for the stability check, and the `RouteTemplate`
          // wrapper doesn't dedup for us.
          let template = state.template;
          let component: object;

          if (hasInternalComponentManager(template)) {
            component = template;
          } else {
            if (import.meta.env?.DEV) {
              // We don't appear to have a standard way or a brand to check, but for the
              // purpose of avoiding obvious user errors, this probably gets you close
              // enough.
              let isTemplate = (template: unknown): template is Template => {
                if (template === null || typeof template !== 'object') {
                  return false;
                } else {
                  let t = template as Partial<Template>;
                  return t.result === 'ok' || t.result === 'error';
                }
              };

              // We made it past the `TemplateFactory` instantiation before
              // getting here, so either we got unlucky where the invalid type
              // happens to be a function that didn't mind taking owner as an
              // argument, or this was directly set by something like test
              // helpers.
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

            component = makeRouteTemplate(outletOwner, state.name, template as Template);
          }

          // Component is stable for the lifetime of the outlet
          named['Component'] = createConstRef(component, '@Component');

          // Controller is stable for the lifetime of the outlet
          named['controller'] = createConstRef(state.controller, '@controller');

          // Create a ref for the model
          let modelRef = childRefFromParts(outletRef, ['render', 'model']);

          // Store the value of the model
          let model = valueForRef(modelRef);

          // Create a compute ref which we pass in as the `{{@model}}` reference
          // for the outlet. This ref will update and return the value of the
          // model _until_ the outlet itself changes. Once the outlet changes,
          // dynamic scope also changes, and so the original model ref would not
          // provide the correct updated value. So we stop updating and return
          // the _last_ model value for that outlet.
          named['model'] = createComputeRef(() => {
            if (lastState === state) {
              model = valueForRef(modelRef);
            }

            return model;
          });

          if (import.meta.env?.DEV) {
            named['model'] = createDebugAliasRef!('@model', named['model']);
          }

          let args = createCapturedArgs(named, EMPTY_POSITIONAL);

          // Package up everything
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
  let template = render.template;
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

  return state.template === lastState.template && state.controller === lastState.controller;
}
