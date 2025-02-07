import type { Template, TemplateOk } from '@glimmer/interfaces';

/**
 * @deprecated
 */
export function unwrapTemplate(template: Template): TemplateOk {
  if (template.result === 'error') {
    throw new Error(
      `Compile Error: ${template.problem} @ ${template.span.start}..${template.span.end}`
    );
  }

  return template;
}
