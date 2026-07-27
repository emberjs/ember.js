import { precompileTemplate } from '@ember/template-compilation';
import { outletHelper } from './outlet';
// EXPERIMENT ONLY — see EXPERIMENT-CLASSIC-OUTLET-USAGE.md
import { recordUse } from '../probe';

// Module scope: always fires (imported by `classic/manager.ts`). The
// *invocation* probe for this module lives at its only call site,
// `buildClassicInvokable` in `classic/manager.ts` (`classic:outlet-template`),
// so the exported TemplateFactory identity is left untouched.
recordUse('classic:outlet-template-eval');

export default precompileTemplate(`{{component (outletHelper)}}`, {
  moduleName: 'packages/@ember/-internals/routing/route-managers/classic/outlet-template.hbs',
  strictMode: true,
  scope() {
    return { outletHelper };
  },
});
