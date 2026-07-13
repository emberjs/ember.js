import { setComponentTemplate } from '@glimmer/manager';
import { precompileTemplate } from '@ember/template-compilation';
import { templateOnlyComponent } from '@glimmer/runtime';

import { outletHelper } from '../../../routing/route-managers/classic/outlet';

export const face = templateOnlyComponent();
setComponentTemplate(precompileTemplate('{{component (outletHelper @outletState)}}', { strictMode: true, scope() {
  return { outletHelper }
},}), face);


