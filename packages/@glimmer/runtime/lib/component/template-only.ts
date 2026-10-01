import type { InternalComponentCapabilities, InternalComponentManager } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference/lib/reference';
import { setInternalComponentManager } from '@glimmer/manager/lib/internal/api';
import { NULL_REFERENCE } from '@glimmer/reference/lib/reference';

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
  hasSubOwner: false,
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
  TEMPLATE_ONLY_COMPONENT_MANAGER,
  TemplateOnlyComponentDefinition.prototype
);

/**
  This utility function is used to declare a given component has no backing class. When the rendering engine detects this it
  is able to perform a number of optimizations. Templates that are associated with `templateOnly()` will be rendered _as is_
  without adding a wrapping `<div>` (or any of the other element customization behaviors of [@ember/component](/ember/release/classes/Component)).
  Specifically, this means that the template will be rendered as "outer HTML".

  In general, build time tooling calls this method, and an application does not call it directly.
  Direct use can help when you want the "outer HTML" semantics mentioned above.
  For example, an addon may want these semantics for its templates, but it cannot be certain
  that all consuming applications enabled the `template-only-glimmer-components` optional feature.

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
