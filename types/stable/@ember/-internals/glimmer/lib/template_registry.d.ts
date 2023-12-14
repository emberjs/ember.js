declare module '@ember/-internals/glimmer/lib/template_registry' {
  import type { TemplateFactory } from '@glimmer/interfaces';
  export interface TemplatesRegistry {
    [name: string]: TemplateFactory;
  }
  export function setTemplates(templates: TemplatesRegistry): void;
  export function getTemplates(): TemplatesRegistry;
  export function getTemplate(name: string): TemplateFactory | void;
  export function hasTemplate(name: string): boolean;
  export function setTemplate(name: string, template: TemplateFactory): TemplateFactory;
}
