declare module '@ember/-internals/glimmer/lib/template' {
  import type {
    SerializedTemplateWithLazyBlock,
    Template,
    TemplateFactory,
  } from '@glimmer/interfaces';
  export type StaticTemplate = SerializedTemplateWithLazyBlock;
  export type OwnedTemplate = Template;
  export function isTemplateFactory(
    template: Template | TemplateFactory
  ): template is TemplateFactory;
}
