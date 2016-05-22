import require from 'require';

let { wrap } = require('htmlbars-runtime/hooks');

let template = function(templateSpec) {
  if (!templateSpec.render) {
    templateSpec = wrap(templateSpec);
  }

  templateSpec.isTop = true;
  templateSpec.isMethod = false;

  return templateSpec;
};

export default template;
