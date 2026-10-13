// A template-only component whose template is compiled at RUNTIME
// (like the route templates): its <a> receives the invocation's attributes
// through `...attributes`.
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';

export default setComponentTemplate(
  precompileTemplate('<a data-test-forwarded-link ...attributes>forwarded link</a>'),
  templateOnly()
);
