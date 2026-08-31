import type { WireFormat } from '@glimmer/interfaces';
import { LOCAL_TRACE_LOGGING } from '@glimmer/local-debug-flags';
import { LOCAL_LOGGER } from '@glimmer/util';

import type * as mir from './mir';

import WireFormatDebugger from '../../wire-format-debug';
import { CONTENT } from './content';

export function visit(template: mir.Template): WireFormat.SerializedTemplateBlock {
  let statements = CONTENT.list(template.body);
  let scope = template.scope;
  let block: WireFormat.SerializedTemplateBlock = [statements, scope.symbols, scope.upvars];

  // Trailing empty arrays carry no information, so leave them out of the
  // wire format. Readers default the missing entries.
  if (scope.upvars.length === 0) {
    block.pop();

    if (scope.symbols.length === 0) {
      block.pop();
    }
  }

  if (LOCAL_TRACE_LOGGING) {
    let debug = new WireFormatDebugger(block);
    LOCAL_LOGGER.debug(
      `-> `,
      statements.map((s) => debug.formatOpcode(s))
    );
  }

  return block;
}
