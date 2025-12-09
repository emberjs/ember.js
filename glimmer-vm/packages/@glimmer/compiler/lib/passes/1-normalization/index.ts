import type { ASTv2, src } from '@glimmer/syntax';
import { DebugLogger, frag, fragment, valueFragment } from '@glimmer/debug';
import { LOCAL_TRACE_LOGGING } from '@glimmer/local-debug-flags';
import { LOCAL_LOGGER } from '@glimmer/util';

import type { Result } from '../../shared/result';

import * as mir from '../2-encoding/mir';
import { NormalizationState } from './context';
import { VISIT_STMTS } from './visitors/statements';
import StrictModeValidationPass from './visitors/strict-mode';

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
export default function normalize(
  source: src.Source,
  root: ASTv2.Template,
  isStrict: boolean
): Result<mir.Template> {
  // create a new context for the normalization pass
  let state = new NormalizationState(root.table, isStrict);

  if (LOCAL_TRACE_LOGGING) {
    const logger = DebugLogger.configured();
    const done = logger.group(`pass0: visiting`).collapsed();
    logger.log(valueFragment(root.table));
    // LOCAL_LOGGER.debug('symbols', root.table);
    logger.log(valueFragment(source));
    done();
  }

  let body = VISIT_STMTS.visitList(root.body, state);

  if (LOCAL_TRACE_LOGGING) {
    const logger = DebugLogger.configured();

    if (body.isOk) {
      const done = logger.group(frag`pass0: out`).collapsed();
      const ops = body.value.toPresentArray();

      if (ops) {
        const full = frag` ${valueFragment(ops)}`.subtle();
        logger.log(frag`${fragment.array(ops.map((op) => valueFragment(op)))}${full}`);
      }
      done();
      LOCAL_LOGGER.debug('-> pass0: out', body.value);
    } else {
      LOCAL_LOGGER.debug('-> pass0: error', body.reason);
    }
  }

  let template = body.mapOk(
    (body) => new mir.Template({ loc: root.loc, scope: root.table, body: body.toArray() })
  );

  if (isStrict) {
    template = template.andThen((template) => StrictModeValidationPass.validate(template));
  }

  return template;
}
