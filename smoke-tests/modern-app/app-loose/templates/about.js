import { precompileTemplate } from '@ember/template-compilation';

export default precompileTemplate(
  `<h2 data-test-about>About: {{@model.count}} items for {{@model.owner}}</h2>`
);
