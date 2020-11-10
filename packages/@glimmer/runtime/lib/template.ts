import { DEBUG } from '@glimmer/env';
import { debugToString } from '@glimmer/util';
import { TemplateFactory } from '@glimmer/interfaces';

const TEMPLATES: WeakMap<object, TemplateFactory> = new WeakMap();

const getPrototypeOf = Object.getPrototypeOf;

export function setComponentTemplate(factory: TemplateFactory, obj: object) {
  if (DEBUG && !(obj !== null && (typeof obj === 'object' || typeof obj === 'function'))) {
    throw new Error(`Cannot call \`setComponentTemplate\` on \`${debugToString!(obj)}\``);
  }

  if (DEBUG && TEMPLATES.has(obj)) {
    throw new Error(
      `Cannot call \`setComponentTemplate\` multiple times on the same class (\`${debugToString!(
        obj
      )}\`)`
    );
  }

  TEMPLATES.set(obj, factory);

  return obj;
}

export function getComponentTemplate(obj: object): TemplateFactory | undefined {
  let pointer = obj;

  while (pointer !== null) {
    let template = TEMPLATES.get(pointer);

    if (template !== undefined) {
      return template;
    }

    pointer = getPrototypeOf(pointer);
  }

  return undefined;
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
