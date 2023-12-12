import { precompileTemplate } from '@ember/template-compilation';
export default precompileTemplate(
  `<input
  {{!-- for compatibility --}}
  id={{this.id}}
  class={{this.class}}

  ...attributes

  type={{this.type}}
  checked={{this.checked}}
  value={{this.value}}

  {{on "change" this.change}}
  {{on "input" this.input}}
  {{on "keyup" this.keyUp}}
  {{on "paste" this.valueDidChange}}
  {{on "cut" this.valueDidChange}}
/>`,
  { moduleName: 'packages/@ember/-internals/glimmer/lib/templates/input.hbs' }
);
