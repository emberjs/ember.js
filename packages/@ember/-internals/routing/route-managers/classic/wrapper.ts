/**
  The wrapper component returned by `ClassicRouteManager.getRouteWrapper`.
  Module-stable — one instance serves every route. The outlet invokes it
  with `@Component` (the per-bucket invokable), `@context` (the live model),
  and `@bucket`; the template forwards model and controller onto the
  invokable. Route identity for the outlet's stability check is carried by
  the invokable, not the wrapper.
*/

import type {
  CustomRenderNode,
  DynamicScope,
  InternalComponentCapabilities,
  InternalComponentManager,
  Reference,
  WithCustomDebugRenderTree,
} from '@glimmer/interfaces';
import { setInternalComponentManager } from '@glimmer/manager/lib/internal/api';
import { setComponentTemplate } from '@glimmer/manager/lib/public/template';
import { NULL_REFERENCE } from '@glimmer/reference/lib/reference';
import { precompileTemplate } from '@ember/template-compilation';
import { outletHelper } from '@ember/-internals/glimmer/lib/syntax/outlet';

// Renders the invokable passed in as `@Component` and forwards
// `@model` / `@controller` onto it.
const CLASSIC_WRAPPER_TEMPLATE = precompileTemplate(
  `<@Component @model={{@context}} @controller={{@bucket.controller}} @outlet={{outlet}}/>`,
  {
    moduleName: 'packages/@ember/-internals/routing/route-managers/classic/wrapper.hbs',
    strictMode: true,
    scope() {
      return {
        outlet: outletHelper
      }
    },
  }
);

class ClassicRouteWrapperManager
  implements
    InternalComponentManager<null, ClassicRouteWrapperDefinition>,
    WithCustomDebugRenderTree<null, ClassicRouteWrapperDefinition>
{
  create(_owner: unknown,
    _definition: unknown,
    _args: unknown,
    _env: unknown,
    dynamicScope: DynamicScope) {
      console.log('calling create in wrapper manager')
      console.log(dynamicScope)
  }
  getCapabilities(): InternalComponentCapabilities {
    // Match templateOnlyComponent's capabilities: no element, no args capture,
    // no instance state.
    return {
      dynamicLayout: false,
      dynamicTag: false,
      prepareArgs: false,
      createArgs: false,
      attributeHook: false,
      elementHook: false,
      createCaller: false,
      dynamicScope: true,
      updateHook: false,
      createInstance: false,
      wrapped: false,
      willDestroy: false,
      hasSubOwner: false,
    };
  }

  getDebugName(): string {
    return '';
  }

  // Returning an empty array hides the wrapper from the debug render tree, so
  // the tree shape stays the same as before the wrapper layer existed.
  getDebugCustomRenderTree(): CustomRenderNode[] {
    return [];
  }

  getSelf(): Reference {
    return NULL_REFERENCE;
  }

  getDestroyable(): null {
    return null;
  }
}

export class ClassicRouteWrapperDefinition {}

setInternalComponentManager(
  new ClassicRouteWrapperManager(),
  ClassicRouteWrapperDefinition.prototype
);
setComponentTemplate(CLASSIC_WRAPPER_TEMPLATE, ClassicRouteWrapperDefinition.prototype);

// The one wrapper instance shared by every classic route.
export const CLASSIC_ROUTE_WRAPPER = new ClassicRouteWrapperDefinition();
