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
  @static
  @method templateOnly
  @param {String} moduleName the module name that the template only component represents, this will be used for debugging purposes
  @for @ember/component/template-only
  @category EMBER_GLIMMER_SET_COMPONENT_TEMPLATE
*/
import { type Opaque } from '@ember/-internals/utility-types';
import { templateOnlyComponent as glimmerTemplateOnlyComponent } from '@glimmer/runtime';

/**
 * Template-only components have no backing class instance, so this in their
 * templates is null. This means that you can only reference passed in arguments
 * via named argument syntax (e.g. `{{@arg}}`):
 *
 * ```hbs
 * {{!--
 *   This does not work, since `this` does not exist
 * --}}
 * <label for="title">Title</label>
 * <Input @value={{this.value}} id="title" />
 * ```
 *
 * Additionally, the mut helper generally can't be used for the same reason:
 *
 * ```hbs
 * {{!-- This does not work --}}
 * <input
 *   value={{this.value}}
 *   onkeyup={{action (mut this.value) target="value"}}
 * />
 * ```
 *
 * Since Octane, a template-only component shares a subset of features that are
 * available in `@glimmer/component`. Such component can be seamlessly
 * "upgraded" to a Glimmer component, when you add a JavaScript file alongside
 * the template.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TemplateOnlyComponent<S = unknown> extends Opaque<S> {}

/**
 * A convenience alias for {@link TemplateOnlyComponent}
 */
export type TOC<S> = TemplateOnlyComponent<S>;

// NOTES:
//
// 1. The generic here is for a *signature: a way to hang information for tools
//    like Glint which can provide typey checking for component templates using
//    information supplied via this generic. While it may appear useless on this
//    class definition and extension, it is used by external tools and should
//    not be removed.
// 2. SAFETY: this cast is *throwing away* information that is not part of the
//    public API and replacing it with something which has the same calling
//    contract, but much less information (since we do not want to expose the
//    internal APIs like `moduleName` etc.).
// prettier-ignore
const templateOnly =
  glimmerTemplateOnlyComponent as unknown as
    <S>(moduleName?: string, name?: string) => TemplateOnlyComponent<S>;
export default templateOnly;
