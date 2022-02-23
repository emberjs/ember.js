import { Owner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { CapturedArguments, CurriedType, DynamicScope } from '@glimmer/interfaces';
import {
  childRefFromParts,
  createComputeRef,
  createDebugAliasRef,
  Reference,
  valueForRef,
} from '@glimmer/reference';
import { createCapturedArgs, CurriedValue, curry, EMPTY_POSITIONAL } from '@glimmer/runtime';
import { dict } from '@glimmer/util';
import { OutletComponentDefinition, OutletDefinitionState } from '../component-managers/outlet';
import { internalHelper } from '../helpers/internal-helper';
import { isTemplateFactory } from '../template';
import { OutletState } from '../utils/outlet';

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
  (_args: CapturedArguments, owner?: Owner, scope?: DynamicScope) => {
    assert('Expected owner to be present, {{outlet}} requires an owner', owner);
    assert(
      'Expected dynamic scope to be present. You may have attempted to use the {{outlet}} keyword dynamically. This keyword cannot be used dynamically.',
      scope
    );

    let outletRef = createComputeRef(() => {
      let state = valueForRef(scope.get('outletState') as Reference<OutletState | undefined>);
      let outlets = state !== undefined ? state.outlets : undefined;

      return outlets !== undefined ? outlets['main'] : undefined;
    });

    let lastState: OutletDefinitionState | null = null;
    let definition: CurriedValue | null = null;

    return createComputeRef(() => {
      let outletState = valueForRef(outletRef);
      let state = stateFor(outletRef, outletState);

      if (!validate(state, lastState)) {
        lastState = state;

        if (state !== null) {
          let named = dict<Reference>();

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

          if (DEBUG) {
            named['model'] = createDebugAliasRef!('@model', named['model']);
          }

          let args = createCapturedArgs(named, EMPTY_POSITIONAL);
          definition = curry(
            CurriedType.Component,
            new OutletComponentDefinition(state),
            outletState?.render?.owner ?? owner,
            args,
            true
          );
        } else {
          definition = null;
        }
      }

      return definition;
    });
  }
);

function stateFor(ref: Reference, outlet: OutletState | undefined): OutletDefinitionState | null {
  if (outlet === undefined) return null;
  let render = outlet.render;
  if (render === undefined) return null;
  let template = render.template;
  if (template === undefined) return null;

  // this guard can be removed once @ember/test-helpers@1.6.0 has "aged out"
  // and is no longer considered supported
  if (isTemplateFactory(template)) {
    template = template(render.owner);
  }

  return {
    ref,
    name: render.name,
    outlet: render.outlet,
    template,
    controller: render.controller,
    model: render.model,
  };
}

function validate(state: OutletDefinitionState | null, lastState: OutletDefinitionState | null) {
  if (state === null) {
    return lastState === null;
  }
  if (lastState === null) {
    return false;
  }
  return state.template === lastState.template && state.controller === lastState.controller;
}
