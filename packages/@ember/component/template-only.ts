/**
  @module @ember/component/template-only
  @public
*/

/**
  This utility function is used to declare a given component has no backing class. When the rendering engine detects this it
  is able to perform a number of optimizations. Templates that are associated with `templateOnly()` will be rendered _as is_
  without adding a wrapping `<div>` (or any of the other element customization behaviors of [@ember/component](/ember/release/classes/Component)).
  Specifically, this means that the template will be rendered as "outer HTML".

  In apps, this method will usually be inserted by build-time tooling the handles converting `.hbs` files into component Javascript modules and
  would not be directly written by the application author.

  Addons may want to use this method directly to ensure that a template-only component is treated consistently in all Ember versions (Ember versions
  before 4.0 have a "template-only-glimmer-components" optional feature that causes a standalone `.hbs` file to be interpreted differently).

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
 * Template-only components have no backing class instance, so `this` in their
 * templates is null. This means that you can only reference passed in arguments
 * (e.g. `{{@arg}}`).
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
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
