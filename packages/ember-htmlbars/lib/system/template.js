import { wrap } from 'htmlbars-runtime/hooks';

export default function template(templateSpec) {
  if (!templateSpec.render) {
    templateSpec = wrap(templateSpec);
  }

  templateSpec.isTop = true;
  templateSpec.isMethod = false;

  return templateSpec;
}
