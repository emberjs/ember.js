import { precompileTemplate } from '@ember/template-compilation';
import { outletHelper } from '../syntax/outlet';

export default /* #__PURE__ */ precompileTemplate(`{{component (outletHelper)}}`, {
  moduleName: 'packages/@ember/-internals/glimmer/lib/templates/outlet.hbs',
  strictMode: true,
  scope() {
    return { outletHelper };
  },
});
