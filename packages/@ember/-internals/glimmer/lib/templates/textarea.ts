import { precompileTemplate } from '@ember/template-compilation';
import { on } from '@ember/modifier';

export default precompileTemplate(
  `<textarea
  {{!-- for compatibility --}}
  id={{this.id}}
  class={{this.class}}

  ...attributes

  value={{this.value}}

  {{on "change" this.change}}
  {{on "input" this.input}}
  {{on "keyup" this.keyUp}}
  {{on "paste" this.valueDidChange}}
  {{on "cut" this.valueDidChange}}
/>`,
  {
    moduleName: 'packages/@ember/-internals/glimmer/lib/templates/textarea.hbs',
    strictMode: true,
    scope() {
      return { on };
    },
  }
);
