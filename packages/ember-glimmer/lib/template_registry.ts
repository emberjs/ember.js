import { WrappedTemplateFactory } from './template';
// STATE within a module is frowned upon, this exists
// to support Ember.TEMPLATES but shield ember internals from this legacy
// global API.
interface TemplatesRegistry {
  [name: string]: WrappedTemplateFactory
}
let TEMPLATES: TemplatesRegistry = {};

export function setTemplates(templates: TemplatesRegistry) {
  TEMPLATES = templates;
}

export function getTemplates() {
  return TEMPLATES;
}

export function getTemplate(name: string): WrappedTemplateFactory | void {
  if (TEMPLATES.hasOwnProperty(name)) {
    return TEMPLATES[name];
  }
}

export function hasTemplate(name: string): boolean {
  return TEMPLATES.hasOwnProperty(name);
}

export function setTemplate(name: string, template: WrappedTemplateFactory): WrappedTemplateFactory {
  return TEMPLATES[name] = template;
}
