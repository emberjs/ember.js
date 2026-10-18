import type { Template, TemplateOk } from '@glimmer/interfaces';
import { getGxtGlimmerHost } from '@ember/-internals/gxt-backend/gxt-bridge';

/**
 * @deprecated
 */
export function unwrapTemplate(template: Template): TemplateOk {
  if (__GXT_MODE__) {
    // GXT: gxt-compiled templates have no `asLayout`; gxt-backend's
    // template-adapter.ts adapts them to `TemplateOk`.
    const host = getGxtGlimmerHost();
    if (host === null) {
      throw new Error('[gxt] the glimmer host is not installed (gxt-backend/glimmer-host.ts)');
    }
    return host.unwrapTemplate(template);
  }

  if (template.result === 'error') {
    throw new Error(
      `Compile Error: ${template.problem} @ ${template.span.start}..${template.span.end}`
    );
  }

  return template;
}
