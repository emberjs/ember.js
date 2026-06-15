/**
  The wrapper component returned by `ClassicRouteManager.getRouteWrapper`.
  The outlet helper curries `@Component` (the per-render invokable), `@model`,
  and `@controller` onto an instance of this definition; the wrapper template
  forwards `@model` and `@controller` onto the invokable.

  A fresh definition is created per bucket so two routes sharing a `Route`
  class still produce distinct wrapper identities for the outlet's stability
  check.
*/

import type {
  CustomRenderNode,
  InternalComponentCapabilities,
  InternalComponentManager,
  Reference,
  WithCustomDebugRenderTree,
} from '@glimmer/interfaces';
import { setInternalComponentManager } from '@glimmer/manager/lib/internal/api';
import { setComponentTemplate } from '@glimmer/manager/lib/public/template';
import { NULL_REFERENCE } from '@glimmer/reference/lib/reference';
import { precompileTemplate } from '@ember/template-compilation';

// Shared template used by every wrapper instance. Renders the invokable
// curried in as `@Component` and forwards `@model` / `@controller` onto it.
const CLASSIC_WRAPPER_TEMPLATE = precompileTemplate(
  `<@Component @model={{@model}} @controller={{@controller}} />`,
  {
    moduleName: 'packages/@ember/-internals/routing/route-managers/classic/wrapper.hbs',
    strictMode: true,
  }
);

class ClassicRouteWrapperManager
  implements
    InternalComponentManager<null, ClassicRouteWrapperDefinition>,
    WithCustomDebugRenderTree<null, ClassicRouteWrapperDefinition>
{
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
      dynamicScope: false,
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
