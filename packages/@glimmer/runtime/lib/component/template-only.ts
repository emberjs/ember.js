import {
  ComponentDefinition,
  InternalComponentCapabilities,
  Template,
  WithStaticLayout,
} from '@glimmer/interfaces';
import { NULL_REFERENCE, Reference } from '@glimmer/reference';

const CAPABILITIES: InternalComponentCapabilities = {
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

export class TemplateOnlyComponentManager
  implements WithStaticLayout<null, TemplateOnlyComponentDefinitionState> {
  getStaticLayout({ template }: TemplateOnlyComponentDefinitionState): Template {
    return template;
  }

  getCapabilities(): InternalComponentCapabilities {
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
    ComponentDefinition<TemplateOnlyComponentDefinitionState, null, TemplateOnlyComponentManager> {
  manager = MANAGER;
  constructor(public name: string, public template: Template) {}

  get state(): TemplateOnlyComponentDefinitionState {
    return this;
  }
}

// This is only exported for types, don't use this class directly
export class TemplateOnlyComponent {
  constructor(public moduleName = '@glimmer/component/template-only') {}

  toString(): string {
    return this.moduleName;
  }
}

/**
  This utility function is used to declare a given component has no backing class. When the rendering engine detects this it
  is able to perform a number of optimizations. Templates that are associated with `templateOnly()` will be rendered _as is_
  without adding a wrapping `<div>` (or any of the other element customization behaviors of [@ember/component](/ember/release/classes/Component)).
  Specifically, this means that the template will be rendered as "outer HTML".

  In general, this method will be used by build time tooling and would not be directly written in an application. However,
  at times it may be useful to use directly to leverage the "outer HTML" semantics mentioned above. For example, if an addon would like
  to use these semantics for its templates but cannot be certain it will only be consumed by applications that have enabled the
  `template-only-glimmer-components` optional feature.

  @example

  ```js
  import { templateOnlyComponent } from '@glimmer/runtime';

  export default templateOnlyComponent();
  ```

  @public
  @method templateOnly
  @param {String} moduleName the module name that the template only component represents, this will be used for debugging purposes
  @category EMBER_GLIMMER_SET_COMPONENT_TEMPLATE
*/

export function templateOnlyComponent(moduleName?: string): TemplateOnlyComponent {
  return new TemplateOnlyComponent(moduleName);
}

export function isTemplateOnlyComponent(component: unknown): component is TemplateOnlyComponent {
  return component instanceof TemplateOnlyComponent;
}
