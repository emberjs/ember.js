import { precompileTemplate } from '@ember/template-compilation';
import { outletHelper } from '../../../routing/route-managers/classic/outlet';

export default precompileTemplate(`{{component (outletHelper)}}`, {
  moduleName: 'packages/@ember/-internals/glimmer/lib/templates/outlet.hbs',
  strictMode: true,
  scope() {
    return { outletHelper };
  },
});
