import { precompileTemplate } from '@ember/template-compilation';
import { on } from '@ember/modifier';

export default precompileTemplate(
  `<a
  {{!-- for compatibility --}}
  id={{this.id}}
  class={{this.class}}

  {{!-- deprecated attribute bindings --}}
  role={{this.role}}
  title={{this.title}}
  rel={{this.rel}}
  tabindex={{this.tabindex}}
  target={{this.target}}

  ...attributes

  href={{this.href}}

  {{on 'click' this.click}}
>{{yield}}</a>`,
  {
    moduleName: 'packages/@ember/-internals/glimmer/lib/templates/link-to.hbs',
    strictMode: true,
    scope() {
      return { on };
    },
  }
);
