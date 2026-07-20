import { precompileTemplate } from '@ember/template-compilation';
import { outletHelper } from './outlet';

export default precompileTemplate(`{{component (outletHelper)}}`, {
  moduleName: 'packages/@ember/-internals/routing/route-managers/classic/outlet-template.hbs',
  strictMode: true,
  scope() {
    return { outletHelper };
  },
});
