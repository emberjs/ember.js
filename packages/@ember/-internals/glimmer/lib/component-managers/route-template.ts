import type { InternalOwner } from '@ember/-internals/owner';
import type {
  CapturedArguments,
  CompilableProgram,
  CustomRenderNode,
  Destroyable,
  InternalComponentCapabilities,
  Template,
  VMArguments,
  WithCreateInstance,
  WithCustomDebugRenderTree,
  WithDynamicLayout,
  WithSubOwner,
} from '@glimmer/interfaces';
import type { Nullable } from '@ember/-internals/utility-types';
import { setInternalComponentManager } from '@glimmer/manager/lib/internal/api';
import type { Reference } from '@glimmer/reference/lib/reference';
import { UNDEFINED_REFERENCE, valueForRef } from '@glimmer/reference/lib/reference';
import { unwrapTemplate } from './unwrap-template';
import type RuntimeResolver from '../resolver';

interface RouteTemplateInstanceState {
  self: Reference;
  // `getDynamicLayout` and `getOwner` only receive the instance state.
  template: Template;
  owner: InternalOwner;
}

const CAPABILITIES: InternalComponentCapabilities = {
  // Every route has its own template; `getDynamicLayout` supplies it.
  dynamicLayout: true,
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
  hasSubOwner: true,
};

class RouteTemplateManager
  implements
    WithCreateInstance<RouteTemplateInstanceState, RouteTemplate>,
    WithCustomDebugRenderTree<RouteTemplateInstanceState, RouteTemplate>,
    WithDynamicLayout<RouteTemplateInstanceState, Nullable<RuntimeResolver>>,
    WithSubOwner<RouteTemplateInstanceState, RouteTemplate>
{
  create(
    _owner: InternalOwner,
    definition: RouteTemplate,
    _args: VMArguments
  ): RouteTemplateInstanceState {
    return {
      self: definition.self,
      template: definition.template,
      owner: definition.owner,
    };
  }

  getDynamicLayout({ template }: RouteTemplateInstanceState): CompilableProgram {
    // `asLayout()` memoizes, so this compiles once per route.
    return unwrapTemplate(template).asLayout();
  }

  // The owner `makeRouteTemplate` was handed, not the call site's.
  getOwner({ owner }: RouteTemplateInstanceState): InternalOwner {
    return owner;
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
    readonly owner: InternalOwner,
    readonly name: string,
    readonly template: Template,
    readonly self: Reference
  ) {}
}

setInternalComponentManager(ROUTE_TEMPLATE_MANAGER, RouteTemplate.prototype);

export function makeRouteTemplate(
  owner: InternalOwner,
  name: string,
  template: Template,
  self: Reference = UNDEFINED_REFERENCE
): RouteTemplate {
  return new RouteTemplate(owner, name, template, self);
}
