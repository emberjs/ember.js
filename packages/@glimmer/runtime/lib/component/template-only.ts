import { InternalComponentCapabilities, InternalComponentManager } from '@glimmer/interfaces';
import { NULL_REFERENCE, Reference } from '@glimmer/reference';
import { setInternalComponentManager } from '@glimmer/manager';

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

export class TemplateOnlyComponentManager implements InternalComponentManager {
  getCapabilities(): InternalComponentCapabilities {
    return CAPABILITIES;
  }

  getDebugName({ name }: TemplateOnlyComponentDefinition): string {
    return name;
  }

  getSelf(): Reference {
    return NULL_REFERENCE;
  }

  getDestroyable(): null {
    return null;
  }
}

export const TEMPLATE_ONLY_COMPONENT_MANAGER = new TemplateOnlyComponentManager();

// This is only exported for types, don't use this class directly
export class TemplateOnlyComponentDefinition {
  constructor(
    public moduleName = '@glimmer/component/template-only',
    public name = '(unknown template-only component)'
  ) {}

  toString() {
    return this.moduleName;
  }
}

setInternalComponentManager(
  () => TEMPLATE_ONLY_COMPONENT_MANAGER,
  TemplateOnlyComponentDefinition.prototype
);

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

export function templateOnlyComponent(
  moduleName?: string,
  name?: string
): TemplateOnlyComponentDefinition {
  return new TemplateOnlyComponentDefinition(moduleName, name);
}
