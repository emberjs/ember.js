import type { InternalOwner } from '@ember/-internals/owner';
import type {
  CapturedArguments,
  CustomRenderNode,
  Destroyable,
  InternalComponentCapabilities,
  Template,
  VMArguments,
  WithCreateInstance,
  WithCustomDebugRenderTree,
} from '@glimmer/interfaces';
import type { Nullable } from '@ember/-internals/utility-types';
import { setInternalComponentManager } from '@glimmer/manager/lib/internal/api';
import { setComponentTemplate } from '@glimmer/manager/lib/public/template';
import type { Reference } from '@glimmer/reference/lib/reference';
import { UNDEFINED_REFERENCE, valueForRef } from '@glimmer/reference/lib/reference';

interface RouteTemplateInstanceState {
  self: Reference;
}

const CAPABILITIES: InternalComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: true,
  attributeHook: false,
  elementHook: false,
  createCaller: false,
  dynamicScope: false,
  updateHook: false,
  createInstance: true,
  wrapped: false,
  willDestroy: false,
  hasSubOwner: false,
};

class RouteTemplateManager
  implements
    WithCreateInstance<RouteTemplateInstanceState, RouteTemplate>,
    WithCustomDebugRenderTree<RouteTemplateInstanceState, RouteTemplate>
{
  create(
    _owner: InternalOwner,
    definition: RouteTemplate,
    _args: VMArguments
  ): RouteTemplateInstanceState {
    return {
      self: definition.self,
    };
  }

  getSelf({ self }: RouteTemplateInstanceState): Reference {
    return self;
  }

  getDebugName({ name }: RouteTemplate) {
    return `route-template (${name})`;
  }

  getDebugCustomRenderTree(
    { name }: RouteTemplate,
    state: RouteTemplateInstanceState,
    args: CapturedArguments
  ): CustomRenderNode[] {
    return [
      {
        bucket: state,
        type: 'route-template',
        name,
        args,
        instance: valueForRef(state.self),
      },
    ];
  }

  getCapabilities(): InternalComponentCapabilities {
    return CAPABILITIES;
  }

  didRenderLayout() {}
  didUpdateLayout() {}

  didCreate() {}
  didUpdate() {}

  getDestroyable(): Nullable<Destroyable> {
    return null;
  }
}

const ROUTE_TEMPLATE_MANAGER = /*@__PURE__*/ new RouteTemplateManager();

/**
 * This "upgrades" a route template into an invokable component. A
 * `RouteTemplate` *is* its own definition state; the VM turns it into a
 * `ComponentDefinition` via the manager on the prototype below.
 *
 * Conceptually it can be 1:1 for each unique `Template`, but it's also cheap
 * to construct, so unless the stability is desirable for other reasons, it's
 * probably not worth caching this.
 */
export class RouteTemplate {
  constructor(
    readonly name: string,
    readonly self: Reference
  ) {}
}

setInternalComponentManager(ROUTE_TEMPLATE_MANAGER, RouteTemplate.prototype);

export function makeRouteTemplate(
  name: string,
  template: Template,
  self: Reference = UNDEFINED_REFERENCE
): RouteTemplate {
  let routeTemplate = new RouteTemplate(name, self);

  setComponentTemplate(() => template, routeTemplate);

  return routeTemplate;
}
