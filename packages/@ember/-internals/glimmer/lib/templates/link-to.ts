import { hbs } from '@lifeart/gxt';

export default function LinkToTemplate() {
  return hbs`<a
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

    {{on 'click' this.click}} >{{yield}}</a>`;
}
