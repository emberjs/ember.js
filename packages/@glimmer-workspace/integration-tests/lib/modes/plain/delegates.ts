import type { Template } from '@glimmer/interfaces';

import { JitRenderDelegate } from '../jit/delegate';
import { RehydrationDelegate } from '../rehydration/delegate';
import { preprocessPlainGlimmer } from './compile';

/** The jit delegate, compiling templates with plain Glimmer options (W5: implementation tests). */
export class PlainGlimmerJitDelegate extends JitRenderDelegate {
  static override style = 'jit (plain Glimmer compile)';

  protected override compileTemplate(template: string, owner: object): Template {
    return preprocessPlainGlimmer(template, this.precompileOptions, owner);
  }
}

/** The rehydration delegate, compiling templates with plain Glimmer options. */
export class PlainGlimmerRehydrationDelegate extends RehydrationDelegate {
  static override readonly style = 'rehydration (plain Glimmer compile)';

  protected override compileTemplate(template: string, owner: object): Template {
    return preprocessPlainGlimmer(template, this.precompileOptions, owner);
  }
}
