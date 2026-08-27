import type { SexpOp } from './compilers';

import * as ops from '../../ops';
import { LEGACY_OPS } from './compilers';

let filled = false;

/**
 * Fills the numeric lookup table used by templates that still ship a JSON
 * block. Only the legacy template factory calls this, so a build with no JSON
 * blocks does not pull in every op.
 */
export function ensureLegacyOps(): void {
  if (filled) return;
  filled = true;

  for (let op of Object.values(ops) as SexpOp[]) {
    if (!op.variant) {
      LEGACY_OPS[op.id] = op;
    }
  }
}
