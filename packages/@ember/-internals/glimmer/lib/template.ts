import { SerializedTemplateWithLazyBlock, Template, TemplateFactory } from '@glimmer/interfaces';

export type StaticTemplate = SerializedTemplateWithLazyBlock;
export type OwnedTemplate = Template;

export function isTemplateFactory(
  template: Template | TemplateFactory
): template is TemplateFactory {
  return typeof template === 'function';
}
