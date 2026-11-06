// gxt NATIVE layer — alias target for
// `@ember/-internals/glimmer/lib/templates/link-to` (design §2.2): the AOT
// replacement of the classic `precompileTemplate` link-to layout. The REUSED
// classic LinkTo class (`components/link-to.ts`) registers it through
// InternalComponent's `opaquify` → `setComponentTemplate`; the native component
// manager's internal-component adapter (native/managers.ts) renders it with
// `this` = the LinkTo instance (`instance[$template](args)`).
//
// Same DOM contract as the classic template, attribute for attribute and in the
// same order: the default `id` / `class` and the deprecated attribute bindings
// come BEFORE `...attributes` (the invocation's attributes override them; the
// classes merge), `href` comes AFTER (the invocation cannot override it), and
// `{{on 'click' this.click}}` installs the transition handler.
import { on } from '@ember/modifier/on';

export default <template><a
  id={{this.id}}
  class={{this.class}}
  role={{this.role}}
  title={{this.title}}
  rel={{this.rel}}
  tabindex={{this.tabindex}}
  target={{this.target}}
  ...attributes
  href={{this.href}}
  {{on 'click' this.click}}
>{{yield}}</a></template>
