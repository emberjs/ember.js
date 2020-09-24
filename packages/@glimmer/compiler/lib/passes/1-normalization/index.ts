import { LOCAL_SHOULD_LOG } from '@glimmer/local-debug-flags';
import { ASTv2, Source } from '@glimmer/syntax';
import { LOCAL_LOGGER } from '@glimmer/util';

import { Result } from '../../shared/result';
import * as mir from '../2-encoding/mir';
import { NormalizationState } from './context';
import { VISIT_STMTS } from './visitors/statements';

/**
 * Normalize the AST from @glimmer/syntax into the HIR. The HIR has special
 * instructions for keywords like `{{yield}}`, `(has-block)` and
 * `{{#in-element}}`.
 *
 * Most importantly, it also classifies HTML element syntax into:
 *
 * 1. simple HTML element (with optional splattributes)
 * 2. component invocation
 *
 * Because the @glimmer/syntax AST gives us a string for an element's tag,
 * this pass also normalizes that string into an expression.
 *
 * ```
 * // normalized into a path expression whose head is `this` and tail is
 * // `["x"]`
 * <this.x />
 *
 * {{#let expr as |t|}}
 *   // `"t"` is normalized into a variable lookup.
 *   <t />
 *
 *   // normalized into a path expression whose head is the variable lookup
 *   // `t` and tail is `["input"]`.
 *   <t.input />
 * {{/let}}
 *
 * // normalized into a free variable lookup for `SomeComponent` (with the
 * // context `ComponentHead`).
 * <SomeComponent />
 *
 * // normalized into a path expression whose head is the free variable
 * // `notInScope` (with the context `Expression`), and whose tail is
 * // `["SomeComponent"]`. In resolver mode, this path will be rejected later,
 * // since it cannot serve as an input to the resolver.
 * <notInScope.SomeComponent />
 * ```
 */
export default function normalize(source: Source, root: ASTv2.Template): Result<mir.Template> {
  // create a new context for the normalization pass
  let state = new NormalizationState(root.table);

  if (LOCAL_SHOULD_LOG) {
    LOCAL_LOGGER.groupCollapsed(`pass0: visiting`);
    LOCAL_LOGGER.log('symbols', root.table);
    LOCAL_LOGGER.log('source', source);
    LOCAL_LOGGER.groupEnd();
  }

  let body = VISIT_STMTS.visitList(root.body, state);

  if (LOCAL_SHOULD_LOG) {
    if (body.isOk) {
      LOCAL_LOGGER.log('-> pass0: out', body.value);
    } else {
      LOCAL_LOGGER.log('-> pass0: error', body.reason);
    }
  }

  return body.mapOk(
    (body) => new mir.Template({ loc: root.loc, scope: root.table, body: body.toArray() })
  );
}
