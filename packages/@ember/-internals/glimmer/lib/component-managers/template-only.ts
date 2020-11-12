import {
  ComponentCapabilities,
  ComponentDefinition,
  Environment,
  Option,
  Template,
  WithStaticLayout,
} from '@glimmer/interfaces';
import { NULL_REFERENCE, Reference } from '@glimmer/reference';

const CAPABILITIES: ComponentCapabilities = {
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
};

export interface DebugStateBucket {
  environment: Environment;
}

export default class TemplateOnlyComponentManager
  implements WithStaticLayout<Option<DebugStateBucket>, TemplateOnlyComponentDefinitionState> {
  getStaticLayout({ template }: TemplateOnlyComponentDefinitionState): Template {
    return template;
  }

  getCapabilities(): ComponentCapabilities {
    return CAPABILITIES;
  }

  getDebugName({ name }: TemplateOnlyComponentDefinitionState): string {
    return name;
  }

  getSelf(): Reference {
    return NULL_REFERENCE;
  }

  getDestroyable(): null {
    return null;
  }
}

const MANAGER = new TemplateOnlyComponentManager();

export interface TemplateOnlyComponentDefinitionState {
  name: string;
  template: Template;
}

export class TemplateOnlyComponentDefinition
  implements
    TemplateOnlyComponentDefinitionState,
    ComponentDefinition<
      TemplateOnlyComponentDefinitionState,
      Option<DebugStateBucket>,
      TemplateOnlyComponentManager
    > {
  manager = MANAGER;
  constructor(public name: string, public template: Template) {}

  get state(): TemplateOnlyComponentDefinitionState {
    return this;
  }
}
