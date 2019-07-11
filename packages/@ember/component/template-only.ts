// This is only exported for types, don't use this class directly
export class TemplateOnlyComponent {
  constructor(public moduleName = '@ember/component/template-only') {}

  toString(): string {
    return this.moduleName;
  }
}

/**
  @module @ember/component/template-only
  @public
*/

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
  import templateOnly from '@ember/component/template-only';

  export default templateOnly();
  ```

  @public
  @method templateOnly
  @param {String} moduleName the module name that the template only component represents, this will be used for debugging purposes
  @category EMBER_GLIMMER_SET_COMPONENT_TEMPLATE
*/
export default function templateOnlyComponent(moduleName: string): TemplateOnlyComponent {
  return new TemplateOnlyComponent(moduleName);
}

export function isTemplateOnlyComponent(component: unknown): component is TemplateOnlyComponent {
  return component instanceof TemplateOnlyComponent;
}
