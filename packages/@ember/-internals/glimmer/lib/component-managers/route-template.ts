import type { InternalOwner } from '@ember/-internals/owner';
import { _instrumentStart } from '@ember/instrumentation';
import type {
  CapturedArguments,
  CompilableProgram,
  ComponentDefinition,
  CustomRenderNode,
  Destroyable,
  InternalComponentCapabilities,
  Template,
  VMArguments,
  WithCreateInstance,
  WithCustomDebugRenderTree,
} from '@glimmer/interfaces';
import type { Nullable } from '@ember/-internals/utility-types';
import { DEBUG } from '@glimmer/env';
import { capabilityFlagsFrom } from '@glimmer/manager';
import type { Reference } from '@glimmer/reference';
import { createDebugAliasRef, valueForRef } from '@glimmer/reference';
import { curry, type CurriedValue } from '@glimmer/runtime';
import { unwrapTemplate } from './unwrap-template';
import { CurriedType } from '@glimmer/vm';

interface RouteTemplateInstanceState {
  self: Reference;
  controller: unknown;
}

export interface RouteTemplateDefinitionState {
  name: string;
  templateName: string;
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

const CAPABILITIES_MASK = capabilityFlagsFrom(CAPABILITIES);

class RouteTemplateManager
  implements
    WithCreateInstance<RouteTemplateInstanceState, RouteTemplateDefinitionState>,
    WithCustomDebugRenderTree<RouteTemplateInstanceState, RouteTemplateDefinitionState>
{
  create(
    _owner: InternalOwner,
    _definition: RouteTemplateDefinitionState,
    args: VMArguments
  ): RouteTemplateInstanceState {
    let self = args.named.get('controller');

    if (DEBUG) {
      self = createDebugAliasRef!('this', self);
    }

    let controller = valueForRef(self);

    return { self, controller };
  }

  getSelf({ self }: RouteTemplateInstanceState): Reference {
    return self;
  }

  getDebugName({ name }: RouteTemplateDefinitionState) {
    return `route-template (${name})`;
  }

  getDebugCustomRenderTree(
    { name, templateName }: RouteTemplateDefinitionState,
    state: RouteTemplateInstanceState,
    args: CapturedArguments
  ): CustomRenderNode[] {
    return [
      {
        bucket: state,
        type: 'route-template',
        name,
        args,
        instance: state.controller,
        template: templateName,
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

const ROUTE_TEMPLATE_MANAGER = new RouteTemplateManager();

/**
 * This "upgrades" a route template into a invocable component. Conceptually
 * it can be 1:1 for each unique `Template`, but it's also cheap to construct,
 * so unless the stability is desirable for other reasons, it's probably not
 * worth caching this.
 */
export class RouteTemplate
  implements
    ComponentDefinition<
      RouteTemplateDefinitionState,
      RouteTemplateInstanceState,
      RouteTemplateManager
    >
{
  // handle is not used by this custom definition
  public handle = -1;
  public resolvedName: string;
  public state: RouteTemplateDefinitionState;
  public manager = ROUTE_TEMPLATE_MANAGER;
  public capabilities = CAPABILITIES_MASK;
  public compilable: CompilableProgram;

  constructor(name: string, template: Template) {
    let unwrapped = unwrapTemplate(template);
    // TODO This actually seems inaccurate – it ultimately came from the
    // outlet's name. Also, setting this overrides `getDebugName()` in that
    // message. Is that desirable?
    this.resolvedName = name;
    this.state = { name, templateName: unwrapped.moduleName };
    this.compilable = unwrapped.asLayout();
  }
}

// TODO a lot these fields are copied from the adjacent existing components
// implementation, haven't looked into who cares about `ComponentDefinition`
// and if it is appropriate here. It seems like this version is intended to
// be used with `curry` which probably isn't necessary here. It could be the
// case that we just want to do something more similar to `InternalComponent`
// (the one we used to implement `Input` and `LinkTo`). For now it follows
// the same pattern to get things going.
export function makeRouteTemplate(
  owner: InternalOwner,
  name: string,
  template: Template
): CurriedValue {
  let routeTemplate = new RouteTemplate(name, template);
  return curry(CurriedType.Component, routeTemplate, owner, null, true);
}
