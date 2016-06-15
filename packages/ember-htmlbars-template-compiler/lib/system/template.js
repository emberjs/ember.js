import require from 'require';

let { wrap } = require('htmlbars-runtime/hooks');

export default function template(templateSpec) {
  if (!templateSpec.render) {
    templateSpec = wrap(templateSpec);
  }

  templateSpec.isTop = true;
  templateSpec.isMethod = false;

  return templateSpec;
}
