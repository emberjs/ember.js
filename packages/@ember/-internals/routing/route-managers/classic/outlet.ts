import type { InternalOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import type { CapturedArguments, DynamicScope } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference/lib/reference';
import { createComputeRef, valueForRef } from '@glimmer/reference/lib/reference';
import { setComponentTemplate } from '@glimmer/manager/lib/public/template';
import { precompileTemplate } from '@ember/template-compilation';
import { OutletComponent } from './outlet-manager';
import { internalHelper } from '../../../glimmer/lib/helpers/internal-helper';
import type { OutletState } from '../outlet-state';
// EXPERIMENT ONLY — see EXPERIMENT-CLASSIC-OUTLET-USAGE.md
import { recordUse } from '../probe';

const OUTLET_COMPONENT_TEMPLATE = precompileTemplate(
  `{{#if @wrapper}}<@wrapper @Component={{@Component}} @bucket={{@bucket}} @context={{@context}} @outlet={{@outlet}} />{{else}}<@Component @context={{@context}} @outlet={{@outlet}} />{{/if}}`,
  {
    strictMode: true,
  }
);

setComponentTemplate(OUTLET_COMPONENT_TEMPLATE, OutletComponent.prototype);

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
    recordUse('outlet:helper');
    assert('Expected owner to be present, {{outlet}} requires an owner', owner);
    assert(
      'Expected dynamic scope to be present. You may have attempted to use the {{outlet}} keyword dynamically. This keyword cannot be used dynamically.',
      scope
    );

    // Renders the child `outletState` or a root outlet
    let outletRef = createComputeRef(() => {
      let state = valueForRef(scope.get('outletState') as Reference<OutletState | undefined>);

      return state?.outlets?.main;
    });

    let ref = createComputeRef(() => {
      recordUse('outlet:helper-compute');
      return OutletComponent.getCachedComponent(valueForRef(outletRef)?.render, outletRef, owner);
    });

    if (DEBUG) {
      // A truthy label would be stamped onto the definition, shadowing
      // `getDebugName()` in render stacks.
      ref.debugLabel = false;
    }

    return ref;
  }
);
