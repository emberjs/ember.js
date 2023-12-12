import type { InternalOwner } from '@ember/-internals/owner';
import { assert, deprecate } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import type { CapturedArguments, DynamicScope } from '@glimmer/interfaces';
import { CurriedType } from '@glimmer/vm';
import type { Reference } from '@glimmer/reference';
import {
  childRefFromParts,
  createComputeRef,
  createDebugAliasRef,
  valueForRef,
} from '@glimmer/reference';
import type { CurriedValue } from '@glimmer/runtime';
import { createCapturedArgs, curry, EMPTY_POSITIONAL } from '@glimmer/runtime';
import { dict } from '@glimmer/util';
import type { OutletDefinitionState } from '../component-managers/outlet';
import { OutletComponentDefinition } from '../component-managers/outlet';
import { internalHelper } from '../helpers/internal-helper';
import type { OutletState } from '../utils/outlet';
import { isTemplateFactory } from '../template';

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

function stateFor(
  ref: Reference<OutletState | undefined>,
  outlet: OutletState | undefined
): OutletDefinitionState | null {
  if (outlet === undefined) return null;
  let render = outlet.render;
  if (render === undefined) return null;
  let template = render.template;
  if (template === undefined) return null;

  if (isTemplateFactory(template)) {
    template = template(render.owner);

    if (DEBUG) {
      let message =
        'The `template` property of `OutletState` should be a ' +
        '`Template` rather than a `TemplateFactory`. This is known to be a ' +
        "problem in older versions of `@ember/test-helpers`. If you haven't " +
        'done so already, try upgrading to the latest version.\n\n';

      if (template.result === 'ok' && typeof template.moduleName === 'string') {
        message +=
          'The offending template has a moduleName `' +
          template.moduleName +
          '`, which might be helpful for identifying ' +
          'source of this issue.\n\n';
      }

      message +=
        'Please note that `OutletState` is a private API in Ember.js ' +
        "and not meant to be used outside of the framework's internal code.";

      deprecate(message, false, {
        id: 'outlet-state-template-factory',
        until: '5.9.0',
        for: 'ember-source',
        since: {
          available: '5.6.0',
          enabled: '5.6.0',
        },
      });
    }
  }

  return {
    ref,
    name: render.name,
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
