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
  InternalComponentCapabilities,
  InternalComponentManager,
  Reference,
  WithCustomDebugRenderTree,
} from '@glimmer/interfaces';
import { setInternalComponentManager } from '@glimmer/manager/lib/internal/api';
import { setComponentTemplate } from '@glimmer/manager/lib/public/template';
import { NULL_REFERENCE } from '@glimmer/reference/lib/reference';
import { precompileTemplate } from '@ember/template-compilation';
// EXPERIMENT ONLY — see EXPERIMENT-CLASSIC-OUTLET-USAGE.md
import { recordUse } from '../probe';

// Module scope: always fires, because `classic/manager.ts` imports this and is
// itself always evaluated via `@ember/routing/route`.
recordUse('classic:wrapper-eval');

// Renders the invokable passed in as `@Component` and forwards
// `@model` / `@controller` onto it. The outlet renders this directly as its
// own layout for `CLASSIC_ROUTE_WRAPPER`; see `layoutFor` in `./outlet-manager`.
export const CLASSIC_WRAPPER_TEMPLATE = precompileTemplate(
  `<@Component @model={{@context}} @controller={{@bucket.controller}} @outlet={{@outlet}}/>`,
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
    // Render-time hook: only reached when the classic wrapper is actually
    // rendered by the outlet (this manager has `createInstance: false`, so
    // `getSelf` is the earliest per-render hook available).
    recordUse('classic:wrapper-render');
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
//
// The outlet renders `CLASSIC_WRAPPER_TEMPLATE` as its own layout rather than
// invoking this wrapper, so the manager above never runs. That is only sound
// while the manager stays unobservable: `createInstance: false`, a `getSelf`
// the template never reads, and `[]` from `getDebugCustomRenderTree`. Give it
// anything to contribute and `layoutFor` must send classic through
// `WRAPPER_LAYOUT` like any other wrapper.
export const CLASSIC_ROUTE_WRAPPER = new ClassicRouteWrapperDefinition();
